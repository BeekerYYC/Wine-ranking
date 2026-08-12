import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Reclaim storage from finished scans.
 *
 * A scanned photo is stored as base64 on its ScanItem and never removed. Once a
 * batch is finished that copy is dead weight: confirmed items already copied the
 * photo onto the wine, and rejected ones were discarded by the user. Left alone,
 * every scan permanently grows the database.
 *
 * Only items in batches whose scan is over are touched, and only the image blob
 * is dropped — the identification (name, vintage, confidence, wineId) is kept so
 * /api/wines/diagnose can still show what each scan did.
 *
 * GET  reports what would be freed. POST performs it.
 */
const FINISHED = ["completed", "reviewing"];

async function survey() {
  const items = await prisma.scanItem.findMany({
    where: {
      imageData: { not: null },
      batch: { status: { in: FINISHED } },
      status: { in: ["confirmed", "rejected"] },
    },
    select: { id: true, imageData: true, batchId: true },
  });
  const bytes = items.reduce((n, i) => n + (i.imageData?.length || 0), 0);
  return { items, bytes, batches: new Set(items.map((i) => i.batchId)).size };
}

export async function GET() {
  const { items, bytes, batches } = await survey();
  return NextResponse.json({
    prunable: items.length,
    acrossBatches: batches,
    wouldFreeKB: Math.round(bytes / 1024),
    note: "POST to this endpoint to drop these image blobs. Identification data is kept.",
  });
}

export async function POST(_req: NextRequest) {
  const { items, bytes, batches } = await survey();
  if (items.length === 0) {
    return NextResponse.json({ pruned: 0, freedKB: 0, note: "Nothing to prune." });
  }

  await prisma.scanItem.updateMany({
    where: { id: { in: items.map((i) => i.id) } },
    data: { imageData: null },
  });

  return NextResponse.json({
    pruned: items.length,
    acrossBatches: batches,
    freedKB: Math.round(bytes / 1024),
  });
}
