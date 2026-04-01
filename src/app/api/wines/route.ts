import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") || "";
  const color = req.nextUrl.searchParams.get("color") || "";
  const status = req.nextUrl.searchParams.get("status") || "";
  const listId = req.nextUrl.searchParams.get("listId") || "";
  const sort = req.nextUrl.searchParams.get("sort") || "createdAt";
  const order = req.nextUrl.searchParams.get("order") || "desc";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { winery: { contains: search, mode: "insensitive" } },
      { varietal: { contains: search, mode: "insensitive" } },
      { region: { contains: search, mode: "insensitive" } },
    ];
  }

  if (color) where.color = color;
  if (status) where.status = status;
  if (listId) where.listId = parseInt(listId);

  const wines = await prisma.wine.findMany({
    where,
    orderBy: { [sort]: order },
    include: { store: true, list: true },
  });

  return NextResponse.json(wines);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Handle store creation/lookup
  let storeId: number | null = null;
  if (body.storeName) {
    const store = await prisma.store.upsert({
      where: { name: body.storeName },
      update: {},
      create: { name: body.storeName },
    });
    storeId = store.id;
  }

  const wine = await prisma.wine.create({
    data: {
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
      imageData: body.imageData || null,
      quantity: body.quantity ? parseInt(body.quantity) : 1,
      status: body.status || "collection",
      occasion: body.occasion || null,
      foodPairings: body.foodPairings || null,
      onlineRating: body.onlineRating ? parseFloat(body.onlineRating) : null,
      storeId,
      listId: body.listId ? parseInt(body.listId) : null,
    },
    include: { store: true },
  });

  return NextResponse.json(wine, { status: 201 });
}
