/**
 * Where a bottle sits in a photo, so a drawer photo can be cropped down to the
 * one wine it is attached to.
 *
 * A whole-drawer photo was being saved on every bottle identified in it, which
 * made it useless for finding a particular bottle. Claude now marks a box
 * around one clearly visible bottle of each wine, and the photo is cropped to
 * it. Used on the server (scan processing, with sharp) and in the browser (the
 * audit, with a canvas), so this file has no dependencies.
 */

/** A region as fractions (0–1) of the photo's width and height. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The rectangle Claude reports, in the photo's own pixel coordinates. */
export interface PixelBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Instruction text for the box field, given the size of the photo Claude sees. */
export function boxInstruction(width: number, height: number): string {
  return `- box: the rectangle around ONE clearly visible bottle of this wine — the one whose label is most legible — as {x0, y0, x1, y1} in this image's pixel coordinates (the image is ${width}×${height} pixels, origin at the top-left). Include the whole label. Use null if you cannot point to it.`;
}

/** Convert Claude's pixel box to fractions, or null if it is unusable. */
export function toFractionBox(px: PixelBox | null | undefined, width: number, height: number): Box | null {
  if (!px || !width || !height) return null;
  const x0 = Math.max(0, Math.min(px.x0, px.x1));
  const y0 = Math.max(0, Math.min(px.y0, px.y1));
  const x1 = Math.min(width, Math.max(px.x0, px.x1));
  const y1 = Math.min(height, Math.max(px.y0, px.y1));
  // A sliver can't show a label; treat it as no box rather than crop to it.
  if (x1 - x0 < width * 0.03 || y1 - y0 < height * 0.03) return null;
  return { x: x0 / width, y: y0 / height, w: (x1 - x0) / width, h: (y1 - y0) / height };
}

/** Is this a usable fraction box (e.g. one that came back from the client)? */
export function isBox(v: unknown): v is Box {
  if (!v || typeof v !== "object") return false;
  const b = v as Record<string, unknown>;
  return [b.x, b.y, b.w, b.h].every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1)
    && (b.w as number) > 0 && (b.h as number) > 0;
}

/**
 * The pixel region to cut out for `box`, padded so a slightly-off box still
 * shows the whole label, or null when cropping wouldn't help because the
 * bottle already fills most of the photo.
 */
export function cropRegion(box: Box, width: number, height: number) {
  if (box.w * box.h > 0.6) return null;
  const padX = Math.max(box.w * width * 0.12, 12);
  const padY = Math.max(box.h * height * 0.12, 12);
  const left = Math.max(0, Math.floor(box.x * width - padX));
  const top = Math.max(0, Math.floor(box.y * height - padY));
  const right = Math.min(width, Math.ceil((box.x + box.w) * width + padX));
  const bottom = Math.min(height, Math.ceil((box.y + box.h) * height + padY));
  if (right - left < 8 || bottom - top < 8) return null;
  return { left, top, width: right - left, height: bottom - top };
}
