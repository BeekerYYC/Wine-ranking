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
  const data: Record<string, unknown> = {
    quantity: newQuantity,
    consumedAt: new Date(), // Always track when a bottle was opened
  };

  if (body.rating) data.rating = body.rating;
  if (body.notes) data.notes = body.notes;

  if (newQuantity === 0) {
    data.status = "consumed";
  }

  const [updated] = await prisma.$transaction([
    // Auto-mark any other wines with quantity 0 still in "collection" as consumed
    // (the user opened a new bottle, so any previous empties are clearly consumed)
    prisma.wine.updateMany({
      where: {
        category: wine.category,
        quantity: 0,
        status: "collection",
        id: { not: parseInt(id) },
      },
      data: {
        status: "consumed",
        consumedAt: new Date(),
      },
    }),
    prisma.wine.update({
      where: { id: parseInt(id) },
      data,
    }),
    prisma.consumptionLog.create({
      data: {
        wineId: parseInt(id),
        rating: body.rating || null,
        notes: body.notes || null,
      },
    }),
  ]);

  // updated is now the result of updateMany (first in array), we need the wine update
  // $transaction returns results in order, so index 1 is the wine update
  const updatedWine = await prisma.wine.findUnique({
    where: { id: parseInt(id) },
    include: { store: true, list: true },
  });

  return NextResponse.json(updatedWine);
}
