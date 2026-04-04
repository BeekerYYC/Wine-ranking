import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const SCAN_PROMPTS: Record<string, string> = {
  wine: `Analyze this wine image. It may show a SINGLE bottle or MULTIPLE bottles (e.g. a wine fridge shelf/drawer).

Return a JSON array of UNIQUE wine objects. If you see multiple bottles of the same wine, DO NOT repeat them — instead set a higher "quantity" count.

Each object must have:
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

Return a JSON array of UNIQUE coffee objects. If you see duplicates, set a higher "quantity" count.

Each object must have:
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

Return a JSON array of UNIQUE beer objects. If you see duplicates, set a higher "quantity" count.

Each object must have:
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

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params;
  const id = parseInt(batchId);

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  // Get batch category
  const batch_info = await prisma.scanBatch.findUnique({ where: { id } });
  const category = batch_info?.category || "wine";

  const pendingItem = await prisma.scanItem.findFirst({
    where: { batchId: id, status: "pending" },
    orderBy: { sourceIndex: "asc" },
  });

  if (!pendingItem) {
    await prisma.scanBatch.update({
      where: { id },
      data: { status: "reviewing" },
    });
    const batch = await prisma.scanBatch.findUnique({
      where: { id },
      include: { items: { orderBy: { id: "asc" } } },
    });
    return NextResponse.json({ done: true, batch });
  }

  if (!pendingItem.imageData) {
    await prisma.scanItem.update({
      where: { id: pendingItem.id },
      data: { status: "rejected" },
    });
    return NextResponse.json({ done: false, skipped: true });
  }

  const base64 = pendingItem.imageData.replace(/^data:image\/\w+;base64,/, "");
  const mediaType = pendingItem.imageData.startsWith("data:image/png") ? "image/png" : "image/jpeg";

  const prompt = SCAN_PROMPTS[category] || SCAN_PROMPTS.wine;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: `${prompt}\n\nFor items where labels are partially obscured, do your best and set confidence lower.\nReturn ONLY a valid JSON array, no markdown code blocks or other text.` },
          ],
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "[]";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const bottles = JSON.parse(cleaned);

    if (!Array.isArray(bottles) || bottles.length === 0) {
      await prisma.scanItem.update({
        where: { id: pendingItem.id },
        data: { status: "rejected" },
      });
    } else if (bottles.length === 1) {
      const b = bottles[0];
      await prisma.scanItem.update({
        where: { id: pendingItem.id },
        data: {
          status: "analyzed",
          name: b.name || null, winery: b.winery || null,
          vintage: b.vintage ? parseInt(b.vintage) : null,
          varietal: b.varietal || null, region: b.region || null,
          country: b.country || null, color: b.color || null,
          description: b.description || null, foodPairings: b.foodPairings || null,
          onlineRating: b.onlineRating ? parseFloat(b.onlineRating) : null,
          confidence: b.confidence ? parseFloat(b.confidence) : null,
          quantity: b.quantity ? parseInt(b.quantity) : 1,
        },
      });
    } else {
      const [first, ...rest] = bottles;
      await prisma.scanItem.update({
        where: { id: pendingItem.id },
        data: {
          status: "analyzed", imageData: null,
          name: first.name || null, winery: first.winery || null,
          vintage: first.vintage ? parseInt(first.vintage) : null,
          varietal: first.varietal || null, region: first.region || null,
          country: first.country || null, color: first.color || null,
          description: first.description || null, foodPairings: first.foodPairings || null,
          onlineRating: first.onlineRating ? parseFloat(first.onlineRating) : null,
          confidence: first.confidence ? parseFloat(first.confidence) : null,
          quantity: first.quantity ? parseInt(first.quantity) : 1,
        },
      });

      if (rest.length > 0) {
        await prisma.scanItem.createMany({
          data: rest.map((b: Record<string, unknown>) => ({
            batchId: id, sourceIndex: pendingItem.sourceIndex,
            imageData: null, status: "analyzed",
            name: (b.name as string) || null, winery: (b.winery as string) || null,
            vintage: b.vintage ? parseInt(String(b.vintage)) : null,
            varietal: (b.varietal as string) || null, region: (b.region as string) || null,
            country: (b.country as string) || null, color: (b.color as string) || null,
            description: (b.description as string) || null, foodPairings: (b.foodPairings as string) || null,
            onlineRating: b.onlineRating ? parseFloat(String(b.onlineRating)) : null,
            confidence: b.confidence ? parseFloat(String(b.confidence)) : null,
            quantity: b.quantity ? parseInt(String(b.quantity)) : 1,
          })),
        });
      }
    }

    await prisma.scanBatch.update({
      where: { id },
      data: { processed: { increment: 1 } },
    });

    const batch = await prisma.scanBatch.findUnique({
      where: { id },
      include: { items: { orderBy: { id: "asc" } } },
    });

    return NextResponse.json({ done: false, batch });
  } catch (err) {
    await prisma.scanItem.update({
      where: { id: pendingItem.id },
      data: { status: "rejected" },
    });
    await prisma.scanBatch.update({
      where: { id },
      data: { processed: { increment: 1 } },
    });
    return NextResponse.json({
      done: false,
      error: err instanceof Error ? err.message : "Analysis failed",
    });
  }
}
