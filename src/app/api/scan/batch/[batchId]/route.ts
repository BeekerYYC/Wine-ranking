import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params;
  const batch = await prisma.scanBatch.findUnique({
    where: { id: parseInt(batchId) },
    include: { items: { orderBy: { id: "asc" } } },
  });

  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  return NextResponse.json(batch);
}

/**
 * Delete a scan batch and its items.
 *
 * Every scanned photo is stored as base64 on its ScanItem and kept forever —
 * there was no way to remove a batch, so abandoned and completed scans
 * accumulated megabytes of image data indefinitely. Once a batch is confirmed
 * the photo also lives on the wine itself, so the batch copy is redundant.
 *
 * Items cascade with the batch (ScanItem.batch has onDelete: Cascade). Wines
 * already created from this batch are untouched — ScanItem.wineId is a plain
 * column, not a relation, so deleting scan history never removes a bottle.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params;
  const id = parseInt(batchId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid batch id" }, { status: 400 });
  }

  const batch = await prisma.scanBatch.findUnique({
    where: { id },
    include: { items: { select: { id: true, imageData: true, wineId: true } } },
  });
  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  const freedBytes = batch.items.reduce((n, i) => n + (i.imageData?.length || 0), 0);
  const winesKept = batch.items.filter((i) => i.wineId != null).length;

  await prisma.scanBatch.delete({ where: { id } });

  return NextResponse.json({
    deleted: true,
    batchId: id,
    itemsDeleted: batch.items.length,
    freedKB: Math.round(freedBytes / 1024),
    winesKept,
  });
}
