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
}

function normalize(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[''’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

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

  const wineryMatch = candidates.filter((w) => dWinery && normalize(w.winery) === dWinery);
  const pool = wineryMatch.length > 0 ? wineryMatch : candidates;
  const vintageMatch = pool.filter((w) => dVintage && w.vintage === dVintage);
  const winner = vintageMatch[0] || pool[0];
  return { id: winner.id, quantity: winner.quantity };
}

export async function POST(req: NextRequest) {
  const { perPhotoBottles, category = "wine" } = (await req.json()) as {
    perPhotoBottles: DetectedBottle[][];
    category?: string;
  };

  if (!Array.isArray(perPhotoBottles)) {
    return NextResponse.json({ error: "perPhotoBottles required" }, { status: 400 });
  }

  // Aggregate across photos — take MAX quantity per (name, winery, vintage)
  // so overlapping shots don't double-count.
  const agg = new Map<string, DetectedBottle>();
  for (const photo of perPhotoBottles) {
    for (const b of photo) {
      const key = `${normalize(b.name)}|${normalize(b.winery)}|${b.vintage ?? ""}`;
      const prev = agg.get(key);
      if (!prev || b.quantity > prev.quantity) {
        agg.set(key, b);
      }
    }
  }
  const detected = Array.from(agg.values());

  const collection = await prisma.wine.findMany({
    where: { category, status: "collection", quantity: { gt: 0 } },
    select: { id: true, name: true, winery: true, vintage: true, color: true, quantity: true },
  });

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
    photosAnalyzed: perPhotoBottles.length,
    totalDetectedBottles: detected.reduce((n, d) => n + d.quantity, 0),
    totalDbBottles: collection.reduce((n, w) => n + w.quantity, 0),
    matches,
    quantityMismatches,
    missingFromPhotos,
    newInPhotos,
  });
}
