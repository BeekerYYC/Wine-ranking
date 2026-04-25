"use client";

import StarRating from "./StarRating";
import WineBottlePlaceholder from "./WineBottlePlaceholder";
import { useCategory } from "@/lib/CategoryContext";

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
  confidence?: number | null;
  consumedAt?: string | null;
  imageData?: string | null;
  labelImageUrl?: string | null;
}

export default function WineCard({
  wine,
  onQuickRate,
  onQuickConsume,
}: {
  wine: Wine;
  onQuickRate?: (id: number, rating: number) => void;
  onQuickConsume?: (id: number) => void;
}) {
  const { config } = useCategory();
  const typeEntry = config.types.find((t) => t.value === wine.color);
  const dotColor = typeEntry?.dotColor || "#4a4640";

  return (
    <div className="group relative bg-surface-raised hover:bg-surface-overlay rounded-xl border border-border-subtle hover:border-border transition-all duration-200">
      <a href={`/wine/${wine.id}`} className="flex gap-3.5 p-3.5">
        {/* Image: prefer user photo, fall back to AI-found label, then placeholder */}
        {wine.imageData || wine.labelImageUrl ? (
          <img
            src={wine.imageData || wine.labelImageUrl || ""}
            alt={wine.name}
            className="w-12 h-16 object-cover rounded-lg flex-shrink-0"
          />
        ) : (
          <div className="flex-shrink-0">
            <WineBottlePlaceholder color={wine.color} size="sm" />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0 py-0.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-[14px] text-text-primary truncate leading-tight">
                {wine.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                {wine.winery && (
                  <span className="text-[12px] text-text-secondary truncate">{wine.winery}</span>
                )}
                {wine.vintage && (
                  <span className="text-[12px] text-text-tertiary tabular-nums">· {wine.vintage}</span>
                )}
              </div>
            </div>
            {wine.price != null && (
              <span className="text-[13px] font-semibold text-text-secondary tabular-nums flex-shrink-0">
                ${wine.price.toFixed(0)}
              </span>
            )}
          </div>

          {/* Bottom row */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              {wine.color && (
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} title={wine.color} />
              )}
              {wine.varietal && (
                <span className="text-[11px] text-text-tertiary">{wine.varietal}</span>
              )}
              {wine.status && wine.status !== "collection" && (
                <span className="text-[10px] uppercase tracking-wider text-gold font-medium bg-gold-muted px-1.5 py-0.5 rounded">
                  {wine.status}
                </span>
              )}
              {wine.consumedAt && (
                <span className="text-[10px] text-text-muted tabular-nums">
                  {new Date(wine.consumedAt).toLocaleDateString()}
                </span>
              )}
              {(wine.quantity ?? 0) > 1 && (
                <span className="text-[10px] tabular-nums text-text-tertiary bg-surface-overlay rounded px-1.5 py-0.5">
                  ×{wine.quantity}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {wine.confidence != null && (
                <span className={`text-[10px] font-medium tabular-nums px-1.5 py-0.5 rounded ${
                  wine.confidence >= 0.8 ? "text-success bg-success-muted" : wine.confidence >= 0.5 ? "text-gold bg-gold-muted" : "text-danger bg-danger-muted"
                }`}>{Math.round(wine.confidence * 100)}%</span>
              )}
              {wine.onlineRating && (
                <span className="text-[11px] text-gold font-semibold tabular-nums">{wine.onlineRating}</span>
              )}
              {wine.rating ? (
                <StarRating rating={wine.rating} readonly size="sm" />
              ) : (
                <span className="text-[11px] text-text-muted">No rating</span>
              )}
            </div>
          </div>
        </div>
      </a>

      {/* Quick actions strip */}
      {(onQuickRate || onQuickConsume) && (
        <div className="border-t border-border-subtle px-3.5 py-1.5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {onQuickConsume && (wine.quantity ?? 0) > 0 && wine.status !== "consumed" ? (
            <button
              onClick={(e) => { e.preventDefault(); onQuickConsume(wine.id); }}
              className="text-[11px] text-gold hover:text-gold-light font-medium transition-colors flex items-center gap-1"
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Drank this
            </button>
          ) : (
            <span className="text-[11px] text-text-muted">Quick rate</span>
          )}
          {onQuickRate && (
            <StarRating
              rating={wine.rating || 0}
              size="sm"
              onChange={(r) => onQuickRate(wine.id, r)}
            />
          )}
        </div>
      )}
    </div>
  );
}
