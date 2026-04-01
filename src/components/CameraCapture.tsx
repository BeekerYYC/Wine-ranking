"use client";

import { useRef } from "react";

export default function CameraCapture({
  onCapture,
}: {
  onCapture: (dataUrl: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
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
          onCapture(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full border border-dashed border-border rounded-xl p-10 text-center hover:border-accent/40 hover:bg-accent-muted transition-all cursor-pointer group"
      >
        <div className="text-3xl mb-3 opacity-50 group-hover:opacity-80 transition-opacity">&#128247;</div>
        <p className="text-text-primary font-medium text-[15px]">
          Capture wine label
        </p>
        <p className="text-sm text-text-tertiary mt-1">
          Take a photo or choose from gallery
        </p>
      </button>
    </div>
  );
}
