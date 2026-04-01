"use client";

const colorStyles: Record<string, { bg: string; fill: string; label: string }> = {
  red:       { bg: "bg-wine-red/10",      fill: "text-wine-red",       label: "text-wine-red/70" },
  white:     { bg: "bg-wine-white/10",     fill: "text-wine-white",     label: "text-wine-white/70" },
  "rosé":    { bg: "bg-wine-rose/10",      fill: "text-wine-rose",      label: "text-wine-rose/70" },
  sparkling: { bg: "bg-wine-sparkling/10", fill: "text-wine-sparkling", label: "text-wine-sparkling/70" },
  dessert:   { bg: "bg-wine-dessert/10",   fill: "text-wine-dessert",   label: "text-wine-dessert/70" },
  orange:    { bg: "bg-wine-orange/10",    fill: "text-wine-orange",    label: "text-wine-orange/70" },
};

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
  const style = colorStyles[color || ""] || defaultStyle;
  const sizeClass = size === "sm" ? "w-12 h-16" : size === "lg" ? "w-full h-28" : "w-14 h-[72px]";
  const iconSize = size === "sm" ? 16 : size === "lg" ? 28 : 20;

  return (
    <div className={`${sizeClass} ${style.bg} rounded-lg flex flex-col items-center justify-center gap-1 overflow-hidden`}>
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" className={style.fill}>
        {/* Wine bottle silhouette */}
        <path
          d="M9 2h6v3a1 1 0 01-.2.6L13 8v3a4 4 0 011 2.65V20a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6.35A4 4 0 0111 11V8L9.2 5.6A1 1 0 019 5V2z"
          fill="currentColor"
          opacity={0.5}
        />
        <path
          d="M9 2h6v3a1 1 0 01-.2.6L13 8v3a4 4 0 011 2.65V20a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6.35A4 4 0 0111 11V8L9.2 5.6A1 1 0 019 5V2z"
          stroke="currentColor"
          strokeWidth={1}
          fill="none"
        />
      </svg>
      {name && size === "lg" && (
        <span className={`text-[9px] font-medium ${style.label} truncate max-w-[90%] text-center px-1`}>
          {name}
        </span>
      )}
    </div>
  );
}
