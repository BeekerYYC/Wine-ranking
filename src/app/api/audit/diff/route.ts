import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";

const anthropic = new Anthropic();

interface DetectedBottle {
  name: string;
  winery: string | null;
  vintage: number | null;
  varietal: string | null;
  color: string | null;
  quantity: number;
  confidence: number;
}

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

function normalize(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[''’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Match a detected bottle to an existing Wine row in the cellar.
// Strategy: exact normalized name match (with optional winery/vintage tiebreaker),
// else substring match either direction (handles "Cabernet Franc" ↔ "Durigutti Cabernet Franc").
function matchWine(
  detected: DetectedBottle,
  collection: { id: number; name: string; winery: string | null; vintage: number | null; color: string | null; quantity: number }[],
): { id: number; quantity: number } | null {
  const dName = normalize(detected.name);
  const dWinery = normalize(detected.winery);
  const dVintage = detected.vintage;

  const exact = collection.filter((w) => normalize(w.name) === dName);
  const candidates = exact.length > 0
    ? exact
    : collection.filter((w) => {
        const wn = normalize(w.name);
        return wn.length > 4 && (wn.includes(dName) || dName.includes(wn));
      });

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return { id: candidates[0].id, quantity: candidates[0].quantity };

  // Tie-break on winery, then vintage
  const wineryMatch = candidates.filter((w) => dWinery && normalize(w.winery) === dWinery);
  const pool = wineryMatch.length > 0 ? wineryMatch : candidates;
  const vintageMatch = pool.filter((w) => dVintage && w.vintage === dVintage);
  const winner = vintageMatch[0] || pool[0];
  return { id: winner.id, quantity: winner.quantity };
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const { images, category = "wine" } = (await req.json()) as { images: string[]; category?: string };
  if (!Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ error: "images required" }, { status: 400 });
  }

  // Fan out: analyze each photo in parallel.
  const analyzeOne = async (img: string): Promise<DetectedBottle[]> => {
    const base64 = img.replace(/^data:image\/\w+;base64,/, "");
    const mediaType: "image/png" | "image/jpeg" = img.startsWith("data:image/png") ? "image/png" : "image/jpeg";
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
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((b: Record<string, unknown>) => ({
        name: typeof b.name === "string" ? b.name : "",
        winery: typeof b.winery === "string" ? b.winery : null,
        vintage: b.vintage != null ? parseInt(String(b.vintage)) || null : null,
        varietal: typeof b.varietal === "string" ? b.varietal : null,
        color: typeof b.color === "string" ? b.color : null,
        quantity: b.quantity != null ? Math.max(1, parseInt(String(b.quantity)) || 1) : 1,
        confidence: b.confidence != null ? parseFloat(String(b.confidence)) || 0.5 : 0.5,
      })).filter((b: DetectedBottle) => b.name.trim().length > 0);
    } catch {
      return [];
    }
  };

  const perPhoto = await Promise.all(images.map(analyzeOne));
  const flat = perPhoto.flat();

  // Aggregate across photos by normalized (name + winery + vintage) key,
  // taking the MAX quantity seen (assumes overlapping photos rather than
  // non-overlapping shelves — safer to undercount than double-count).
  const agg = new Map<string, DetectedBottle>();
  for (const b of flat) {
    const key = `${normalize(b.name)}|${normalize(b.winery)}|${b.vintage ?? ""}`;
    const prev = agg.get(key);
    if (!prev || b.quantity > prev.quantity) {
      agg.set(key, b);
    }
  }
  const detected = Array.from(agg.values());

  // Pull current collection (qty > 0, status=collection).
  const collection = await prisma.wine.findMany({
    where: { category, status: "collection", quantity: { gt: 0 } },
    select: { id: true, name: true, winery: true, vintage: true, color: true, quantity: true },
  });

  // Build diff buckets
  const matchedDbIds = new Set<number>();
  const matches: { wineId: number; name: string; dbQty: number; detectedQty: number }[] = [];
  const newInPhotos: DetectedBottle[] = [];
  const quantityMismatches: { wineId: number; name: string; dbQty: number; detectedQty: number; delta: number }[] = [];

  for (const d of detected) {
    const match = matchWine(d, collection);
    if (!match) {
      newInPhotos.push(d);
      continue;
    }
    matchedDbIds.add(match.id);
    const dbWine = collection.find((w) => w.id === match.id)!;
    if (d.quantity === match.quantity) {
      matches.push({ wineId: match.id, name: dbWine.name, dbQty: match.quantity, detectedQty: d.quantity });
    } else {
      quantityMismatches.push({
        wineId: match.id,
        name: dbWine.name,
        dbQty: match.quantity,
        detectedQty: d.quantity,
        delta: d.quantity - match.quantity,
      });
    }
  }

  const missingFromPhotos = collection
    .filter((w) => !matchedDbIds.has(w.id))
    .map((w) => ({
      wineId: w.id,
      name: w.name,
      winery: w.winery,
      vintage: w.vintage,
      color: w.color,
      dbQty: w.quantity,
    }));

  return NextResponse.json({
    photosAnalyzed: images.length,
    totalDetectedBottles: detected.reduce((n, d) => n + d.quantity, 0),
    totalDbBottles: collection.reduce((n, w) => n + w.quantity, 0),
    matches,
    quantityMismatches,
    missingFromPhotos,
    newInPhotos,
  });
}
