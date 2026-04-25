"use client";

import { useEffect, useMemo, useState } from "react";
import { useCategory } from "@/lib/CategoryContext";
import ConsumeModal from "@/components/ConsumeModal";

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
  quantity: number;
  status?: string;
  imageData?: string | null;
  labelImageUrl?: string | null;
  onlineRating?: number | null;
  drinkingWindow?: string | null;
  criticReviews?: string | null;
}

const COLOR_DOTS: Record<string, string> = {
  red: "#b73a5e",
  white: "#e8dca0",
  "rosé": "#d4849a",
  rose: "#d4849a",
  sparkling: "#c8b88e",
  dessert: "#d4a44e",
  orange: "#d48a4e",
};

// Try to extract a critic score (e.g. "92 WS") from criticReviews field.
function extractTopScore(criticReviews?: string | null): { score: number; source: string } | null {
  if (!criticReviews) return null;
  // Match patterns like "Wine Spectator: 91" or "Robert Parker: 93"
  const match = criticReviews.match(/([A-Za-z .]+?):\s*(\d{2,3})(?!\d)/);
  if (!match) return null;
  const source = match[1].trim();
  const score = parseInt(match[2], 10);
  if (score < 50 || score > 100) return null;
  // Map to short label
  const lower = source.toLowerCase();
  let abbr = "";
  if (lower.includes("spectator")) abbr = "WS";
  else if (lower.includes("parker")) abbr = "RP";
  else if (lower.includes("suckling")) abbr = "JS";
  else if (lower.includes("decanter")) abbr = "DC";
  else if (lower.includes("enthusiast")) abbr = "WE";
  else if (lower.includes("vivino")) abbr = "VV";
  else if (lower.includes("robinson") || lower.includes("jancis")) abbr = "JR";
  else abbr = source.slice(0, 2).toUpperCase();
  return { score, source: abbr };
}

