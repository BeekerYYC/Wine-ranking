/**
 * Downscale a photo to a JPEG data URL small enough to upload.
 *
 * Vercel hard-rejects request bodies over ~4.2 MB with
 * 413 FUNCTION_PAYLOAD_TOO_LARGE (measured against production), and a raw phone
 * photo base64-encodes to several MB — so every upload path must resize first.
 *
 * Each upload screen used to carry its own copy of this function, none of which
 * handled failure: with no `onerror` on the FileReader or the Image, a file the
 * browser could not decode (HEIC outside Safari, a truncated file, a video
 * mislabelled as an image) left the promise unresolved forever. The screen sat
 * on "Preparing photos..." with no error, no upload, and nothing in the log.
 * Every failure path here now rejects with something a user can act on.
 */
export const MAX_UPLOAD_BYTES = 4_000_000;

export function resizePhoto(file: File, maxSize = 1024, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const label = file.name || "photo";
    const fail = (msg: string) => reject(new Error(`${label}: ${msg}`));

    const reader = new FileReader();
    reader.onerror = () => fail("could not be read from your device");
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        fail("could not be read from your device");
        return;
      }

      const img = new Image();
      img.onerror = () => fail("could not be decoded — try re-saving it as a JPEG");
      img.onload = () => {
        try {
          let { width, height } = img;
          if (!width || !height) throw new Error("the image has no dimensions");

          if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("this browser would not provide a canvas");
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL("image/jpeg", quality);

          // iOS Safari caps total canvas area and silently produces a blank
          // canvas for very large photos. The result is a valid but empty JPEG
          // that the AI cannot read, which looks like a scan that found nothing.
          // A blank frame at this size compresses to almost nothing.
          if (dataUrl.length < 2048) {
            throw new Error("it came out blank — too large for this browser to resize, try a smaller photo");
          }
          if (dataUrl.length > MAX_UPLOAD_BYTES) {
            throw new Error("it is still too large to upload after resizing");
          }

          resolve(dataUrl);
        } catch (e) {
          fail(e instanceof Error ? e.message : "could not be processed");
        }
      };
      img.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}
