import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { askForJson, arrayOf, hasApiKey, int, object, str } from "@/lib/claude";

// A pairing suggestion is one Claude call, which can outlast the default budget.
export const maxDuration = 60;

const EXPERT_ROLES: Record<string, string> = {
  wine: "sommelier helping someone pick a wine from their fridge",
  coffee: "barista helping someone pick a coffee from their shelf",
  beer: "cicerone helping someone pick a beer from their fridge",
};

const pick = object({ wineId: int, name: str, reason: str });
const SUGGEST_SCHEMA = object({ suggestion: pick, alternatives: arrayOf(pick) });

interface Pick { wineId: number; name: string; reason: string }

export async function POST(req: NextRequest) {
  const { context, category = "wine" } = await req.json();

  if (!hasApiKey()) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const wines = await prisma.wine.findMany({
    where: { category, status: "collection", quantity: { gt: 0 } },
    orderBy: { rating: { sort: "desc", nulls: "last" } },
    select: {
      id: true, name: true, vintage: true, winery: true, color: true, varietal: true,
      region: true, rating: true, price: true, foodPairings: true,
    },
  });

  if (wines.length === 0) {
    return NextResponse.json({ error: `No ${category} in your collection` }, { status: 400 });
  }

  const itemList = wines.map((w) =>
    `[ID:${w.id}] ${w.name}${w.vintage ? ` ${w.vintage}` : ""}${w.winery ? ` by ${w.winery}` : ""} — ${w.color || "unknown"}, ${w.varietal || "unknown"}${w.region ? `, ${w.region}` : ""}${w.rating ? `, rated ${w.rating}/5` : ""}${w.price ? `, $${w.price}` : ""}${w.foodPairings ? `. Pairs with: ${w.foodPairings}` : ""}`
  ).join("\n");

  const role = EXPERT_ROLES[category] || EXPERT_ROLES.wine;

  let result: { suggestion: Pick; alternatives: Pick[] };
  try {
    result = await askForJson({
      system: `You are a ${role}. You can ONLY suggest items from their collection below, identified by their ID.
- suggestion: the best pick, with a reason of 2-3 sentences explaining why it is the perfect pick
- alternatives: 1-2 other good picks, each with a 1-sentence reason

Their collection contains:
${itemList}`,
      content: context || "What should I have tonight?",
      schema: SUGGEST_SCHEMA,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not get a suggestion" },
      { status: 502 }
    );
  }

  // Only offer bottles that are really in the fridge — "Open" on a made-up ID
  // would fail.
  const inFridge = new Map(wines.map((w) => [w.id, w.name]));
  const picks = [result.suggestion, ...(result.alternatives ?? [])]
    .filter((p) => p && inFridge.has(p.wineId))
    .map((p) => ({ ...p, name: inFridge.get(p.wineId)! }));

  if (picks.length === 0) {
    return NextResponse.json({ error: "Could not match a suggestion to your collection — try again" }, { status: 502 });
  }

  const [suggestion, ...alternatives] = picks;
  return NextResponse.json({ suggestion, alternatives });
}
