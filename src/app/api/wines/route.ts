import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enrichWine } from "@/lib/enrich";

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") || "";
  const color = req.nextUrl.searchParams.get("color") || "";
  const status = req.nextUrl.searchParams.get("status") || "";
  const category = req.nextUrl.searchParams.get("category") || "wine";
  const listId = req.nextUrl.searchParams.get("listId") || "";
  const sort = req.nextUrl.searchParams.get("sort") || "createdAt";
  const order = req.nextUrl.searchParams.get("order") || "desc";

  const conditions: Record<string, unknown>[] = [{ category }];

  if (search) {
    conditions.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { winery: { contains: search, mode: "insensitive" } },
        { varietal: { contains: search, mode: "insensitive" } },
        { region: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (color) conditions.push({ color });
  if (status === "consumed") {
    // Show all wines that have ever been opened (consumedAt set) OR fully consumed
    conditions.push({
      OR: [
        { status: "consumed" },
        { consumedAt: { not: null } },
      ],
    });
  } else if (status) {
    conditions.push({ status });
  }
  if (listId) conditions.push({ listId: parseInt(listId) });

  const where = { AND: conditions };

  const wines = await prisma.wine.findMany({
    where,
    orderBy: { [sort]: order },
    include: { store: true, list: true },
  });

  // Never inline the base64 photos in a list response — ~175 KB per bottle blows
  // past the 4.5 MB serverless response limit at ~25 photographed bottles and
  // takes the entire cellar down with it. Clients load images from
  // /api/wines/[id]/image via the `hasImage` flag (see src/lib/wineImage.ts).
  const list = wines.map(({ imageData, ...wine }) => ({
    ...wine,
    hasImage: !!imageData,
  }));

  return NextResponse.json(list);
}

// Creating a wine also runs AI enrichment, which needs more than the default
// serverless budget. Without this the request can time out at the gateway and
// the user sees "Failed to save" for a bottle that was in fact created.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();

  const status = body.status || "collection";

  // The cellar only lists bottles with quantity > 0, so a "collection" wine
  // saved with quantity 0 (or an unparseable value) is created but permanently
  // invisible — it looks exactly like the save silently failed.
  const parsedQuantity = Number.parseInt(body.quantity, 10);
  let quantity = Number.isFinite(parsedQuantity) && parsedQuantity >= 0 ? parsedQuantity : 1;
  if (status === "collection" && quantity < 1) quantity = 1;

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
      category: body.category || "wine",
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
      tastingNotes: body.tastingNotes || null,
      drinkingWindow: body.drinkingWindow || null,
      criticReviews: body.criticReviews || null,
      imageData: body.imageData || null,
      quantity,
      status,
      occasion: body.occasion || null,
      foodPairings: body.foodPairings || null,
      onlineRating: body.onlineRating ? parseFloat(body.onlineRating) : null,
      confidence: body.confidence ? parseFloat(body.confidence) : null,
      storeId,
      listId: body.listId ? parseInt(body.listId) : null,
    },
    include: { store: true },
  });

  // Auto-enrich if critical fields are missing (e.g. manual entry without scan)
  if (!wine.tastingNotes || !wine.criticReviews) {
    await enrichWine(wine.id);
  }

  const enriched = await prisma.wine.findUnique({
    where: { id: wine.id },
    include: { store: true },
  });

  return NextResponse.json(enriched, { status: 201 });
}
