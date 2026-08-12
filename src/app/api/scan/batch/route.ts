import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Create a scan batch.
 *
 * `photos` is optional. Sending them all at once caps the scan at roughly 14
 * photos, because the whole array travels in one request body and Vercel rejects
 * bodies over ~4.2 MB (measured: 4.2 MB passes, 4.3 MB returns 413
 * FUNCTION_PAYLOAD_TOO_LARGE). The scan screen therefore creates an empty batch
 * and appends photos one request at a time via
 * POST /api/scan/batch/[batchId]/photos, which removes the ceiling entirely —
 * the same approach the cellar audit already uses.
 *
 * The `photos` form is kept for callers that only have a photo or two.
 */
export async function POST(req: NextRequest) {
  const { photos, category = "wine" } = await req.json();

  if (photos !== undefined && (!Array.isArray(photos) || photos.length === 0)) {
    return NextResponse.json({ error: "No photos provided" }, { status: 400 });
  }

  const list: string[] = Array.isArray(photos) ? photos : [];

  const batch = await prisma.scanBatch.create({
    data: {
      category,
      totalPhotos: list.length,
      status: "processing",
      items: list.length
        ? {
            create: list.map((photo: string, index: number) => ({
              imageData: photo,
              sourceIndex: index,
              status: "pending",
            })),
          }
        : undefined,
    },
  });

  return NextResponse.json({ id: batch.id, totalPhotos: batch.totalPhotos });
}
