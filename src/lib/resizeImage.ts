/**
 * Shrink a photo in the browser and return it as a JPEG data URL.
 *
 * Rejects when the browser cannot decode the file (e.g. an iPhone HEIC photo
 * in Chrome on a computer). The earlier copies of this function had no error
 * handler, so an unreadable photo left the page on "Preparing photos..." forever.
 */
export function resizeImage(file: File, maxSize = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error(`Couldn't process ${file.name}`));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Couldn't open ${file.name}`));
    };
    img.src = url;
  });
}

/**
 * Resize several photos, keeping the ones that worked. `failed` counts the
 * photos the browser could not open, so the page can say so.
 */
export async function resizeImages(files: File[], maxSize?: number): Promise<{ photos: string[]; failed: number }> {
  const results = await Promise.allSettled(files.map((f) => resizeImage(f, maxSize)));
  const photos = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  return { photos, failed: results.length - photos.length };
}

export const UNREADABLE_PHOTO_MESSAGE =
  "couldn't be opened. Try a JPEG or PNG — on iPhone, Settings → Camera → Formats → Most Compatible.";
