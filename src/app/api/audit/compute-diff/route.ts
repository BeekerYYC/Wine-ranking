import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeColor } from "@/lib/colors";
import type { Box } from "@/lib/box";

interface DetectedBottle {
  name: string;
  winery: string | null;
  vintage: number | null;
  varietal: string | null;
  color: string | null;
  quantity: number;
  confidence: number;
  sourceImageIndex?: number; // which photo it was seen in, for the review UI
  box?: Box | null; // where in that photo, for a cropped thumbnail
}

function normalize(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // é → e, so "Rosé" and "Rose" agree
    .replace(/['‘’]/g, "")
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

const MATCH_THRESHOLD = 30;

/**
 * How likely a detected bottle is this cellar wine (0 = not this wine).
 *
 * Two things this used to get wrong, both reproduced against real data:
 * - A shared producer was enough on its own. "Kloof Street Swartland Rosé"
 *   matched the cellar's "Kloof Street Old Vine Chenin" — a different wine of a
 *   different colour — so the rosé was never offered as new and the Chenin's
 *   count went up instead. Producer words now don't count as name evidence, and
 *   the name itself has to agree.
 * - A different colour or vintage didn't count against a match. Both are now
 *   disqualifying when both sides know them, like the duplicate finder does.
 */
function matchScore(d: DetectedBottle, w: DbWine): number {
  const dColor = normalizeColor(d.color);
  const wColor = normalizeColor(w.color);
  if (dColor && wColor && dColor !== wColor) return 0;
  if (d.vintage && w.vintage && d.vintage !== w.vintage) return 0;

  const dName = normalize(d.name);
  const wName = normalize(w.name);
  const dWinery = normalize(d.winery);
  const wWinery = normalize(w.winery);
  const dWineryTokens = tokensOf(dWinery);
  const wWineryTokens = tokensOf(wWinery);
  const producer = new Set([...dWineryTokens, ...wWineryTokens]);
  // Name tokens that aren't just the producer's name repeated.
  const dCore = tokensOf(dName).filter((t) => !producer.has(t));
  const wCore = tokensOf(wName).filter((t) => !producer.has(t));

  // Two named producers that share nothing: only a distinctive shared name (two
  // or more words, e.g. "Miraval Rosé" under "Château Miraval" vs "Perrin") can
  // still be the same wine. A generic one like "Rouge" can't.
  const producersDisjoint = !!dWinery && !!wWinery && tokenOverlap(dWineryTokens, wWineryTokens) === 0;
  if (producersDisjoint && tokenOverlap(tokensOf(dName), tokensOf(wName)) < 2) return 0;

  let nameScore = 0;
  if (dName && wName && dName === wName) nameScore = 100;
  else if (dName.length >= 5 && wName.length >= 5 && (wName.includes(dName) || dName.includes(wName))) nameScore = 60;
  else {
    const core = tokenOverlap(dCore, wCore);
    if (core >= 1) nameScore = 20 + 10 * core;
  }
  if (nameScore === 0) return 0;

  let score = nameScore;
  if (dWinery && wWinery) {
    if (dWinery === wWinery) score += 40;
    else if (!producersDisjoint) score += 20;
    else score -= 40; // unrelated producers: only a strong name match survives
  } else {
    // One side has no producer — accept it showing up as part of the other's name.
    score += 10 * (tokenOverlap(dWineryTokens, tokensOf(wName)) + tokenOverlap(wWineryTokens, tokensOf(dName)));
  }
  if (d.vintage && w.vintage && d.vintage === w.vintage) score += 15;
  if (dColor && wColor && dColor === wColor) score += 5;
  return score;
}

// Top 3 cellar wines a detected bottle might be, for the review UI's "merge
// with existing" dropdown. Looser than a match: always offers something.
function topCandidates(d: DetectedBottle, collection: DbWine[], k = 3): DbWine[] {
  const dName = normalize(d.name);
  const dWinery = normalize(d.winery);
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
    if (d.vintage && w.vintage && d.vintage === w.vintage) s += 15;
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

  // Add counts up across photos: each photo is a different shelf or drawer, so
  // 2 bottles on one shelf and 2 on another are 4 bottles. This used to take the
  // highest single count instead, which reported 2 — and the review then offered
  // to log the other 2 as drunk. For the thumbnail, keep the sighting the AI was
  // most confident about.
  const agg = new Map<string, DetectedBottle>();
  for (let i = 0; i < perPhotoBottles.length; i++) {
    for (const b of perPhotoBottles[i] ?? []) {
      const key = `${normalize(b.name)}|${normalize(b.winery)}|${b.vintage ?? ""}`;
      const tagged: DetectedBottle = { ...b, sourceImageIndex: b.sourceImageIndex ?? i };
      const prev = agg.get(key);
      if (!prev) {
        agg.set(key, tagged);
      } else {
        const best = (tagged.confidence ?? 0) > (prev.confidence ?? 0) ? tagged : prev;
        agg.set(key, { ...best, quantity: prev.quantity + tagged.quantity });
      }
    }
  }
  const detected = Array.from(agg.values());

  const collection = await prisma.wine.findMany({
    where: { category, status: "collection", quantity: { gt: 0 } },
    select: { id: true, name: true, winery: true, vintage: true, color: true, quantity: true },
  });

  // Pair detections with cellar wines one-to-one, strongest pairs first. Each
  // detection used to pick its best wine independently, so two different
  // bottles could both claim the same wine and adjust its count twice.
  const pairs: { d: number; w: number; score: number }[] = [];
  detected.forEach((d, di) =>
    collection.forEach((w, wi) => {
      const score = matchScore(d, w);
      if (score >= MATCH_THRESHOLD) pairs.push({ d: di, w: wi, score });
    }),
  );
  pairs.sort((a, b) => b.score - a.score);
  const wineFor = new Map<number, DbWine>();
  const claimed = new Set<number>();
  for (const p of pairs) {
    if (wineFor.has(p.d) || claimed.has(p.w)) continue;
    wineFor.set(p.d, collection[p.w]);
    claimed.add(p.w);
  }

  const matches: { wineId: number; name: string; dbQty: number; detectedQty: number }[] = [];
  const newInPhotos: (DetectedBottle & { candidates: { wineId: number; name: string; winery: string | null; vintage: number | null; dbQty: number }[] })[] = [];
  const quantityMismatches: { wineId: number; name: string; dbQty: number; detectedQty: number; delta: number; sourceImageIndex?: number; box?: Box | null }[] = [];

  detected.forEach((d, di) => {
    const match = wineFor.get(di);
    if (!match) {
      const candidates = topCandidates(d, collection, 3).map((w) => ({
        wineId: w.id,
        name: w.name,
        winery: w.winery,
        vintage: w.vintage,
        dbQty: w.quantity,
      }));
      newInPhotos.push({ ...d, candidates });
      return;
    }
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
        box: d.box ?? null,
      });
    }
  });

  const missingFromPhotos = collection
    .filter((_, wi) => !claimed.has(wi))
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
