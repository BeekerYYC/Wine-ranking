import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { photos, category = "wine" } = await req.json();

  if (!photos || !Array.isArray(photos) || photos.length === 0) {
    return NextResponse.json({ error: "No photos provided" }, { status: 400 });
  }

  const batch = await prisma.scanBatch.create({
    data: {
      category,
      totalPhotos: photos.length,
      status: "processing",
      items: {
        create: photos.map((photo: string, index: number) => ({
          imageData: photo,
          sourceIndex: index,
          status: "pending",
        })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json({ id: batch.id, totalPhotos: batch.totalPhotos });
}
