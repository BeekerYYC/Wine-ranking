"use client";

import StarRating from "./StarRating";

const colorBadge: Record<string, string> = {
  red: "bg-red-900/80 text-red-200 border border-red-800/50",
  white: "bg-yellow-900/40 text-yellow-200 border border-yellow-700/30",
  "rosé": "bg-pink-900/60 text-pink-200 border border-pink-800/40",
  sparkling: "bg-sky-900/50 text-sky-200 border border-sky-700/30",
  dessert: "bg-amber-900/50 text-amber-200 border border-amber-800/40",
  orange: "bg-orange-900/50 text-orange-200 border border-orange-800/40",
};

const statusBadge: Record<string, string> = {
  collection: "",
  wishlist: "bg-grape-900/50 text-grape-300 border border-grape-700/40",
  consumed: "bg-stone-800/50 text-stone-400 border border-stone-700/40",
  restaurant: "bg-amber-900/40 text-amber-300 border border-amber-700/30",
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
    <div className="block bg-wine-900/40 backdrop-blur-sm rounded-xl border border-wine-800/40 hover:border-wine-700/60 hover:bg-wine-900/60 transition-all overflow-hidden">
      <a href={`/wine/${wine.id}`} className="flex gap-4 p-4">
        {wine.imageData ? (
          <img
            src={wine.imageData}
            alt={wine.name}
            className="w-16 h-20 object-cover rounded-lg flex-shrink-0 border border-wine-800/30"
          />
        ) : (
          <div className="w-16 h-20 bg-wine-800/40 rounded-lg flex-shrink-0 flex items-center justify-center text-2xl border border-wine-800/30">
            🍷
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-stone-100 truncate">
              {wine.name}
            </h3>
            {wine.vintage && (
              <span className="text-sm text-wine-400 flex-shrink-0">
                {wine.vintage}
              </span>
            )}
          </div>
          {wine.winery && (
            <p className="text-sm text-wine-300 truncate">{wine.winery}</p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {wine.color && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorBadge[wine.color] || "bg-stone-800 text-stone-300"}`}
              >
                {wine.color}
              </span>
            )}
            {wine.status && wine.status !== "collection" && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[wine.status] || ""}`}>
                {wine.status}
              </span>
            )}
            {wine.varietal && (
              <span className="text-xs text-wine-400">{wine.varietal}</span>
            )}
            {wine.region && (
              <span className="text-xs text-wine-500">· {wine.region}</span>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              {wine.rating ? (
                <StarRating rating={wine.rating} readonly size="sm" />
              ) : (
                <span className="text-xs text-wine-600">Not rated</span>
              )}
              {wine.onlineRating && (
                <span className="text-xs text-grape-400 font-medium">{wine.onlineRating}pts</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {(wine.quantity ?? 0) > 1 && (
                <span className="text-xs bg-wine-800/60 text-wine-300 px-2 py-0.5 rounded-full">
                  ×{wine.quantity}
                </span>
              )}
              {wine.price != null && (
                <span className="text-sm font-medium text-wine-300">
                  ${wine.price.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>
      </a>
      {/* Quick rate bar */}
      {onQuickRate && (
        <div className="border-t border-wine-800/30 px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-wine-500">Quick rate:</span>
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
