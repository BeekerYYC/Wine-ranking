import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  askForJson, arrayOf, hasApiKey, imageBlock, int, nullable, num, object, oneOf, str, toConfidence, toScore,
} from "@/lib/claude";
import { CATEGORIES, Category } from "@/lib/categories";

// Each call reads one photo with Claude, which takes longer than the default
// function budget.
export const maxDuration = 60;

const SCAN_PROMPTS: Record<string, string> = {
  wine: `Analyze this wine image. It may show a SINGLE bottle or MULTIPLE bottles (e.g. a wine fridge shelf/drawer).

List each UNIQUE wine in "items". If you see multiple bottles of the same wine, DO NOT repeat them — instead set a higher "quantity" count.

Each item has:
- name: the wine name (string)
- winery: producer name (string or null)
- vintage: year (number or null)
- varietal: grape variety (string or null)
- region: wine region (string or null)
- country: country of origin (string or null)
- color: one of "red", "white", "rosé", "sparkling", "dessert", "orange"
- description: 1-2 sentences about the wine (string)
- foodPairings: 3-4 food pairing suggestions comma-separated (string)
- onlineRating: estimated critic/community score 0-100 (number or null)
- confidence: identification confidence, 0.0 to 1.0 (number)
- quantity: how many of this exact item you can see (number, minimum 1)`,

  coffee: `Analyze this coffee image. It may show a SINGLE bag or MULTIPLE bags/containers.

List each UNIQUE coffee in "items". If you see duplicates, set a higher "quantity" count.

Each item has:
- name: the coffee name (string)
- winery: roaster name (string or null)
- vintage: roast date year (number or null)
- varietal: origin (e.g. "Ethiopia", "Colombia") (string or null)
- region: specific growing region (string or null)
- country: country of origin (string or null)
- color: one of "light", "medium", "medium-dark", "dark", "espresso", "decaf"
- description: 1-2 sentences about the coffee (string)
- foodPairings: 3-4 things that pair well comma-separated (string)
- onlineRating: estimated quality score 0-100 (number or null)
- confidence: identification confidence, 0.0 to 1.0 (number)
- quantity: how many of this exact item you can see (number, minimum 1)`,

  beer: `Analyze this beer image. It may show a SINGLE can/bottle or MULTIPLE (e.g. a fridge shelf).

List each UNIQUE beer in "items". If you see duplicates, set a higher "quantity" count.

Each item has:
- name: the beer name (string)
- winery: brewery name (string or null)
- vintage: brew date year (number or null)
- varietal: beer style (e.g. "IPA", "Stout", "Lager") (string or null)
- region: brewery location (string or null)
- country: country of origin (string or null)
- color: one of "ipa", "lager", "stout", "pilsner", "wheat", "sour", "porter", "pale-ale"
- description: 1-2 sentences about the beer (string)
- foodPairings: 3-4 food pairing suggestions comma-separated (string)
- onlineRating: estimated rating 0-100 (number or null)
- confidence: identification confidence, 0.0 to 1.0 (number)
- quantity: how many of this exact item you can see (number, minimum 1)`,
};

function scanSchema(category: Category) {
  return object({
    items: arrayOf(object({
      name: str,
      winery: nullable(str),
      vintage: nullable(int),
      varietal: nullable(str),
      region: nullable(str),
      country: nullable(str),
      color: nullable(oneOf(CATEGORIES[category].types.map((t) => t.value))),
      description: nullable(str),
      foodPairings: nullable(str),
      onlineRating: nullable(num),
      confidence: num,
      quantity: int,
    })),
  });
}

interface ScannedItem {
  name: string;
  winery: string | null;
  vintage: number | null;
  varietal: string | null;
  region: string | null;
  country: string | null;
  color: string | null;
  description: string | null;
  foodPairings: string | null;
  onlineRating: number | null;
  confidence: number;
  quantity: number;
}

