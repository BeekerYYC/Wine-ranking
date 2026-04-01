"use client";

import { useEffect, useState } from "react";
import WineCard from "@/components/WineCard";

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
  createdAt: string;
}

interface QuickStats {
  total: number;
  totalBottles: number;
  inCollection: number;
  avgRating: number;
  totalSpent: number;
}

const colors = ["red", "white", "rosé", "sparkling", "dessert", "orange"];
const statuses = [
  { key: "", label: "All" },
  { key: "collection", label: "Cellar" },
  { key: "wishlist", label: "Wishlist" },
  { key: "consumed", label: "Consumed" },
  { key: "restaurant", label: "Restaurant" },
];

export default function Home() {
  const [wines, setWines] = useState<Wine[]>([]);
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [search, setSearch] = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState("createdAt");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "grid">("list");

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => setStats({ total: data.total, totalBottles: data.totalBottles, inCollection: data.inCollection, avgRating: data.avgRating, totalSpent: data.totalSpent }));
  }, []);

  const fetchWines = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (colorFilter) params.set("color", colorFilter);
    if (statusFilter) params.set("status", statusFilter);
    const sortMap: Record<string, [string, string]> = {
      rating: ["rating", "desc"],
      price: ["price", "asc"],
      name: ["name", "asc"],
      createdAt: ["createdAt", "desc"],
    };
    const [s, o] = sortMap[sort] || sortMap.createdAt;
    params.set("sort", s);
    params.set("order", o);

    setLoading(true);
    fetch(`/api/wines?${params}`)
      .then((r) => r.json())
      .then(setWines)
      .finally(() => setLoading(false));
  };

  useEffect(fetchWines, [search, colorFilter, statusFilter, sort]);

  const handleQuickRate = async (id: number, rating: number) => {
    await fetch(`/api/wines/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });
    setWines((prev) => prev.map((w) => (w.id === id ? { ...w, rating } : w)));
  };

  return (
    <div>
      {/* Page header with stats */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">All Wines</h1>
            <p className="text-[13px] text-text-tertiary mt-0.5">
              {stats ? `${stats.total} wines · ${stats.totalBottles} bottles total` : "Loading..."}
            </p>
          </div>
        </div>

        {/* Quick stats bar */}
        {stats && stats.total > 0 && (
          <div className="grid grid-cols-4 gap-2 mb-5">
            <div className="bg-surface-raised rounded-lg border border-border-subtle px-3 py-2.5">
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium">Bottles</p>
              <p className="text-lg font-bold tabular-nums text-text-primary">{stats.totalBottles}</p>
            </div>
            <div className="bg-surface-raised rounded-lg border border-border-subtle px-3 py-2.5">
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium">Labels</p>
              <p className="text-lg font-bold tabular-nums text-text-primary">{stats.total}</p>
            </div>
            <div className="bg-surface-raised rounded-lg border border-border-subtle px-3 py-2.5">
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium">Avg Rating</p>
              <p className="text-lg font-bold tabular-nums text-gold">{stats.avgRating || "—"}</p>
            </div>
            <div className="bg-surface-raised rounded-lg border border-border-subtle px-3 py-2.5">
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium">Value</p>
              <p className="text-lg font-bold tabular-nums text-text-primary">${stats.totalSpent.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search wines, wineries, regions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface-raised border border-border-subtle text-[13px] text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/20 transition-all"
        />
      </div>

      {/* Filter toolbar */}
      <div className="flex items-center gap-3 mb-4 overflow-x-auto pb-1">
        {/* Status */}
        <div className="flex gap-1 bg-surface-raised rounded-lg p-0.5 border border-border-subtle flex-shrink-0">
          {statuses.map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={`px-2.5 py-1 rounded-md text-[12px] font-medium transition-all ${
                statusFilter === s.key
                  ? "bg-surface-overlay text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-tertiary"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Separator */}
        <div className="w-px h-5 bg-border flex-shrink-0" />

        {/* Color pills */}
        <div className="flex gap-1 flex-shrink-0">
          {colors.map((c) => {
            const dotColor: Record<string, string> = {
              red: "bg-wine-red", white: "bg-wine-white", "rosé": "bg-wine-rose",
              sparkling: "bg-wine-sparkling", dessert: "bg-wine-dessert", orange: "bg-wine-orange",
            };
            return (
              <button
                key={c}
                onClick={() => setColorFilter(colorFilter === c ? "" : c)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all capitalize ${
                  colorFilter === c
                    ? "bg-gold-muted text-gold ring-1 ring-gold/20"
                    : "text-text-muted hover:text-text-tertiary hover:bg-surface-raised"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor[c]}`} />
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort + view controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-text-muted mr-1">Sort</span>
          {[
            { key: "createdAt", label: "Recent" },
            { key: "rating", label: "Rating" },
            { key: "price", label: "Price" },
            { key: "name", label: "Name" },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`text-[11px] px-2 py-0.5 rounded transition-all ${
                sort === s.key
                  ? "bg-surface-overlay text-text-primary font-medium"
                  : "text-text-muted hover:text-text-tertiary"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex gap-0.5 bg-surface-raised rounded-md p-0.5 border border-border-subtle">
          <button
            onClick={() => setView("list")}
            className={`p-1 rounded transition-all ${view === "list" ? "bg-surface-overlay text-text-primary" : "text-text-muted"}`}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setView("grid")}
            className={`p-1 rounded transition-all ${view === "grid" ? "bg-surface-overlay text-text-primary" : "text-text-muted"}`}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Wine list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-raised rounded-xl border border-border-subtle p-3.5 animate-pulse">
              <div className="flex gap-3.5">
                <div className="w-12 h-16 bg-surface-overlay rounded-lg" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3.5 bg-surface-overlay rounded w-2/3" />
                  <div className="h-3 bg-surface-overlay rounded w-1/3" />
                  <div className="h-3 bg-surface-overlay rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : wines.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gold-muted flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-gold">
              <path d="M8 2h8l-1 9H9L8 2z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 11v6" strokeLinecap="round" />
              <path d="M8 21h8" strokeLinecap="round" />
              <path d="M10 17h4" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-1">Your collection is empty</h2>
          <p className="text-[13px] text-text-tertiary mb-5">Add your first bottle to get started</p>
          <a
            href="/add"
            className="inline-flex items-center gap-2 bg-gold/90 hover:bg-gold text-bg px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-colors"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Wine
          </a>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {wines.map((wine) => (
            <a
              key={wine.id}
              href={`/wine/${wine.id}`}
              className="bg-surface-raised rounded-xl border border-border-subtle hover:border-border p-3 transition-all group"
            >
              {wine.imageData ? (
                <img src={wine.imageData} alt={wine.name} className="w-full h-28 object-contain rounded-lg mb-2" />
              ) : (
                <div className="w-full h-28 bg-surface-overlay rounded-lg mb-2 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-text-muted">
                    <path d="M8 2h8l-1 9H9L8 2z" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 11v6" strokeLinecap="round" />
                    <path d="M8 21h8" strokeLinecap="round" />
                    <path d="M10 17h4" strokeLinecap="round" />
                  </svg>
                </div>
              )}
              <h3 className="text-[12px] font-semibold text-text-primary truncate">{wine.name}</h3>
              {wine.winery && <p className="text-[11px] text-text-tertiary truncate">{wine.winery}</p>}
              <div className="flex items-center justify-between mt-1.5">
                {wine.rating ? <StarRatingMini rating={wine.rating} /> : <span className="text-[10px] text-text-muted">Unrated</span>}
                {wine.price != null && <span className="text-[11px] font-medium text-text-secondary tabular-nums">${wine.price.toFixed(0)}</span>}
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {wines.map((wine) => (
            <WineCard key={wine.id} wine={wine} onQuickRate={handleQuickRate} />
          ))}
        </div>
      )}
    </div>
  );
}

function StarRatingMini({ rating }: { rating: number }) {
  return (
    <div className="flex gap-px">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={`text-[10px] leading-none ${s <= rating ? "text-gold" : "text-surface-highlight"}`}>★</span>
      ))}
    </div>
  );
}
