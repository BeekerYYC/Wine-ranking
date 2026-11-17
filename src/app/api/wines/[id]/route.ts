import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeColor } from "@/lib/colors";

const STATUSES = ["collection", "wishlist", "consumed", "restaurant"];

// Free-text fields: an empty string clears the field.
const TEXT_FIELDS = [
  "winery", "varietal", "region", "country", "notes", "description",
  "tastingNotes", "drinkingWindow", "criticReviews", "occasion",
  "foodPairings", "imageData", "labelImageUrl",
] as const;

function parseId(id: string): number | null {
  const n = Number.parseInt(id, 10);
  return Number.isFinite(n) ? n : null;
}

const toText = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
const toInt = (v: unknown) => {
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
};
const toFloat = (v: unknown) => {
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
};

/**
 * Build a Prisma update from ONLY the fields present in the request body.
 *
 * This used to write every field on every request, turning anything the
 * client did not send into null — so the wine page's quantity buttons and
 * status dropdown, which send one field, wiped the producer, vintage, grape,
 * region, price, rating, notes and photo of the bottle.
 */
function buildUpdate(body: Record<string, unknown>): Record<string, unknown> {
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);
  const data: Record<string, unknown> = {};

  if (has("name") && typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
  }
  for (const field of TEXT_FIELDS) {
    if (has(field)) data[field] = toText(body[field]);
  }
  if (has("color")) {
    const raw = toText(body.color);
    data.color = raw ? normalizeColor(raw) ?? raw : null;
  }
  if (has("vintage")) data.vintage = toInt(body.vintage);
  if (has("price")) data.price = toFloat(body.price);
  if (has("onlineRating")) data.onlineRating = toFloat(body.onlineRating);
  if (has("rating")) {
    const r = toInt(body.rating);
    data.rating = r !== null && r >= 1 && r <= 5 ? r : null;
  }
  if (has("quantity")) {
    const q = toInt(body.quantity);
    if (q !== null && q >= 0) data.quantity = q;
  }
  if (has("status") && typeof body.status === "string" && STATUSES.includes(body.status)) {
    data.status = body.status;
  }
  if (has("listId")) data.listId = toInt(body.listId);

  return data;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const wine = await prisma.wine.findUnique({
    where: { id },
    include: { store: true, list: true, consumptions: { orderBy: { createdAt: "desc" } } },
  });
  if (!wine) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(wine);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = (await req.json()) as Record<string, unknown>;

  const existing = await prisma.wine.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = buildUpdate(body);

  if (Object.prototype.hasOwnProperty.call(body, "storeName")) {
    const storeName = toText(body.storeName)?.trim();
    if (storeName) {
      const store = await prisma.store.upsert({
        where: { name: storeName },
        update: {},
        create: { name: storeName },
      });
      data.storeId = store.id;
    } else {
      data.storeId = null;
    }
  }

  const wine = await prisma.wine.update({
    where: { id },
    data,
    include: { store: true, list: true, consumptions: { orderBy: { createdAt: "desc" } } },
  });

  return NextResponse.json(wine);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const existing = await prisma.wine.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.wine.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
