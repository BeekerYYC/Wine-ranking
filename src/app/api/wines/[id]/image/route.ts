import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Serve a wine's stored photo as real image bytes.
 *
 * List endpoints send a `hasImage` flag instead of the base64 blob (see
 * src/lib/wineImage.ts), so cards point at this route. Images are immutable for
 * a given `updatedAt`, so an ETag lets the browser skip the download entirely on
 * subsequent cellar visits.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wineId = parseInt(id);
  if (!Number.isFinite(wineId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const wine = await prisma.wine.findUnique({
    where: { id: wineId },
    select: { imageData: true, updatedAt: true },
  });

  if (!wine?.imageData) {
    return NextResponse.json({ error: "No image for this wine" }, { status: 404 });
  }

  // [\s\S] rather than the /s flag — the project targets ES2017.
  const match = wine.imageData.match(/^data:(image\/[\w+.-]+);base64,([\s\S]*)$/);
  if (!match) {
    return NextResponse.json({ error: "Stored image is not a base64 data URL" }, { status: 415 });
  }

  const [, mediaType, base64] = match;
  const etag = `"w${wineId}-${wine.updatedAt.getTime()}"`;

  if (req.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  const bytes = new Uint8Array(Buffer.from(base64, "base64"));

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": mediaType,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
      ETag: etag,
    },
  });
}
