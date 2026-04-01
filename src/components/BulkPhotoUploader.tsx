"use client";

import { useRef, useState } from "react";

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 1024;
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function BulkPhotoUploader({
  onPhotosReady,
  disabled,
}: {
  onPhotosReady: (photos: string[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setProcessing(true);
    const resized = await Promise.all(files.map(resizeImage));
    setPhotos((prev) => [...prev, ...resized]);
    setProcessing(false);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
          {photos.map((photo, i) => (
            <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border-subtle">
              <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-bg/80 text-text-secondary flex items-center justify-center text-xs hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
              <div className="absolute bottom-1 left-1 text-[10px] bg-bg/70 text-text-secondary px-1 rounded">{i + 1}</div>
            </div>
          ))}

          {/* Add more button */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-lg border border-dashed border-border hover:border-gold/40 flex items-center justify-center hover:bg-gold-subtle transition-all"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-text-muted">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      )}

      {/* Empty state */}
      {photos.length === 0 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={processing}
          className="w-full border border-dashed border-border hover:border-gold/40 rounded-xl p-8 text-center hover:bg-gold-subtle transition-all cursor-pointer group"
        >
          <div className="w-14 h-14 rounded-2xl bg-gold-muted flex items-center justify-center mx-auto mb-3 group-hover:bg-gold/20 transition-colors">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-gold">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
          </div>
          <p className="text-[14px] font-semibold text-text-primary group-hover:text-gold transition-colors">
            Select photos of your wine fridge
          </p>
          <p className="text-[12px] text-text-muted mt-1">
            Snap each drawer or individual bottles — AI will identify them all
          </p>
        </button>
      )}

      {processing && (
        <p className="text-[12px] text-text-tertiary text-center mt-2">Preparing photos...</p>
      )}

      {/* Start scan button */}
      {photos.length > 0 && (
        <button
          type="button"
          onClick={() => onPhotosReady(photos)}
          disabled={disabled || processing}
          className="w-full bg-gold/90 hover:bg-gold disabled:opacity-30 text-bg py-3 rounded-lg text-[14px] font-semibold transition-all"
        >
          Scan {photos.length} photo{photos.length !== 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}
