"use client";

import { useState } from "react";
import WineBottlePlaceholder from "./WineBottlePlaceholder";
import { winePhotoSrc } from "@/lib/wineImage";

interface Props {
  /** Needed to load the photo from /api/wines/[id]/image when `hasImage` is set. */
  wineId?: number;
  /** List endpoints send this flag instead of the base64 blob. */
  hasImage?: boolean | null;
  imageData?: string | null;
  labelImageUrl?: string | null;
  alt: string;
  color?: string | null;
  className?: string;
  placeholderSize?: "sm" | "md" | "lg";
  fallbackEmoji?: string;
}

/**
 * Renders the user's uploaded photo if present, else the AI-found label image,
 * else a bottle placeholder. If a labelImageUrl is set but the remote image
 * fails to load (CORS, 404, hotlink-block), the onError handler swaps to the
 * placeholder instead of leaving the broken-image icon visible.
 */
export default function WineImage({
  wineId,
  hasImage,
  imageData,
  labelImageUrl,
  alt,
  color,
  className = "",
  placeholderSize = "sm",
  fallbackEmoji,
}: Props) {
  const [labelFailed, setLabelFailed] = useState(false);

  // Either an inlined base64 photo (single-wine responses) or this wine's own
  // photo endpoint (list responses).
  const photo = winePhotoSrc({ id: wineId, hasImage, imageData });
  const src = photo || (labelImageUrl && !labelFailed ? labelImageUrl : null);

  if (!src) {
    if (fallbackEmoji) {
      return <span className={`inline-flex items-center justify-center text-5xl opacity-40 ${className}`}>{fallbackEmoji}</span>;
    }
    return <WineBottlePlaceholder color={color} size={placeholderSize} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      // Only the remote URL can fail — our own photo endpoint is first-party.
      onError={() => {
        if (!photo && labelImageUrl) setLabelFailed(true);
      }}
    />
  );
}
