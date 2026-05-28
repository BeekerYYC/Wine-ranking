import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export const maxDuration = 60;

const DETECT_PROMPT = `Identify every distinct wine bottle visible in this fridge/cellar photo.

Return a JSON array. One object per UNIQUE wine — if multiple bottles of the same wine are visible, set quantity to the count rather than repeating the entry.

Fields per object:
- name: wine name (string, required) — be precise: include vintage/cuvée if visible
- winery: producer name (string or null)
- vintage: year as a number (or null)
- varietal: grape varietal (string or null)
- color: one of "red", "white", "rosé", "sparkling", "dessert", "orange" (string or null)
- quantity: how many bottles of this exact wine are visible (number, minimum 1)
- confidence: 0.0 to 1.0 — your confidence in this identification

Only count bottles that are clearly visible enough to identify. If a bottle is too obscured/blurry to identify confidently, omit it. Return ONLY a valid JSON array. No markdown code blocks, no prose.`;

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const { image } = (await req.json()) as { image: string };
  if (!image) return NextResponse.json({ error: "image required" }, { status: 400 });

  const base64 = image.replace(/^data:image\/\w+;base64,/, "");
  const mediaType: "image/png" | "image/jpeg" = image.startsWith("data:image/png") ? "image/png" : "image/jpeg";

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: DETECT_PROMPT },
        ],
      }],
    });
    const text = message.content[0].type === "text" ? message.content[0].text : "[]";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ bottles: [] });
    }
    if (!Array.isArray(parsed)) return NextResponse.json({ bottles: [] });

    const bottles = parsed.map((b: Record<string, unknown>) => ({
      name: typeof b.name === "string" ? b.name : "",
      winery: typeof b.winery === "string" ? b.winery : null,
      vintage: b.vintage != null ? parseInt(String(b.vintage)) || null : null,
      varietal: typeof b.varietal === "string" ? b.varietal : null,
      color: typeof b.color === "string" ? b.color : null,
      quantity: b.quantity != null ? Math.max(1, parseInt(String(b.quantity)) || 1) : 1,
      confidence: b.confidence != null ? parseFloat(String(b.confidence)) || 0.5 : 0.5,
    })).filter((b: { name: string }) => b.name.trim().length > 0);

    return NextResponse.json({ bottles });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Scan failed", bottles: [] },
      { status: 500 },
    );
  }
}
