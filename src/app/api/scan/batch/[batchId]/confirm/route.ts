import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { enrichWine } from "@/lib/enrich";

// Enrichment runs in after(), i.e. still inside this invocation's budget.
export const maxDuration = 60;

interface ConfirmItem {
  scanItemId: number;
  action: "confirm" | "reject";
  edits?: {
    name?: string; winery?: string; vintage?: number; varietal?: string;
    region?: string; country?: string; color?: string; price?: number;
    quantity?: number;
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params;
  const { items } = (await req.json()) as { items: ConfirmItem[] };

  // Get batch category
  const batch = await prisma.scanBatch.findUnique({ where: { id: parseInt(batchId) } });
  const category = batch?.category || "wine";

  const results: Record<string, unknown>[] = [];
  // Wines to fill in tasting notes / critic reviews / label image for once the
  // response is out. Doing it here rather than from the review screen means it
  // no longer depends on the user keeping that page open.
  const toEnrich: number[] = [];

  for (const item of items) {
    const scanItem = await prisma.scanItem.findUnique({
      where: { id: item.scanItemId },
    });

    // Report skips instead of dropping them silently — the review screen used to
    // show "Added 1 item" for requests where nothing was saved at all.
    if (!scanItem || scanItem.batchId !== parseInt(batchId)) {
      results.push({
        scanItemId: item.scanItemId,
        action: "skipped",
        reason: scanItem ? "Item belongs to a different batch" : "Item not found",
      });
      continue;
    }

    if (scanItem.status === "confirmed") {
      results.push({
        scanItemId: item.scanItemId,
        action: "skipped",
        reason: "Item was already added",
        wineId: scanItem.wineId,
      });
      continue;
    }

    if (item.action === "reject") {
      await prisma.scanItem.update({
        where: { id: item.scanItemId },
        data: { status: "rejected" },
      });
      results.push({ scanItemId: item.scanItemId, action: "rejected" });
    } else {
      const wineName = item.edits?.name || scanItem.name || "Unknown";
      const wineVintage = item.edits?.vintage ?? scanItem.vintage;
      const wineWinery = item.edits?.winery ?? scanItem.winery;
      // The cellar only lists bottles with quantity > 0, so anything that lands
      // at 0 here (blank/zeroed qty field, unparseable edit) would be saved and
      // then never shown. Always add at least one bottle.
      const requestedQty = Number(item.edits?.quantity ?? scanItem.quantity ?? 1);
      const addQty = Number.isFinite(requestedQty) ? Math.max(1, Math.trunc(requestedQty)) : 1;

      // Look for the same bottle already in the cellar — but require more than a
      // name match. A name-only match silently absorbed distinct bottles into
      // whichever wine happened to share a label word: three separate uploads
      // all merged into one "Ventoux Les 3 Villages" and no new bottle ever
      // appeared. With neither a vintage nor a producer to corroborate the name,
      // treat it as a new bottle and let the user merge deliberately.
      let existing = null;
      if (wineVintage || wineWinery) {
        const existingWhere: Record<string, unknown> = {
          name: { equals: wineName, mode: "insensitive" },
          category,
          status: "collection",
        };
        if (wineVintage) existingWhere.vintage = wineVintage;
        if (wineWinery) existingWhere.winery = { equals: wineWinery, mode: "insensitive" };
        existing = await prisma.wine.findFirst({ where: existingWhere });
      }

      if (existing) {
        const wine = await prisma.wine.update({
          where: { id: existing.id },
          data: {
            quantity: existing.quantity + addQty,
            // Attach the photo just taken if the target had none. The merge used
            // to update only the quantity, so the picture the user relies on to
            // find the bottle was thrown away. Never overwrite an existing photo.
            ...(scanItem.imageData && !existing.imageData ? { imageData: scanItem.imageData } : {}),
          },
        });

        await prisma.scanItem.update({
          where: { id: item.scanItemId },
          data: { status: "confirmed", wineId: wine.id },
        });

        // A bottle already in the cellar may still never have been enriched.
        if (!existing.tastingNotes || !existing.criticReviews) toEnrich.push(wine.id);

        results.push({
          scanItemId: item.scanItemId,
          action: "merged",
          wineId: wine.id,
          name: wine.name,
          addedQty: addQty,
          quantity: wine.quantity,
        });
      } else {
        const wine = await prisma.wine.create({
          data: {
            name: wineName,
            category,
            winery: wineWinery,
            vintage: wineVintage,
            varietal: item.edits?.varietal ?? scanItem.varietal,
            region: item.edits?.region ?? scanItem.region,
            country: item.edits?.country ?? scanItem.country,
            color: item.edits?.color ?? scanItem.color,
            description: scanItem.description,
            foodPairings: scanItem.foodPairings,
            onlineRating: scanItem.onlineRating,
            confidence: scanItem.confidence,
            imageData: scanItem.imageData,
            price: item.edits?.price ?? null,
            quantity: addQty,
            status: "collection",
          },
        });

        await prisma.scanItem.update({
          where: { id: item.scanItemId },
          data: { status: "confirmed", wineId: wine.id },
        });

        toEnrich.push(wine.id);

        results.push({
          scanItemId: item.scanItemId,
          action: "confirmed",
          wineId: wine.id,
          name: wine.name,
          quantity: wine.quantity,
        });
      }
    }
  }

  const remaining = await prisma.scanItem.count({
    where: { batchId: parseInt(batchId), status: "analyzed" },
  });

  if (remaining === 0) {
    await prisma.scanBatch.update({
      where: { id: parseInt(batchId) },
      data: { status: "completed" },
    });
  }

  if (toEnrich.length > 0) {
    // after() runs once the response has been sent, so the user is never left
    // waiting on an LLM call to see their bottle land in the cellar.
    after(async () => {
      for (const wineId of toEnrich) {
        try {
          const result = await enrichWine(wineId);
          // enrichWine swallows its own failures, so surface them here — silent
          // enrichment failures are otherwise invisible in the platform logs.
          if (!result.success) {
            console.warn(`[confirm] enrichment failed for wine ${wineId}: ${result.error}`);
          }
        } catch (e) {
          // Enrichment is additive — the bottle is already saved. The cellar's
          // "Enrich all" action picks up anything missed here.
          console.warn(`[confirm] enrichment threw for wine ${wineId}:`, e);
        }
      }
    });
  }

  return NextResponse.json({ results, batchComplete: remaining === 0, enriching: toEnrich.length });
}
