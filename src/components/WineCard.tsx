"use client";

import StarRating from "./StarRating";

const colorDot: Record<string, string> = {
  red: "bg-red-500",
  white: "bg-yellow-300",
  "rosé": "bg-pink-400",
  sparkling: "bg-sky-400",
  dessert: "bg-amber-500",
  orange: "bg-orange-400",
};

interface Wine {
  id: number;
  name: string;
  winery?: string | null;
  vintage?: number | null;
  varietal?: string | null;
  region?: string | null;
  country?: string | null;
  color?: string | null;
  price?: number | null;
  rating?: number | null;
  quantity?: number;
  status?: string;
  onlineRating?: number | null;
  imageData?: string | null;
}

export default function WineCard({
  wine,
  onQuickRate,
}: {
  wine: Wine;
  onQuickRate?: (id: number, rating: number) => void;
}) {
  return (
    <div className="group bg-surface-raised rounded-xl border border-border hover:border-accent/20 transition-all duration-200">
      <a href={`/wine/${wine.id}`} className="flex gap-4 p-4">
        {wine.imageData ? (
          <img
            src={wine.imageData}
            alt={wine.name}
            className="w-14 h-[72px] object-cover rounded-lg flex-shrink-0"
          />
        ) : (
          <div className="w-14 h-[72px] bg-surface-overlay rounded-lg flex-shrink-0 flex items-center justify-center text-text-tertiary text-xl">
            &#127863;
          </div>
        )}
        <div className="flex-1 min-w-0 py-0.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-[15px] text-text-primary truncate leading-snug">
                {wine.name}
              </h3>
              {wine.winery && (
                <p className="text-[13px] text-text-secondary truncate mt-0.5">{wine.winery}</p>
              )}
            </div>
            <div className="flex flex-col items-end flex-shrink-0 gap-1">
              {wine.vintage && (
                <span className="text-[13px] text-text-tertiary tabular-nums">{wine.vintage}</span>
              )}
              {wine.price != null && (
                <span className="text-[13px] font-medium text-text-secondary tabular-nums">
                  ${wine.price.toFixed(0)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            {wine.color && (
              <span className={`w-2.5 h-2.5 rounded-full ${colorDot[wine.color] || "bg-zinc-500"}`} title={wine.color} />
            )}
            {wine.varietal && (
              <span className="text-xs text-text-tertiary">{wine.varietal}</span>
            )}
            {wine.region && (
              <span className="text-xs text-text-tertiary opacity-60">· {wine.region}</span>
            )}
            {wine.status && wine.status !== "collection" && (
              <span className="text-[10px] uppercase tracking-wider text-accent font-medium ml-auto">{wine.status}</span>
            )}
            {(wine.quantity ?? 0) > 1 && (
              <span className="text-[10px] tabular-nums text-text-tertiary bg-surface-overlay rounded px-1.5 py-0.5 ml-auto">
                ×{wine.quantity}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            {wine.rating ? (
              <StarRating rating={wine.rating} readonly size="sm" />
            ) : (
              <span className="text-xs text-text-tertiary">Unrated</span>
            )}
            {wine.onlineRating && (
              <span className="text-[11px] text-accent font-medium tabular-nums">{wine.onlineRating}pts</span>
            )}
          </div>
        </div>
      </a>
      {onQuickRate && (
        <div className="border-t border-border px-4 py-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[11px] text-text-tertiary">Quick rate</span>
          <StarRating
            rating={wine.rating || 0}
            size="sm"
            onChange={(r) => onQuickRate(wine.id, r)}
          />
        </div>
      )}
    </div>
  );
}
