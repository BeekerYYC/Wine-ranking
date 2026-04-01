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
  const [search, setSearch] = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState("createdAt");
  const [loading, setLoading] = useState(true);

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

  const pill = (active: boolean) =>
    `px-3 py-1 rounded-full text-[13px] font-medium whitespace-nowrap transition-all ${
      active
        ? "bg-accent/15 text-accent ring-1 ring-accent/25"
        : "text-text-tertiary hover:text-text-secondary hover:bg-surface-overlay"
    }`;

  return (
    <div>
      {/* Search */}
      <div className="relative mb-5">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search wines, wineries, regions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-raised border border-border text-[14px] text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/30 transition-all"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-none">
        {statuses.map((s) => (
          <button key={s.key} onClick={() => setStatusFilter(s.key)} className={pill(statusFilter === s.key)}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-none">
        <button onClick={() => setColorFilter("")} className={pill(!colorFilter)}>All colors</button>
        {colors.map((c) => (
          <button key={c} onClick={() => setColorFilter(colorFilter === c ? "" : c)} className={`${pill(colorFilter === c)} capitalize`}>
            {c}
          </button>
        ))}
      </div>

      {/* Sort row */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-1">
          <span className="text-[12px] text-text-tertiary mr-1">Sort</span>
          {[
            { key: "createdAt", label: "Recent" },
            { key: "rating", label: "Rating" },
            { key: "price", label: "Price" },
            { key: "name", label: "Name" },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`text-[12px] px-2 py-0.5 rounded-md transition-all ${
                sort === s.key
                  ? "bg-surface-overlay text-text-primary font-medium"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <a href="/api/export" download className="text-[12px] text-text-tertiary hover:text-accent transition-colors">
          Export CSV
        </a>
      </div>

      {/* Wine list */}
      {loading ? (
        <div className="text-center py-16 text-text-tertiary text-sm">Loading...</div>
      ) : wines.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-5 opacity-30">&#127863;</p>
          <h2 className="text-lg font-semibold text-text-primary mb-2">Your collection is empty</h2>
          <p className="text-sm text-text-tertiary mb-6">Add your first wine to get started</p>
          <a
            href="/add"
            className="inline-block bg-accent/90 hover:bg-accent text-surface px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Add Wine
          </a>
        </div>
      ) : (
        <div className="space-y-2">
          {wines.map((wine) => (
            <WineCard key={wine.id} wine={wine} onQuickRate={handleQuickRate} />
          ))}
        </div>
      )}
    </div>
  );
}
