import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface ReceiptSeedItem {
  name: string;
  winery?: string | null;
  vintage?: number | null;
  varietal?: string | null;
  region?: string | null;
  country?: string | null;
  color?: string | null;
  price?: number | null;
  quantity?: number;
}

export async function POST(req: NextRequest) {
  const { storeName, items, category = "wine" } = (await req.json()) as {
    storeName?: string;
    items: ReceiptSeedItem[];
    category?: string;
  };

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items required" }, { status: 400 });
  }

  let storeId: number | null = null;
  if (storeName?.trim()) {
    const store = await prisma.store.upsert({
      where: { name: storeName.trim() },
      update: {},
      create: { name: storeName.trim() },
    });
    storeId = store.id;
  }

  const results = [];

  for (const item of items) {
    if (!item.name?.trim()) continue;

    const qty = Math.max(1, item.quantity ?? 1);

    const where: Record<string, unknown> = {
      name: { equals: item.name, mode: "insensitive" },
      category,
      status: "collection",
    };
    if (item.vintage) where.vintage = item.vintage;
    if (item.winery) where.winery = { equals: item.winery, mode: "insensitive" };

    const existing = await prisma.wine.findFirst({ where });

    if (existing) {
      const updated = await prisma.wine.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + qty },
      });
      results.push({ wineId: updated.id, name: updated.name, action: "merged", addedQty: qty });
    } else {
      const created = await prisma.wine.create({
        data: {
          name: item.name.trim(),
          category,
          winery: item.winery ?? null,
          vintage: item.vintage ?? null,
          varietal: item.varietal ?? null,
          region: item.region ?? null,
          country: item.country ?? null,
          color: item.color ?? null,
          price: item.price ?? null,
          quantity: qty,
          status: "collection",
          storeId,
        },
      });
      results.push({ wineId: created.id, name: created.name, action: "created", addedQty: qty });
    }
  }

  return NextResponse.json({ results });
}
