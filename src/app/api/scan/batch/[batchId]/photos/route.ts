import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { MAX_UPLOAD_BYTES } from "@/lib/photo";

/**
 * Append a single photo to an existing scan batch.
 *
 * One photo per request keeps every upload far below the ~4.2 MB request body
 * limit, so a scan is no longer capped at ~14 photos by the size of the batch it
 * arrives in. Callers post photos in sequence, then run the processing loop.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params;
  const id = parseInt(batchId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid batch id" }, { status: 400 });
  }

  const { photo } = await req.json();
  if (typeof photo !== "string" || !photo.startsWith("data:image/")) {
    return NextResponse.json({ error: "photo must be a base64 image data URL" }, { status: 400 });
  }
  if (photo.length > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "That photo is too large to upload — resize it before sending." },
      { status: 413 },
    );
  }

  const batch = await prisma.scanBatch.findUnique({ where: { id } });
  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  // sourceIndex identifies which uploaded photo an item came from, and several
  // items can share one index when a photo holds multiple bottles — so derive
  // the next index from the highest in use, not from the item count.
  const last = await prisma.scanItem.findFirst({
    where: { batchId: id },
    orderBy: { sourceIndex: "desc" },
    select: { sourceIndex: true },
  });
  const sourceIndex = last ? last.sourceIndex + 1 : 0;

  const item = await prisma.scanItem.create({
    data: { batchId: id, imageData: photo, sourceIndex, status: "pending" },
    select: { id: true, sourceIndex: true },
  });

  const updated = await prisma.scanBatch.update({
    where: { id },
    data: { totalPhotos: { increment: 1 } },
    select: { totalPhotos: true },
  });

  return NextResponse.json({
    scanItemId: item.id,
    sourceIndex: item.sourceIndex,
    totalPhotos: updated.totalPhotos,
  });
}
