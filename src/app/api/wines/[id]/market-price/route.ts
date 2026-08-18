import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findMarketPrice } from "@/lib/marketPrice";

// A web search plus a model call; more than the default budget allows.
export const maxDuration = 60;

/** Re-research one wine's market price on demand. */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wineId = parseInt(id);
  if (!Number.isFinite(wineId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const wine = await prisma.wine.findUnique({ where: { id: wineId } });
  if (!wine) return NextResponse.json({ error: "Wine not found" }, { status: 404 });

  const market = await findMarketPrice(wine);
  if (!market) {
    return NextResponse.json(
      { error: "No credible market price found for this wine" },
      { status: 404 },
    );
  }

  const updated = await prisma.wine.update({
    where: { id: wineId },
    data: {
      marketPrice: market.price,
      marketCurrency: market.currency,
      marketPriceNote: market.note,
      marketPriceAt: new Date(),
    },
    select: {
      id: true, name: true, marketPrice: true, marketCurrency: true,
      marketPriceNote: true, marketPriceAt: true,
    },
  });

  return NextResponse.json({ ok: true, wine: updated });
}