export default function FridgePage() {
  const { config } = useCategory();
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [colorFilter, setColorFilter] = useState<string>("");
  const [sort, setSort] = useState<"createdAt" | "rating" | "name">("createdAt");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [consumeWine, setConsumeWine] = useState<Wine | null>(null);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const fetchWines = () => {
    setLoading(true);
    fetch(`/api/wines?status=collection&sort=${sort}&order=${sort === "name" ? "asc" : "desc"}`)
      .then((r) => r.json())
      .then((data: Wine[]) => setWines(data.filter((w) => w.quantity > 0)))
      .finally(() => setLoading(false));
  };

  useEffect(fetchWines, [sort]);

  const filtered = useMemo(() => {
    return wines.filter((w) => {
      if (colorFilter && w.color !== colorFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const text = `${w.name} ${w.winery ?? ""} ${w.varietal ?? ""} ${w.region ?? ""}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [wines, colorFilter, search]);

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: wines.length };
    config.types.forEach((t) => {
      result[t.value] = wines.filter((w) => w.color === t.value).length;
    });
    return result;
  }, [wines, config.types]);

  const totalBottles = wines.reduce((s, w) => s + w.quantity, 0);

  const handleConsume = async (data: { rating?: number; notes?: string }) => {
    if (!consumeWine) return;
    await fetch(`/api/wines/${consumeWine.id}/consume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setConsumeWine(null);
    fetchWines();
  };

  // Filter pills - show top types
  const topTypes = config.types.slice(0, 3);

  return (
    <div className="space-y-4 pb-2">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-serif text-[28px] sm:text-[34px] font-semibold leading-tight">My {config.fridgeLabel}</h1>
            <span className="bg-gold-muted text-gold border border-gold/20 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tabular-nums">
              {totalBottles} Bottle{totalBottles !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-[13px] text-text-tertiary mt-1">Your curated collection ready to enjoy.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${
              showSearch ? "bg-gold-muted border-gold/30 text-gold" : "bg-surface-raised border-border-subtle text-text-tertiary hover:text-text-secondary"
            }`}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button className="w-10 h-10 rounded-xl bg-surface-raised border border-border-subtle flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M7 12h10M10 18h4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <input
          autoFocus
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${config.itemNamePlural}...`}
          className="w-full px-4 py-2.5 rounded-xl bg-surface-raised border border-border-subtle text-[13px] text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/20 transition-all"
        />
      )}

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
        <FilterPill
          label="All"
          count={counts.all}
          active={!colorFilter}
          onClick={() => setColorFilter("")}
        />
        {topTypes.map((t) => (
          <FilterPill
            key={t.value}
            label={t.label}
            count={counts[t.value] || 0}
            dotColor={t.dotColor}
            active={colorFilter === t.value}
            onClick={() => setColorFilter(colorFilter === t.value ? "" : t.value)}
          />
        ))}
        {config.types.length > 3 && config.types.slice(3).map((t) => (
          <FilterPill
            key={t.value}
            label={t.label}
            count={counts[t.value] || 0}
            dotColor={t.dotColor}
            active={colorFilter === t.value}
            onClick={() => setColorFilter(colorFilter === t.value ? "" : t.value)}
          />
        ))}
      </div>

      {/* Sort + view */}
      <div className="flex items-center justify-between bg-surface-raised border border-border-subtle rounded-xl px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-muted">Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "createdAt" | "rating" | "name")}
            className="bg-transparent text-[12px] font-medium text-text-primary focus:outline-none cursor-pointer"
          >
            <option value="createdAt">Recently Added</option>
            <option value="rating">Top Rated</option>
            <option value="name">Name</option>
          </select>
        </div>
        <div className="flex gap-0.5 bg-surface-overlay rounded-md p-0.5">
          <button
            onClick={() => setView("grid")}
            className={`p-1.5 rounded transition-all ${view === "grid" ? "bg-gold-muted text-gold" : "text-text-muted"}`}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h6v6H4zM14 5h6v6h-6zM4 13h6v6H4zM14 13h6v6h-6z" />
            </svg>
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-1.5 rounded transition-all ${view === "list" ? "bg-gold-muted text-gold" : "text-text-muted"}`}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-pulse">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-72 bg-surface-raised rounded-2xl" />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gold-muted flex items-center justify-center mx-auto mb-4 text-3xl">
            {config.icon}
          </div>
          <h2 className="font-serif text-[20px] font-semibold mb-1">
            {wines.length === 0 ? `${config.fridgeLabel} is empty` : "No matches"}
          </h2>
          <p className="text-[13px] text-text-tertiary mb-5">
            {wines.length === 0 ? `Scan your ${config.itemNamePlural} to stock up` : "Try a different filter"}
          </p>
          {wines.length === 0 && (
            <a href="/fridge/scan" className="inline-flex items-center gap-2 bg-gradient-to-br from-gold to-gold-light text-bg px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all shadow-lg shadow-gold/20">
              {config.scanLabel}
            </a>
          )}
        </div>
      )}

      {/* Grid view */}
      {!loading && filtered.length > 0 && view === "grid" && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((wine) => (
            <PremiumWineCard
              key={wine.id}
              wine={wine}
              onConsume={() => setConsumeWine(wine)}
            />
          ))}
        </div>
      )}

      {/* List view */}
      {!loading && filtered.length > 0 && view === "list" && (
        <div className="space-y-2">
          {filtered.map((wine) => (
            <ListWineCard
              key={wine.id}
              wine={wine}
              onConsume={() => setConsumeWine(wine)}
            />
          ))}
        </div>
      )}

      {consumeWine && (
        <ConsumeModal wine={consumeWine} onConfirm={handleConsume} onClose={() => setConsumeWine(null)} />
      )}
    </div>
  );
}

function FilterPill({ label, count, dotColor, active, onClick }: { label: string; count: number; dotColor?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12.5px] font-medium whitespace-nowrap transition-all border ${
        active
          ? "bg-gold-muted border-gold/30 text-gold"
          : "bg-surface-raised border-border-subtle text-text-secondary hover:border-border"
      }`}
    >
      {dotColor && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />}
      {!dotColor && <BottleMicro />}
      <span>{label}</span>
      <span className={`text-[11px] tabular-nums px-1.5 py-0.5 rounded ${active ? "bg-gold/20 text-gold" : "text-text-muted"}`}>{count}</span>
    </button>
  );
}

const BottleMicro = () => (
  <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 2h6v3a3 3 0 002 3v11a3 3 0 01-3 3h-4a3 3 0 01-3-3V8a3 3 0 002-3V2z" />
  </svg>
);

