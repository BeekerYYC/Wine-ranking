import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { WINE_WITHOUT_PHOTO, idsWithPhoto } from "@/lib/wineSelect";

/**
 * Bottles opened but not yet rated, oldest first — the review queue.
 *
 * Returns an empty queue (not an error) when the review table doesn't exist
 * yet, e.g. on a preview build whose database hasn't been migrated, so the app
 * simply doesn't ask.
 */
export async function GET() {
  try {
    const pending = await prisma.pendingReview.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        logId: true,
        createdAt: true,
        log: { select: { wine: { select: WINE_WITHOUT_PHOTO } } },
      },
    });
    const withPhoto = await idsWithPhoto({ id: { in: pending.map((p) => p.log.wine.id) } });
    return NextResponse.json({
      reviews: pending.map((p) => ({
        logId: p.logId,
        openedAt: p.createdAt,
        wine: {
          id: p.log.wine.id,
          name: p.log.wine.name,
          winery: p.log.wine.winery,
          vintage: p.log.wine.vintage,
          color: p.log.wine.color,
          labelImageUrl: p.log.wine.labelImageUrl,
          hasImage: withPhoto.has(p.log.wine.id),
        },
      })),
    });
  } catch (err) {
    console.warn("Review queue unavailable:", err instanceof Error ? err.message : err);
    return NextResponse.json({ reviews: [] });
  }
}
