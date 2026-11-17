import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Merge a set of wines into one canonical row.
 *
 * - Sums quantities into the canonical
 * - Reassigns ConsumptionLog entries from the merged wines to the canonical
 * - Backfills missing fields on the canonical from the merged wines (e.g. if
 *   canonical has no winery but a duplicate does, copy it across)
 * - Deletes the merged wine rows
 *
 * Idempotent in the sense that re-running with already-deleted IDs just skips them.
 */
export async function POST(req: NextRequest) {
  const { canonicalId, mergeIds } = (await req.json()) as {
    canonicalId: number;
    mergeIds: number[];
  };

  if (!canonicalId || !Array.isArray(mergeIds) || mergeIds.length === 0) {
    return NextResponse.json({ error: "canonicalId and mergeIds required" }, { status: 400 });
  }
  if (mergeIds.includes(canonicalId)) {
    return NextResponse.json({ error: "canonicalId cannot appear in mergeIds" }, { status: 400 });
  }

  const canonical = await prisma.wine.findUnique({ where: { id: canonicalId } });
  if (!canonical) return NextResponse.json({ error: "canonical wine not found" }, { status: 404 });

  const toMerge = await prisma.wine.findMany({ where: { id: { in: mergeIds } } });
  if (toMerge.length === 0) {
    return NextResponse.json({ error: "no mergeable wines found" }, { status: 404 });
  }

  // Refuse to merge across categories — that's almost certainly a UI bug.
  const wrongCategory = toMerge.find((w) => w.category !== canonical.category);
  if (wrongCategory) {
    return NextResponse.json({ error: "category mismatch in merge set" }, { status: 400 });
  }

  // Backfill canonical's null/empty fields from the merge set. Doesn't
  // overwrite existing values — if you cared enough to set it on the
  // canonical, we keep it.
  //
  // The merged rows are deleted below, so anything not carried over here is
  // gone for good. This list used to leave out the user's own notes and rating
  // (plus store, list, occasion and market price): merging a copy that had
  // notes into one that didn't permanently deleted them.
  const backfill: Record<string, unknown> = {};
  const fields: (keyof typeof canonical)[] = [
    "winery", "vintage", "varietal", "region", "country", "color",
    "price", "description", "tastingNotes", "drinkingWindow",
    "criticReviews", "foodPairings", "onlineRating", "labelImageUrl",
    "imageData", "storeId", "listId", "occasion",
  ];
  for (const f of fields) {
    if (canonical[f] == null || canonical[f] === "") {
      const source = toMerge.find((w) => w[f] != null && w[f] !== "");
      if (source) backfill[f] = source[f];
    }
  }

  // Notes: keep every distinct note — they're the user's own words.
  const notes = [canonical, ...toMerge]
    .map((w) => w.notes?.trim())
    .filter((n): n is string => !!n)
    .filter((n, i, all) => all.indexOf(n) === i);
  if (notes.length > 0) backfill.notes = notes.join("\n\n");

  // Rating: keep the canonical's; otherwise the best one from the merge set.
  if (canonical.rating == null) {
    const ratings = toMerge.map((w) => w.rating).filter((r): r is number => r != null);
    if (ratings.length > 0) backfill.rating = Math.max(...ratings);
  }

  // Market price travels as a set (price, currency, note, when), never mixed.
  if (canonical.marketPrice == null) {
    const priced = toMerge.find((w) => w.marketPrice != null);
    if (priced) {
      backfill.marketPrice = priced.marketPrice;
      backfill.marketCurrency = priced.marketCurrency;
      backfill.marketPriceNote = priced.marketPriceNote;
      backfill.marketPriceAt = priced.marketPriceAt;
    }
  }

  // Most recent time any of them was opened.
  const opened = [canonical, ...toMerge]
    .map((w) => w.consumedAt)
    .filter((d): d is Date => d != null)
    .sort((a, b) => b.getTime() - a.getTime());
  if (opened.length > 0) backfill.consumedAt = opened[0];

  const totalAddedQty = toMerge.reduce((n, w) => n + w.quantity, 0);
  // Bottles merged into an emptied entry put it back in the cellar.
  if (canonical.status === "consumed" && canonical.quantity + totalAddedQty > 0) {
    backfill.status = "collection";
  }

  await prisma.$transaction([
    // Move consumption logs to canonical
    prisma.consumptionLog.updateMany({
      where: { wineId: { in: toMerge.map((w) => w.id) } },
      data: { wineId: canonical.id },
    }),
    // Update canonical: add quantities + backfill
    prisma.wine.update({
      where: { id: canonical.id },
      data: {
        quantity: canonical.quantity + totalAddedQty,
        ...backfill,
      },
    }),
    // Delete merged rows
    prisma.wine.deleteMany({ where: { id: { in: toMerge.map((w) => w.id) } } }),
  ]);

  return NextResponse.json({
    canonicalId: canonical.id,
    merged: toMerge.map((w) => w.id),
    addedQty: totalAddedQty,
    backfilled: Object.keys(backfill),
  });
}
