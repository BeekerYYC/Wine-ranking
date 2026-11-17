import sharp from "sharp";
import { Box, cropRegion } from "@/lib/box";

/** Server-side photo cropping. The browser-side equivalent is cropPhoto() in lib/photo.ts. */

function bytesOf(dataUrl: string): Buffer | null {
  const match = dataUrl.match(/^data:image\/[\w+.-]+;base64,([\s\S]*)$/);
  return match ? Buffer.from(match[1], "base64") : null;
}

/** Pixel size of a data-URL photo, or null if it can't be read. */
export async function imageSize(dataUrl: string): Promise<{ width: number; height: number } | null> {
  const bytes = bytesOf(dataUrl);
  if (!bytes) return null;
  try {
    const meta = await sharp(bytes).metadata();
    return meta.width && meta.height ? { width: meta.width, height: meta.height } : null;
  } catch {
    return null;
  }
}

/**
 * Crop a photo to the bottle in `box` and return it as a JPEG data URL. Null
 * when cropping isn't possible or wouldn't help, so callers fall back to the
 * full photo.
 */
export async function cropToBox(dataUrl: string, box: Box, maxSize = 800): Promise<string | null> {
  const bytes = bytesOf(dataUrl);
  if (!bytes) return null;
  try {
    const image = sharp(bytes);
    const meta = await image.metadata();
    if (!meta.width || !meta.height) return null;
    const region = cropRegion(box, meta.width, meta.height);
    if (!region) return null;
    const out = await image
      .extract(region)
      .resize({ width: maxSize, height: maxSize, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return null;
  }
}
