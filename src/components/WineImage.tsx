"use client";

import { useState } from "react";
import WineBottlePlaceholder from "./WineBottlePlaceholder";

interface Props {
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
  imageData,
  labelImageUrl,
  alt,
  color,
  className = "",
  placeholderSize = "sm",
  fallbackEmoji,
}: Props) {
  const [labelFailed, setLabelFailed] = useState(false);

  const src = imageData || (labelImageUrl && !labelFailed ? labelImageUrl : null);

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
      // Only the remote URL can fail — base64 imageData always loads.
      onError={() => {
        if (!imageData && labelImageUrl) setLabelFailed(true);
      }}
    />
  );
}
