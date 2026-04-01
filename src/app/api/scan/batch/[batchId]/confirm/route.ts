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

  const results = [];

  for (const item of items) {
    const scanItem = await prisma.scanItem.findUnique({
      where: { id: item.scanItemId },
    });
    if (!scanItem || scanItem.batchId !== parseInt(batchId)) continue;

    if (item.action === "reject") {
      await prisma.scanItem.update({
        where: { id: item.scanItemId },
        data: { status: "rejected" },
      });
      results.push({ scanItemId: item.scanItemId, action: "rejected" });
    } else {
      const wineName = item.edits?.name || scanItem.name || "Unknown Wine";
      const wineVintage = item.edits?.vintage ?? scanItem.vintage;
      const wineWinery = item.edits?.winery ?? scanItem.winery;
      const addQty = item.edits?.quantity ?? scanItem.quantity ?? 1;

      // Check for existing wine with same name + vintage (+ winery if available)
      const existingWhere: Record<string, unknown> = {
        name: { equals: wineName, mode: "insensitive" },
        status: "collection",
      };
      if (wineVintage) existingWhere.vintage = wineVintage;
      if (wineWinery) existingWhere.winery = { equals: wineWinery, mode: "insensitive" };

      const existing = await prisma.wine.findFirst({ where: existingWhere });

      if (existing) {
        // Duplicate found — increment quantity
        const wine = await prisma.wine.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + addQty },
        });

        await prisma.scanItem.update({
          where: { id: item.scanItemId },
          data: { status: "confirmed", wineId: wine.id },
        });

        results.push({ scanItemId: item.scanItemId, action: "merged", wineId: wine.id, addedQty: addQty });
      } else {
        // New wine — create
        const wine = await prisma.wine.create({
          data: {
            name: wineName,
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

        results.push({ scanItemId: item.scanItemId, action: "confirmed", wineId: wine.id });
      }
    }
  }

  // Check if all items in batch are processed
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
