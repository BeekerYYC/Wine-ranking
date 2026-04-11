import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wine = await prisma.wine.findUnique({
    where: { id: parseInt(id) },
    include: { store: true, list: true, consumptions: { orderBy: { createdAt: "desc" } } },
  });
  if (!wine) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(wine);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  let storeId: number | null | undefined = undefined;
  if (body.storeName !== undefined) {
    if (body.storeName) {
      const store = await prisma.store.upsert({
        where: { name: body.storeName },
        update: {},
        create: { name: body.storeName },
      });
      storeId = store.id;
    } else {
      storeId = null;
    }
  }

  const data: Record<string, unknown> = {
    name: body.name,
    winery: body.winery || null,
    vintage: body.vintage ? parseInt(body.vintage) : null,
    varietal: body.varietal || null,
    region: body.region || null,
    country: body.country || null,
    color: body.color || null,
    price: body.price ? parseFloat(body.price) : null,
    rating: body.rating ? parseInt(body.rating) : null,
    notes: body.notes || null,
    description: body.description || null,
    tastingNotes: body.tastingNotes !== undefined ? (body.tastingNotes || null) : undefined,
    drinkingWindow: body.drinkingWindow !== undefined ? (body.drinkingWindow || null) : undefined,
    criticReviews: body.criticReviews !== undefined ? (body.criticReviews || null) : undefined,
    imageData: body.imageData || null,
    quantity: body.quantity != null ? parseInt(body.quantity) : undefined,
    status: body.status || undefined,
    occasion: body.occasion !== undefined ? body.occasion : undefined,
    foodPairings: body.foodPairings !== undefined ? body.foodPairings : undefined,
    onlineRating: body.onlineRating !== undefined ? (body.onlineRating ? parseFloat(body.onlineRating) : null) : undefined,
    listId: body.listId !== undefined ? (body.listId ? parseInt(body.listId) : null) : undefined,
  };

  if (storeId !== undefined) data.storeId = storeId;

  // Remove undefined values
  Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

  const wine = await prisma.wine.update({
    where: { id: parseInt(id) },
    data,
    include: { store: true, list: true },
  });

  return NextResponse.json(wine);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.wine.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
