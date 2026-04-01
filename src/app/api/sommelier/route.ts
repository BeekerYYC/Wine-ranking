import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const { message, type } = await req.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  // Fetch collection context
  const wines = await prisma.wine.findMany({
    select: {
      id: true, name: true, winery: true, vintage: true, varietal: true,
      region: true, country: true, color: true, price: true, rating: true,
      notes: true, quantity: true, status: true, foodPairings: true,
    },
  });

  const collectionSummary = wines
    .map((w) => `- ${w.name}${w.vintage ? ` (${w.vintage})` : ""} by ${w.winery || "unknown"} | ${w.varietal || "?"} | ${w.color || "?"} | Rating: ${w.rating || "unrated"}/5 | $${w.price || "?"} | Qty: ${w.quantity} | Status: ${w.status}${w.notes ? ` | Notes: ${w.notes}` : ""}`)
    .join("\n");

  let systemPrompt = `You are a friendly, knowledgeable wine sommelier assistant. The user has a wine collection you can reference. Be conversational, warm, and helpful. Keep responses concise but informative.

The user's wine collection (${wines.length} wines):
${collectionSummary || "No wines yet."}`;

  let userMessage = message;

  if (type === "recommend") {
    userMessage = `Based on my collection and preferences, what should I open tonight? Consider what I've rated highly and suggest something from my collection. If I don't have a great option, suggest what to buy. ${message || ""}`;
  } else if (type === "pairing") {
    userMessage = `I need a food pairing suggestion. ${message}. Look at my collection and suggest which wine to pair, and also suggest foods that would go well.`;
  } else if (type === "insights") {
    userMessage = `Analyze my wine collection and taste preferences. What patterns do you see? What do I tend to like? What should I explore next? Give me interesting insights about my palate and drinking habits.`;
  }

  systemPrompt += `\n\nRespond in a conversational tone. Use markdown for formatting when helpful. If referencing specific wines from the collection, mention them by name.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  return NextResponse.json({ response: text });
}
