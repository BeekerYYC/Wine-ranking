import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params;
  const id = parseInt(batchId);

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  // Find next pending item
  const pendingItem = await prisma.scanItem.findFirst({
    where: { batchId: id, status: "pending" },
    orderBy: { sourceIndex: "asc" },
  });

  if (!pendingItem) {
    // All done — mark batch as reviewing
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
    // Skip items with no image
    await prisma.scanItem.update({
      where: { id: pendingItem.id },
      data: { status: "rejected" },
    });
    return NextResponse.json({ done: false, skipped: true });
  }

  const base64 = pendingItem.imageData.replace(/^data:image\/\w+;base64,/, "");
  const mediaType = pendingItem.imageData.startsWith("data:image/png") ? "image/png" : "image/jpeg";

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `Analyze this wine image. It may show a SINGLE bottle or MULTIPLE bottles (e.g. a wine fridge shelf/drawer).

If you see multiple distinct bottles, return a JSON array of objects.
If you see a single bottle, return a JSON array with one object.

Each object must have these fields:
- name: the wine name (string)
- winery: producer name (string or null)
- vintage: year (number or null)
- varietal: grape variety (string or null)
- region: wine region (string or null)
- country: country of origin (string or null)
- color: one of "red", "white", "rosé", "sparkling", "dessert", "orange"
- description: 1-2 sentences about the wine using your knowledge (string)
- foodPairings: 3-4 food pairing suggestions comma-separated (string)
- onlineRating: estimated critic/community score 0-100 (number or null)
- confidence: how confident you are in this identification, 0.0 to 1.0 (number)

For bottles where labels are partially obscured, do your best and set confidence lower.
Return ONLY a valid JSON array, no markdown code blocks or other text.`,
            },
          ],
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "[]";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const bottles = JSON.parse(cleaned);

    if (!Array.isArray(bottles) || bottles.length === 0) {
      // Couldn't detect any bottles
      await prisma.scanItem.update({
        where: { id: pendingItem.id },
        data: { status: "rejected" },
      });
    } else if (bottles.length === 1) {
      // Single bottle — update the existing item
      const b = bottles[0];
      await prisma.scanItem.update({
        where: { id: pendingItem.id },
        data: {
          status: "analyzed",
          name: b.name || null,
          winery: b.winery || null,
          vintage: b.vintage ? parseInt(b.vintage) : null,
          varietal: b.varietal || null,
          region: b.region || null,
          country: b.country || null,
          color: b.color || null,
          description: b.description || null,
          foodPairings: b.foodPairings || null,
          onlineRating: b.onlineRating ? parseFloat(b.onlineRating) : null,
          confidence: b.confidence ? parseFloat(b.confidence) : null,
        },
      });
    } else {
      // Multiple bottles from one photo — update first, create additional
      const [first, ...rest] = bottles;
      await prisma.scanItem.update({
        where: { id: pendingItem.id },
        data: {
          status: "analyzed",
          name: first.name || null,
          winery: first.winery || null,
          vintage: first.vintage ? parseInt(first.vintage) : null,
          varietal: first.varietal || null,
          region: first.region || null,
          country: first.country || null,
          color: first.color || null,
          description: first.description || null,
          foodPairings: first.foodPairings || null,
          onlineRating: first.onlineRating ? parseFloat(first.onlineRating) : null,
          confidence: first.confidence ? parseFloat(first.confidence) : null,
        },
      });

      // Create new ScanItems for additional bottles found
      if (rest.length > 0) {
        await prisma.scanItem.createMany({
          data: rest.map((b: Record<string, unknown>) => ({
            batchId: id,
            sourceIndex: pendingItem.sourceIndex,
            imageData: pendingItem.imageData, // same source photo
            status: "analyzed",
            name: (b.name as string) || null,
            winery: (b.winery as string) || null,
            vintage: b.vintage ? parseInt(String(b.vintage)) : null,
            varietal: (b.varietal as string) || null,
            region: (b.region as string) || null,
            country: (b.country as string) || null,
            color: (b.color as string) || null,
            description: (b.description as string) || null,
            foodPairings: (b.foodPairings as string) || null,
            onlineRating: b.onlineRating ? parseFloat(String(b.onlineRating)) : null,
            confidence: b.confidence ? parseFloat(String(b.confidence)) : null,
          })),
        });
      }
    }

    // Update batch progress
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
    // Mark as rejected on error, don't block the whole batch
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
