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
    // Record that the lookup happened. Without this, a wine the search found no
    // listing for was indistinguishable from one never looked up, and the page
    // said "Not looked up yet" about a search that had already run.
    const updated = await prisma.wine.update({
      where: { id: wineId },
      data: {
        marketPriceAt: new Date(),
        marketPriceNote: "No credible retail listing found",
        // Deliberately leave marketPrice as-is: a failed refresh must not erase
        // a previously found price.
      },
      select: {
        id: true, name: true, marketPrice: true, marketCurrency: true,
        marketPriceNote: true, marketPriceAt: true,
      },
    });
    return NextResponse.json({ ok: false, wine: updated });
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
