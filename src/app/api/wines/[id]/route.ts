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

  // Only ever touch fields the caller actually sent.
  //
  // These used to be written as `body.x || null`, which meant any field absent
  // from the request was overwritten with null — and the "remove undefined
  // values" pass below could not catch it, because null is not undefined. The
  // quantity stepper and status dropdown on a wine's page send only
  // `{quantity}` / `{status}`, so a single tap on either wiped the winery,
  // vintage, varietal, region, country, colour, price, rating, notes,
  // description AND the user's photo off that wine.
  const has = (key: string) => body[key] !== undefined;
  const text = (key: string) => (has(key) ? body[key] || null : undefined);
  const int = (key: string) => (has(key) ? (body[key] ? parseInt(body[key]) : null) : undefined);
  const float = (key: string) => (has(key) ? (body[key] ? parseFloat(body[key]) : null) : undefined);

  const data: Record<string, unknown> = {
    name: has("name") ? body.name : undefined,
    winery: text("winery"),
    vintage: int("vintage"),
    varietal: text("varietal"),
    region: text("region"),
    country: text("country"),
    color: text("color"),
    price: float("price"),
    rating: int("rating"),
    notes: text("notes"),
    description: text("description"),
    tastingNotes: text("tastingNotes"),
    drinkingWindow: text("drinkingWindow"),
    criticReviews: text("criticReviews"),
    imageData: text("imageData"),
    quantity: body.quantity != null ? parseInt(body.quantity) : undefined,
    status: body.status || undefined,
    occasion: has("occasion") ? body.occasion : undefined,
    foodPairings: has("foodPairings") ? body.foodPairings : undefined,
    onlineRating: float("onlineRating"),
    listId: int("listId"),
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