function PremiumWineCard({ wine, onConsume }: { wine: Wine; onConsume: () => void }) {
  const score = extractTopScore(wine.criticReviews) || (wine.onlineRating ? { score: Math.round(wine.onlineRating), source: "AI" } : null);
  const dotColor = wine.color ? COLOR_DOTS[wine.color] : null;

  return (
    <div className="relative bg-surface-raised border border-border-subtle hover:border-gold/30 rounded-2xl overflow-hidden transition-all group">
      <a href={`/wine/${wine.id}`} className="block p-3.5">
        {/* Top row: bottle image + actions */}
        <div className="relative h-[140px] -mx-1 mb-3 flex items-center justify-center">
          {wine.imageData || wine.labelImageUrl ? (
            <img
              src={wine.imageData || wine.labelImageUrl || ""}
              alt={wine.name}
              className="h-full object-contain drop-shadow-lg"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <BottleSilhouette color={dotColor} />
          )}
          <button
            onClick={(e) => { e.preventDefault(); /* favorite toggle - placeholder */ }}
            className="absolute top-0 right-0 w-7 h-7 rounded-full bg-bg/60 backdrop-blur-sm flex items-center justify-center text-text-muted hover:text-pink transition-colors"
            aria-label="Favorite"
          >
            <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>
        </div>

        {/* Name (serif) */}
        <h3 className="font-serif text-[15px] font-semibold text-text-primary leading-tight line-clamp-2 mb-1">
          {wine.winery ? `${wine.winery}` : wine.name}
        </h3>
        {wine.winery && wine.name !== wine.winery && (
          <p className="text-[11px] text-text-secondary line-clamp-1 mb-1">{wine.name}</p>
        )}

        {/* Region · vintage */}
        <p className="text-[11px] text-text-tertiary mb-2">
          {[wine.region, wine.country].filter(Boolean).join(", ")}{wine.vintage && ` · ${wine.vintage}`}
        </p>

        {/* Score badge */}
        {score && (
          <div className="inline-flex items-center bg-pink-muted border border-pink/20 rounded-md px-2 py-0.5 mb-2">
            <span className="text-[12px] font-bold text-pink tabular-nums">{score.score}</span>
            <span className="text-[9px] text-pink/70 ml-1 font-medium tracking-wider">{score.source}</span>
          </div>
        )}

        {/* Varietal tag */}
        {wine.varietal && (
          <div className="flex items-center gap-1 text-[11px] text-text-secondary mb-2">
            <svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24" className="text-gold">
              <circle cx="8" cy="10" r="2" /><circle cx="12" cy="10" r="2" /><circle cx="16" cy="10" r="2" />
              <circle cx="10" cy="14" r="2" /><circle cx="14" cy="14" r="2" /><circle cx="12" cy="18" r="2" />
              <path d="M11 4l1 4 1-4" stroke="currentColor" strokeWidth="1" fill="none" />
            </svg>
            <span className="truncate">{wine.varietal}</span>
          </div>
        )}

        {/* Drink window */}
        {(wine.drinkingWindow || wine.quantity > 0) && (
          <div className="flex items-center gap-1.5 text-[11px] text-pink mt-2 pt-2 border-t border-border-subtle">
            <svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span className="truncate">
              {wine.drinkingWindow || `${wine.quantity} bottle${wine.quantity !== 1 ? "s" : ""} in stock`}
            </span>
          </div>
        )}
      </a>

      {/* Quick consume on hover */}
      <button
        onClick={onConsume}
        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gold/90 hover:bg-gold text-bg w-7 h-7 rounded-full flex items-center justify-center shadow-lg"
        title="Open a bottle"
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </button>
    </div>
  );
}

function ListWineCard({ wine, onConsume }: { wine: Wine; onConsume: () => void }) {
  const score = extractTopScore(wine.criticReviews) || (wine.onlineRating ? { score: Math.round(wine.onlineRating), source: "AI" } : null);
  return (
    <div className="bg-surface-raised border border-border-subtle hover:border-gold/30 rounded-2xl transition-all group flex">
      <a href={`/wine/${wine.id}`} className="flex-1 flex gap-3 p-3 min-w-0">
        <div className="w-14 h-20 flex-shrink-0 flex items-center justify-center">
          {wine.imageData || wine.labelImageUrl ? (
            <img src={wine.imageData || wine.labelImageUrl || ""} alt={wine.name} className="h-full object-contain" />
          ) : (
            <BottleSilhouette color={wine.color ? COLOR_DOTS[wine.color] : null} small />
          )}
        </div>
        <div className="flex-1 min-w-0 py-1">
          <h3 className="font-serif text-[15px] font-semibold text-text-primary truncate">
            {wine.winery || wine.name}
          </h3>
          {wine.winery && (
            <p className="text-[12px] text-text-secondary truncate">{wine.name}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-text-tertiary truncate">
              {[wine.region, wine.country].filter(Boolean).join(", ")}{wine.vintage && ` · ${wine.vintage}`}
            </span>
            {score && (
              <span className="bg-pink-muted text-pink border border-pink/20 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums flex-shrink-0">
                {score.score}<span className="font-medium opacity-60 ml-0.5">{score.source}</span>
              </span>
            )}
          </div>
        </div>
      </a>
      <button
        onClick={onConsume}
        className="px-3 text-text-tertiary hover:text-gold transition-colors flex items-center"
        title="Open a bottle"
      >
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </button>
    </div>
  );
}

function BottleSilhouette({ color, small = false }: { color: string | null; small?: boolean }) {
  return (
    <svg width={small ? 32 : 60} height={small ? 60 : 130} viewBox="0 0 60 130" fill="none">
      <defs>
        <linearGradient id="bottleGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color || "#8a3f5a"} stopOpacity="0.9" />
          <stop offset="100%" stopColor={color || "#8a3f5a"} stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <path
        d="M22 2 L38 2 L38 26 Q44 30 44 40 L44 120 Q44 126 38 128 L22 128 Q16 126 16 120 L16 40 Q16 30 22 26 Z"
        fill="url(#bottleGrad)"
        stroke={color || "#8a3f5a"}
        strokeWidth="1.5"
        opacity="0.85"
      />
      <rect x="20" y="60" width="20" height="32" fill="#1a1116" stroke={color || "#8a3f5a"} strokeOpacity="0.4" strokeWidth="0.8" />
    </svg>
  );
}
