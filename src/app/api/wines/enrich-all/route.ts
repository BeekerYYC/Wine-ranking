import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enrichWine } from "@/lib/enrich";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const { category = "wine", force = false } = await req.json().catch(() => ({}));

  // Find wines that need enrichment
  const where: Record<string, unknown> = { category };
  if (!force) {
    // Only enrich wines missing critic reviews or tasting notes
    where.OR = [
      { tastingNotes: null },
      { criticReviews: null },
    ];
  }

  const wines = await prisma.wine.findMany({
    where,
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });

  if (wines.length === 0) {
    return NextResponse.json({ total: 0, enriched: 0, errors: 0, results: [] });
  }

  // Process sequentially to avoid rate limits
  const results: { id: number; name: string; success: boolean; error?: string }[] = [];
  let enriched = 0;
  let errors = 0;

  for (const wine of wines) {
    const result = await enrichWine(wine.id);
    results.push({ id: wine.id, name: wine.name, success: result.success, error: result.error });
    if (result.success) enriched++;
    else errors++;
  }

  return NextResponse.json({ total: wines.length, enriched, errors, results });
}
