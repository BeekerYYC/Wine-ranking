import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface DetectedBottle {
  name: string;
  winery: string | null;
  vintage: number | null;
  varietal: string | null;
  color: string | null;
  quantity: number;
  confidence: number;
  sourceImageIndex?: number; // optional — client may attach this for review UI
}

function normalize(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[''’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(19|20)\d{2}\b/g, " ") // strip 4-digit vintages
    .replace(/\b(partially|visible|partial|obscured|blurry|unknown)\b/g, " ") // strip AI hedge words
    .replace(/\s+/g, " ")
    .trim();
}

function tokensOf(s: string): string[] {
  return s.split(" ").filter((t) => t.length >= 3);
}

function tokenOverlap(a: string[], b: string[]): number {
  const setB = new Set(b);
  let n = 0;
  for (const t of a) if (setB.has(t)) n++;
  return n;
}

interface DbWine {
  id: number;
  name: string;
  winery: string | null;
  vintage: number | null;
  color: string | null;
  quantity: number;
}

// Match a detected bottle to a DB wine using a series of strategies.
// Each candidate gets a score; we return the highest non-zero scorer.
function matchWine(detected: DetectedBottle, collection: DbWine[]): DbWine | null {
  const dName = normalize(detected.name);
  const dWinery = normalize(detected.winery);
  const dVintage = detected.vintage;
  const dTokens = tokensOf(dName);
  const dWineryTokens = tokensOf(dWinery);

  // No usable name → can't match anything
  if (dTokens.length === 0 && dWineryTokens.length === 0) return null;

  let best: { wine: DbWine; score: number } | null = null;

  for (const w of collection) {
    const wName = normalize(w.name);
    const wWinery = normalize(w.winery);
    const wTokens = tokensOf(wName);
    const wWineryTokens = tokensOf(wWinery);

    let score = 0;

    // 1. Exact normalized name
    if (dName && wName && dName === wName) score += 100;

    // 2. Substring containment (one inside the other, longer side ≥ 5 chars)
    if (score === 0 && dName.length >= 5 && wName.length >= 5) {
      if (wName.includes(dName) || dName.includes(wName)) score += 60;
    }

    // 3. Token overlap on names (need at least 2 matching tokens of length ≥ 3)
    const nameOverlap = tokenOverlap(dTokens, wTokens);
    if (nameOverlap >= 2) score += 20 + nameOverlap * 5;

    // 4. Winery match (covers cases where AI puts producer in winery field,
    //    DB puts it as a prefix on name). Compare both winery↔winery and
    //    winery↔name tokens.
    if (dWinery && wWinery && dWinery === wWinery) score += 40;
    else {
      const wineryToNameOverlap =
        tokenOverlap(dWineryTokens, wTokens) + tokenOverlap(wWineryTokens, dTokens);
      if (wineryToNameOverlap >= 1) score += 10 * wineryToNameOverlap;
    }

    // 5. Vintage agreement
    if (dVintage && w.vintage && dVintage === w.vintage) score += 15;

    // 6. Color agreement (small nudge to break ties)
    if (detected.color && w.color && detected.color === w.color) score += 5;

    if (score > 0 && (!best || score > best.score)) {
      best = { wine: w, score };
    }
  }

  // Require a minimum score so we don't grab on a single weak signal
  return best && best.score >= 25 ? best.wine : null;
}

// Returns top 3 candidate matches for a detected bottle (for the review UI's
// "merge with existing" dropdown). Same scoring as matchWine but doesn't
// enforce the minimum threshold — we always show some suggestions.
function topCandidates(detected: DetectedBottle, collection: DbWine[], k = 3): DbWine[] {
  const dName = normalize(detected.name);
  const dWinery = normalize(detected.winery);
  const dTokens = tokensOf(dName);
  const dWineryTokens = tokensOf(dWinery);

  const scored: { wine: DbWine; score: number }[] = [];
  for (const w of collection) {
    const wName = normalize(w.name);
    const wWinery = normalize(w.winery);
    const wTokens = tokensOf(wName);
    const wWineryTokens = tokensOf(wWinery);

    let s = 0;
    if (dName && wName && dName === wName) s += 100;
    if (dName.length >= 5 && wName.length >= 5 && (wName.includes(dName) || dName.includes(wName))) s += 60;
    const no = tokenOverlap(dTokens, wTokens);
    if (no >= 1) s += 10 + no * 5;
    if (dWinery && wWinery && dWinery === wWinery) s += 40;
    const wo = tokenOverlap(dWineryTokens, wTokens) + tokenOverlap(wWineryTokens, dTokens);
    if (wo >= 1) s += 5 * wo;
    if (detected.vintage && w.vintage && detected.vintage === w.vintage) s += 15;
    if (s > 0) scored.push({ wine: w, score: s });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map((x) => x.wine);
}

export async function POST(req: NextRequest) {
  const { perPhotoBottles, category = "wine" } = (await req.json()) as {
    perPhotoBottles: DetectedBottle[][];
    category?: string;
  };

  if (!Array.isArray(perPhotoBottles)) {
    return NextResponse.json({ error: "perPhotoBottles required" }, { status: 400 });
  }

  // Aggregate across photos — MAX quantity per (name, winery, vintage) key,
  // keeping the first sourceImageIndex seen for review-UI thumbnails.
  const agg = new Map<string, DetectedBottle>();
  for (let i = 0; i < perPhotoBottles.length; i++) {
    for (const b of perPhotoBottles[i]) {
      const key = `${normalize(b.name)}|${normalize(b.winery)}|${b.vintage ?? ""}`;
      const tagged: DetectedBottle = { ...b, sourceImageIndex: b.sourceImageIndex ?? i };
      const prev = agg.get(key);
      if (!prev || tagged.quantity > prev.quantity) agg.set(key, tagged);
    }
  }
  const detected = Array.from(agg.values());

  const collection = await prisma.wine.findMany({
    where: { category, status: "collection", quantity: { gt: 0 } },
    select: { id: true, name: true, winery: true, vintage: true, color: true, quantity: true },
  });

  const matchedDbIds = new Set<number>();
  const matches: { wineId: number; name: string; dbQty: number; detectedQty: number }[] = [];
  const newInPhotos: (DetectedBottle & { candidates: { wineId: number; name: string; winery: string | null; vintage: number | null; dbQty: number }[] })[] = [];
  const quantityMismatches: { wineId: number; name: string; dbQty: number; detectedQty: number; delta: number; sourceImageIndex?: number }[] = [];

  for (const d of detected) {
    const match = matchWine(d, collection);
    if (!match) {
      const candidates = topCandidates(d, collection, 3).map((w) => ({
        wineId: w.id,
        name: w.name,
        winery: w.winery,
        vintage: w.vintage,
        dbQty: w.quantity,
      }));
      newInPhotos.push({ ...d, candidates });
      continue;
    }
    matchedDbIds.add(match.id);
    if (d.quantity === match.quantity) {
      matches.push({ wineId: match.id, name: match.name, dbQty: match.quantity, detectedQty: d.quantity });
    } else {
      quantityMismatches.push({
        wineId: match.id,
        name: match.name,
        dbQty: match.quantity,
        detectedQty: d.quantity,
        delta: d.quantity - match.quantity,
        sourceImageIndex: d.sourceImageIndex,
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
    photosAnalyzed: perPhotoBottles.length,
    totalDetectedBottles: detected.reduce((n, d) => n + d.quantity, 0),
    totalDbBottles: collection.reduce((n, w) => n + w.quantity, 0),
    matches,
    quantityMismatches,
    missingFromPhotos,
    newInPhotos,
  });
}
