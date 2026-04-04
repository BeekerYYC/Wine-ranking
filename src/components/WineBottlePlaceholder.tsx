"use client";

import { useCategory } from "@/lib/CategoryContext";

const defaultStyle = { bg: "bg-surface-overlay", fill: "text-text-muted", label: "text-text-muted" };

export default function WineBottlePlaceholder({
  color,
  size = "md",
  name,
}: {
  color?: string | null;
  size?: "sm" | "md" | "lg";
  name?: string | null;
}) {
  const { config } = useCategory();
  const typeEntry = config.types.find((t) => t.value === color);
  const dotColor = typeEntry?.dotColor || "#6b665e";

  const sizeClass = size === "sm" ? "w-12 h-16" : size === "lg" ? "w-full h-28" : "w-14 h-[72px]";
  const iconSize = size === "sm" ? 16 : size === "lg" ? 28 : 20;

  const style = typeEntry
    ? { bg: `bg-[${dotColor}]/10`, fill: `text-[${dotColor}]`, label: `text-[${dotColor}]/70` }
    : defaultStyle;

  return (
    <div
      className={`${sizeClass} rounded-lg flex flex-col items-center justify-center gap-1 overflow-hidden`}
      style={{ backgroundColor: typeEntry ? `${dotColor}15` : undefined }}
    >
      {config.placeholderType === "bottle" ? (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" style={{ color: dotColor }}>
          <path d="M9 2h6v3a1 1 0 01-.2.6L13 8v3a4 4 0 011 2.65V20a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6.35A4 4 0 0111 11V8L9.2 5.6A1 1 0 019 5V2z" fill="currentColor" opacity={0.5} />
          <path d="M9 2h6v3a1 1 0 01-.2.6L13 8v3a4 4 0 011 2.65V20a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6.35A4 4 0 0111 11V8L9.2 5.6A1 1 0 019 5V2z" stroke="currentColor" strokeWidth={1} fill="none" />
        </svg>
      ) : config.placeholderType === "bag" ? (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" style={{ color: dotColor }}>
          <rect x="5" y="4" width="14" height="16" rx="2" fill="currentColor" opacity={0.5} />
          <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" strokeWidth={1} fill="none" />
          <path d="M8 4V2h8v2" stroke="currentColor" strokeWidth={1} />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={0.8} fill="none" opacity={0.6} />
        </svg>
      ) : (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" style={{ color: dotColor }}>
          <rect x="6" y="3" width="12" height="18" rx="3" fill="currentColor" opacity={0.5} />
          <rect x="6" y="3" width="12" height="18" rx="3" stroke="currentColor" strokeWidth={1} fill="none" />
          <path d="M6 7h12" stroke="currentColor" strokeWidth={0.8} opacity={0.6} />
          <path d="M9 7V4" stroke="currentColor" strokeWidth={0.8} opacity={0.4} />
        </svg>
      )}
      {name && size === "lg" && (
        <span className="text-[9px] font-medium truncate max-w-[90%] text-center px-1" style={{ color: `${dotColor}B3` }}>
          {name}
        </span>
      )}
    </div>
  );
}
