import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Open a bottle: take one out of the cellar and log it.
 *
 * Opening and rating are separate moments — nobody can rate a bottle they've
 * just opened. Without a rating the bottle joins the review queue, and the app
 * asks how it was on a later visit. A rating can still be sent here directly.
 *
 * The response includes `logId`, which DELETE /api/consumptions/[logId] takes
 * to undo an accidental open.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const wineId = parseInt((await params).id);
  if (!Number.isFinite(wineId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const body = (await req.json().catch(() => ({}))) as { rating?: unknown; notes?: unknown };
  const rating = Number.isInteger(body.rating) && (body.rating as number) >= 1 && (body.rating as number) <= 5
    ? (body.rating as number) : null;
  const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;

  const wine = await prisma.wine.findUnique({ where: { id: wineId } });
  if (!wine) {
    return NextResponse.json({ error: "Wine not found" }, { status: 404 });
  }
  if (wine.quantity <= 0) {
    return NextResponse.json({ error: `There are no bottles of ${wine.name} left to open` }, { status: 409 });
  }

  const newQuantity = wine.quantity - 1;
  const data: Record<string, unknown> = {
    quantity: newQuantity,
    consumedAt: new Date(), // Always track when a bottle was opened
  };
  if (rating) data.rating = rating;
  if (notes && !wine.notes) data.notes = notes;
  if (newQuantity === 0) data.status = "consumed";

  const [, , log] = await prisma.$transaction([
    // Auto-mark any other wines with quantity 0 still in "collection" as consumed
    // (the user opened a new bottle, so any previous empties are clearly consumed)
    prisma.wine.updateMany({
      where: { category: wine.category, quantity: 0, status: "collection", id: { not: wineId } },
      data: { status: "consumed", consumedAt: new Date() },
    }),
    prisma.wine.update({ where: { id: wineId }, data }),
    prisma.consumptionLog.create({ data: { wineId, rating, notes } }),
  ]);

  // Queue it for a rating later. Best-effort: if the review table isn't there
  // yet (a preview build against a database that hasn't been migrated), the
  // bottle is still opened — it just won't be asked about.
  let queuedForReview = false;
  if (!rating) {
    try {
      await prisma.pendingReview.create({ data: { logId: log.id } });
      queuedForReview = true;
    } catch (err) {
      console.warn("Could not queue bottle for review:", err instanceof Error ? err.message : err);
    }
  }

  const updatedWine = await prisma.wine.findUnique({
    where: { id: wineId },
    include: { store: true, list: true, consumptions: { orderBy: { createdAt: "desc" } } },
  });

  return NextResponse.json({ ...updatedWine, logId: log.id, queuedForReview });
}
