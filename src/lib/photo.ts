/**
 * Downscale a photo to a JPEG data URL small enough to upload.
 *
 * Vercel hard-rejects request bodies over ~4.2 MB with
 * 413 FUNCTION_PAYLOAD_TOO_LARGE (measured against production), and a raw phone
 * photo base64-encodes to several MB — so every upload path must resize first.
 *
 * Each upload screen used to carry its own copy of this function, none of which
 * handled failure: with no `onerror` on the FileReader or the Image, a file the
 * browser could not decode left the promise unresolved forever. The screen sat
 * on "Preparing photos..." with no error, no upload, and nothing in the log.
 * Every failure path here now rejects with something a user can act on.
 *
 * Two iPhone-specific hazards this has to survive:
 *
 *  - **HEIC.** iPhones shoot HEIC by default. Safari transcodes it to JPEG when
 *    a photo is chosen through a file input; Chrome on iOS hands over the
 *    original HEIC, which the decoder may refuse — the failure that reads as
 *    "I picked a photo and nothing happened".
 *  - **Very large photos.** A 48MP iPhone frame is ~8000x6000. Routing that
 *    through a data URL and an <img> costs a lot of memory, and iOS caps total
 *    canvas area — over the cap the draw silently yields a blank frame, so the
 *    upload succeeds and the AI is handed an empty picture.
 *
 * So the preferred path is createImageBitmap(file), which decodes off the main
 * thread straight from the Blob — no multi-megabyte base64 string, no
 * full-size canvas. The FileReader/<img> route stays as a fallback for browsers
 * without it.
 */
export const MAX_UPLOAD_BYTES = 4_000_000;

/** Below this, a JPEG of these dimensions can only be a blank frame. */
const MIN_PLAUSIBLE_BYTES = 2048;

function isHeic(file: File): boolean {
  return /image\/(heic|heif)/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

function decodeHint(file: File): string {
  if (isHeic(file)) {
    return "could not be decoded — it is an iPhone HEIC photo. Either open this page in Safari, " +
      "or set iPhone Settings > Camera > Formats to \"Most Compatible\" so photos are saved as JPEG";
  }
  return "could not be decoded — try re-saving it as a JPEG";
}

function fitWithin(width: number, height: number, maxSize: number) {
  if (width <= maxSize && height <= maxSize) return { width, height };
  const ratio = Math.min(maxSize / width, maxSize / height);
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

/** Draw an already-decoded source into a small canvas and encode it as JPEG. */
function encode(
  source: CanvasImageSource,
  srcWidth: number,
  srcHeight: number,
  maxSize: number,
  quality: number,
): string {
  if (!srcWidth || !srcHeight) throw new Error("the image has no dimensions");

  const { width, height } = fitWithin(srcWidth, srcHeight, maxSize);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("this browser would not provide a canvas");
  ctx.drawImage(source, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/jpeg", quality);

  if (dataUrl.length < MIN_PLAUSIBLE_BYTES) {
    throw new Error("it came out blank — too large for this browser to resize, try a smaller photo");
  }
  if (dataUrl.length > MAX_UPLOAD_BYTES) {
    throw new Error("it is still too large to upload after resizing");
  }
  return dataUrl;
}

/** Preferred path: decode straight from the Blob, no base64 and no big canvas. */
async function viaImageBitmap(file: File, maxSize: number, quality: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    return encode(bitmap, bitmap.width, bitmap.height, maxSize, quality);
  } finally {
    bitmap.close?.();
  }
}

/** Fallback for browsers without createImageBitmap. */
function viaImageElement(file: File, maxSize: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("could not be read from your device"));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("could not be read from your device"));
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error(decodeHint(file)));
      img.onload = () => {
        try {
          resolve(encode(img, img.naturalWidth, img.naturalHeight, maxSize, quality));
        } catch (e) {
          reject(e instanceof Error ? e : new Error("could not be processed"));
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export async function resizePhoto(file: File, maxSize = 1024, quality = 0.85): Promise<string> {
  const label = file.name || "photo";

  try {
    if (typeof createImageBitmap === "function") {
      try {
        return await viaImageBitmap(file, maxSize, quality);
      } catch (e) {
        // A decode refusal (e.g. HEIC) is worth one retry through the <img>
        // route, which occasionally supports formats createImageBitmap does not.
        // Genuine processing errors are rethrown by the fallback anyway.
        return await viaImageElement(file, maxSize, quality);
      }
    }
    return await viaImageElement(file, maxSize, quality);
  } catch (e) {
    throw new Error(`${label}: ${e instanceof Error ? e.message : "could not be processed"}`);
  }
}
