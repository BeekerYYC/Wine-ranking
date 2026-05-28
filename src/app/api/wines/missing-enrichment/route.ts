import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Returns wines in the collection that have no AI-enriched data.
 *
 * A wine is "missing enrichment" if all of the AI-populated fields are empty
 * — tastingNotes, criticReviews, description, foodPairings, drinkingWindow.
 * Just one being filled means the enrich was at least partial, so we skip it.
 */
export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") || "wine";
  const status = req.nextUrl.searchParams.get("status") || "collection";

  const wines = await prisma.wine.findMany({
    where: {
      category,
      status,
      quantity: { gt: 0 },
      AND: [
        { OR: [{ tastingNotes: null }, { tastingNotes: "" }] },
        { OR: [{ criticReviews: null }, { criticReviews: "" }] },
        { OR: [{ description: null }, { description: "" }] },
        { OR: [{ foodPairings: null }, { foodPairings: "" }] },
        { OR: [{ drinkingWindow: null }, { drinkingWindow: "" }] },
      ],
    },
    select: { id: true, name: true, winery: true, vintage: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ wines, count: wines.length });
}
