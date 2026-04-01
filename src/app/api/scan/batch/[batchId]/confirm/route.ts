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
      // Create Wine from scan item
      const wine = await prisma.wine.create({
        data: {
          name: item.edits?.name || scanItem.name || "Unknown Wine",
          winery: item.edits?.winery ?? scanItem.winery,
          vintage: item.edits?.vintage ?? scanItem.vintage,
          varietal: item.edits?.varietal ?? scanItem.varietal,
          region: item.edits?.region ?? scanItem.region,
          country: item.edits?.country ?? scanItem.country,
          color: item.edits?.color ?? scanItem.color,
          description: scanItem.description,
          foodPairings: scanItem.foodPairings,
          onlineRating: scanItem.onlineRating,
          imageData: scanItem.imageData,
          price: item.edits?.price ?? null,
          quantity: item.edits?.quantity ?? 1,
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
