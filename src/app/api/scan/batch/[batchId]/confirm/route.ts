import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

      // Check for existing item with same name + vintage (+ producer if available)
      const existingWhere: Record<string, unknown> = {
        name: { equals: wineName, mode: "insensitive" },
        category,
        status: "collection",
      };
      if (wineVintage) existingWhere.vintage = wineVintage;
      if (wineWinery) existingWhere.winery = { equals: wineWinery, mode: "insensitive" };

      const existing = await prisma.wine.findFirst({ where: existingWhere });

      if (existing) {
        const wine = await prisma.wine.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + addQty },
        });

        await prisma.scanItem.update({
          where: { id: item.scanItemId },
          data: { status: "confirmed", wineId: wine.id },
        });

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

  return NextResponse.json({ results, batchComplete: remaining === 0 });
}
