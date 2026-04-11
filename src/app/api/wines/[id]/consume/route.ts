import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const wine = await prisma.wine.findUnique({ where: { id: parseInt(id) } });
  if (!wine) {
    return NextResponse.json({ error: "Wine not found" }, { status: 404 });
  }

  const newQuantity = Math.max(0, wine.quantity - 1);
  const data: Record<string, unknown> = { quantity: newQuantity };

  if (body.rating) data.rating = body.rating;
  if (body.notes) data.notes = body.notes;

  if (newQuantity === 0) {
    data.status = "consumed";
    data.consumedAt = new Date();
  }

  const [updated] = await prisma.$transaction([
    prisma.wine.update({
      where: { id: parseInt(id) },
      data,
    }),
    // Log every individual bottle consumption
    prisma.consumptionLog.create({
      data: {
        wineId: parseInt(id),
        rating: body.rating || null,
        notes: body.notes || null,
      },
    }),
  ]);

  return NextResponse.json(updated);
}
