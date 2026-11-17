import { NextRequest, NextResponse } from "next/server";
import { askForJson, arrayOf, hasApiKey, imageBlock, int, nullable, num, object, oneOf, str } from "@/lib/claude";
import { boxInstruction, PixelBox, toFractionBox } from "@/lib/box";
import { imageSize } from "@/lib/crop";

export const maxDuration = 60;

const DETECT_SCHEMA = object({
  bottles: arrayOf(object({
    name: str,
    winery: nullable(str),
    vintage: nullable(int),
    varietal: nullable(str),
    color: nullable(oneOf(["red", "white", "rosé", "sparkling", "dessert", "orange"])),
    quantity: int,
    confidence: num,
    box: nullable(object({ x0: int, y0: int, x1: int, y1: int })),
  })),
});

const DETECT_PROMPT = `Identify every distinct wine bottle visible in this fridge/cellar photo.

List them in "bottles", one entry per UNIQUE wine — if multiple bottles of the same wine are visible, set quantity to the count rather than repeating the entry.

Fields per entry:
- name: wine name (string, required) — be precise: include vintage/cuvée if visible
- winery: producer name (string or null)
- vintage: year as a number (or null)
- varietal: grape varietal (string or null)
- color: one of "red", "white", "rosé", "sparkling", "dessert", "orange" (string or null)
- quantity: how many bottles of this exact wine are visible (number, minimum 1)
- confidence: 0.0 to 1.0 — your confidence in this identification

Only count bottles that are clearly visible enough to identify. If a bottle is too obscured/blurry to identify confidently, omit it. If none can be identified, return an empty list.`;

export async function POST(req: NextRequest) {
  if (!hasApiKey()) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const { image } = (await req.json()) as { image: string };
  if (!image) return NextResponse.json({ error: "image required" }, { status: 400 });

  try {
    // Structured output guarantees the reply parses. A parse failure used to be
    // reported as "no bottles", which hid real errors.
    const size = await imageSize(image);
    const result = await askForJson<{ bottles: Record<string, unknown>[] }>({
      content: [
        imageBlock(image),
        { type: "text", text: size ? `${DETECT_PROMPT}\n\nAlso for each entry:\n${boxInstruction(size.width, size.height)}` : DETECT_PROMPT },
      ],
      schema: DETECT_SCHEMA,
    });
    const parsed = Array.isArray(result.bottles) ? result.bottles : [];

    const bottles = parsed.map((b: Record<string, unknown>) => ({
      name: typeof b.name === "string" ? b.name : "",
      winery: typeof b.winery === "string" ? b.winery : null,
      vintage: b.vintage != null ? parseInt(String(b.vintage)) || null : null,
      varietal: typeof b.varietal === "string" ? b.varietal : null,
      color: typeof b.color === "string" ? b.color : null,
      quantity: b.quantity != null ? Math.max(1, parseInt(String(b.quantity)) || 1) : 1,
      confidence: b.confidence != null ? parseFloat(String(b.confidence)) || 0.5 : 0.5,
      // Where the bottle sits, as fractions of the photo, so the audit can show
      // and save a crop of this bottle instead of the whole drawer.
      box: size ? toFractionBox(b.box as PixelBox | null, size.width, size.height) : null,
    })).filter((b: { name: string }) => b.name.trim().length > 0);

    return NextResponse.json({ bottles });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Scan failed", bottles: [] },
      { status: 500 },
    );
  }
}
