import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const { context } = await req.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  // Get all wines currently in the fridge
  const wines = await prisma.wine.findMany({
    where: { status: "collection", quantity: { gt: 0 } },
    orderBy: { rating: "desc" },
  });

  if (wines.length === 0) {
    return NextResponse.json({ error: "No wines in your fridge" }, { status: 400 });
  }

  const wineList = wines.map((w) =>
    `[ID:${w.id}] ${w.name}${w.vintage ? ` ${w.vintage}` : ""}${w.winery ? ` by ${w.winery}` : ""} — ${w.color || "unknown"}, ${w.varietal || "unknown varietal"}${w.region ? `, ${w.region}` : ""}${w.rating ? `, rated ${w.rating}/5` : ""}${w.price ? `, $${w.price}` : ""}${w.foodPairings ? `. Pairs with: ${w.foodPairings}` : ""}`
  ).join("\n");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: `You are a sommelier helping someone pick a wine from their fridge. You can ONLY suggest wines from their collection below. Return a JSON object with:
- suggestion: { wineId: number, name: string, reason: string (2-3 sentences explaining why this is the perfect pick) }
- alternatives: array of { wineId: number, name: string, reason: string (1 sentence) } (1-2 alternatives)

Return ONLY valid JSON, no markdown.

Their wine fridge contains:
${wineList}`,
    messages: [{ role: "user", content: context || "What should I drink tonight?" }],
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