function toScanItemData(b: ScannedItem) {
  return {
    name: b.name || null,
    winery: b.winery || null,
    vintage: Number.isInteger(b.vintage) ? b.vintage : null,
    varietal: b.varietal || null,
    region: b.region || null,
    country: b.country || null,
    color: b.color || null,
    description: b.description || null,
    foodPairings: b.foodPairings || null,
    onlineRating: toScore(b.onlineRating),
    confidence: toConfidence(b.confidence),
    quantity: Number.isInteger(b.quantity) && b.quantity > 0 ? b.quantity : 1,
  };
}

async function batchResponse(id: number, extra: Record<string, unknown>) {
  const batch = await prisma.scanBatch.findUnique({
    where: { id },
    include: { items: { orderBy: { id: "asc" } } },
  });
  return NextResponse.json({ ...extra, batch });
}

/**
 * Analyze the next pending photo in a batch. The client calls this repeatedly
 * until it gets `done: true`.
 *
 * `?skip=1` marks the next pending photo as unreadable without analyzing it, so
 * a photo whose analysis keeps timing out cannot stall the whole scan.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params;
  const id = parseInt(batchId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid batch id" }, { status: 400 });
  }

  const batchInfo = await prisma.scanBatch.findUnique({ where: { id } });
  if (!batchInfo) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }
  const category: Category = batchInfo.category in CATEGORIES ? (batchInfo.category as Category) : "wine";

  const pendingItem = await prisma.scanItem.findFirst({
    where: { batchId: id, status: "pending" },
    orderBy: { sourceIndex: "asc" },
  });

  if (!pendingItem) {
    await prisma.scanBatch.update({ where: { id }, data: { status: "reviewing" } });
    return batchResponse(id, { done: true });
  }

  const markUnreadable = async () => {
    await prisma.scanItem.update({ where: { id: pendingItem.id }, data: { status: "rejected" } });
    await prisma.scanBatch.update({ where: { id }, data: { processed: { increment: 1 } } });
  };

  if (req.nextUrl.searchParams.get("skip") === "1" || !pendingItem.imageData) {
    await markUnreadable();
    return batchResponse(id, { done: false, skipped: true });
  }

  if (!hasApiKey()) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  try {
    const result = await askForJson<{ items: ScannedItem[] }>({
      content: [
        imageBlock(pendingItem.imageData),
        {
          type: "text",
          text: `${SCAN_PROMPTS[category]}\n\nFor items where labels are partially obscured, do your best and set confidence lower. If you see no ${CATEGORIES[category].itemNamePlural} at all, return an empty list.`,
        },
      ],
      schema: scanSchema(category),
    });
    const bottles = result.items ?? [];

    if (bottles.length === 0) {
      await prisma.scanItem.update({ where: { id: pendingItem.id }, data: { status: "rejected" } });
    } else {
      const [first, ...rest] = bottles;
      // Keep the source photo on every derived scan item so the reviewer can
      // see what the AI was looking at and audit visually. Multi-bottle photos
      // used to null this out to save DB space — but the user can't verify
      // partial-visibility labels without the picture.
      const sourceImage = pendingItem.imageData;
      await prisma.scanItem.update({
        where: { id: pendingItem.id },
        data: { status: "analyzed", ...toScanItemData(first) },
      });
      if (rest.length > 0) {
        await prisma.scanItem.createMany({
          data: rest.map((b) => ({
            batchId: id,
            sourceIndex: pendingItem.sourceIndex,
            imageData: sourceImage,
            status: "analyzed",
            ...toScanItemData(b),
          })),
        });
      }
    }

    await prisma.scanBatch.update({ where: { id }, data: { processed: { increment: 1 } } });
    return batchResponse(id, { done: false });
  } catch (err) {
    await markUnreadable();
    return batchResponse(id, {
      done: false,
      error: err instanceof Error ? err.message : "Analysis failed",
    });
  }
}
