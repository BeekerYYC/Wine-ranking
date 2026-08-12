/**
 * Resolve the <img src> for a wine.
 *
 * List endpoints (/api/wines, /api/stats) deliberately do NOT inline the stored
 * base64 photo: a 1024px JPEG is ~175 KB of base64, so a cellar of ~25
 * photographed bottles pushed the JSON response past the 4.5 MB serverless
 * response limit and the whole list stopped loading. Those endpoints send a
 * `hasImage` flag instead and the bytes are served per-wine — and cached by the
 * browser — from /api/wines/[id]/image.
 *
 * Single-wine responses still inline `imageData`, so that is honoured first.
 */
export interface WineImageRef {
  id: number;
  hasImage?: boolean | null;
  imageData?: string | null;
  labelImageUrl?: string | null;
}

export function wineImageSrc(wine: WineImageRef): string | null {
  if (wine.imageData) return wine.imageData;
  if (wine.hasImage) return `/api/wines/${wine.id}/image`;
  return wine.labelImageUrl || null;
}

/** True when the wine has no usable image at all (own photo or found label). */
export function wineHasNoImage(wine: WineImageRef): boolean {
  return wineImageSrc(wine) === null;
}
