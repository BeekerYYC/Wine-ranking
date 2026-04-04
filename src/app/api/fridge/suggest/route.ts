import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const EXPERT_ROLES: Record<string, string> = {
  wine: "sommelier helping someone pick a wine from their fridge",
  coffee: "barista helping someone pick a coffee from their shelf",
  beer: "cicerone helping someone pick a beer from their fridge",
};

export async function POST(req: NextRequest) {
  const { context, category = "wine" } = await req.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const wines = await prisma.wine.findMany({
    where: { category, status: "collection", quantity: { gt: 0 } },
    orderBy: { rating: "desc" },
  });

  if (wines.length === 0) {
    return NextResponse.json({ error: `No ${category} in your collection` }, { status: 400 });
  }

  const itemList = wines.map((w) =>
    `[ID:${w.id}] ${w.name}${w.vintage ? ` ${w.vintage}` : ""}${w.winery ? ` by ${w.winery}` : ""} — ${w.color || "unknown"}, ${w.varietal || "unknown"}${w.region ? `, ${w.region}` : ""}${w.rating ? `, rated ${w.rating}/5` : ""}${w.price ? `, $${w.price}` : ""}${w.foodPairings ? `. Pairs with: ${w.foodPairings}` : ""}`
  ).join("\n");

  const role = EXPERT_ROLES[category] || EXPERT_ROLES.wine;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: `You are a ${role}. You can ONLY suggest items from their collection below. Return a JSON object with:
- suggestion: { wineId: number, name: string, reason: string (2-3 sentences explaining why this is the perfect pick) }
- alternatives: array of { wineId: number, name: string, reason: string (1 sentence) } (1-2 alternatives)

Return ONLY valid JSON, no markdown.

Their collection contains:
${itemList}`,
    messages: [{ role: "user", content: context || `What should I have tonight?` }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Failed to parse suggestion", raw: text }, { status: 500 });
  }
}
