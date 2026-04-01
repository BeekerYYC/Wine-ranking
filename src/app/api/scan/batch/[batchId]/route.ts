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
