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
  { key: "collection", label: "In Cellar" },
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
    if (sort === "rating") {
      params.set("sort", "rating");
      params.set("order", "desc");
    } else if (sort === "price") {
      params.set("sort", "price");
      params.set("order", "asc");
    } else if (sort === "name") {
      params.set("sort", "name");
      params.set("order", "asc");
    } else {
      params.set("sort", "createdAt");
      params.set("order", "desc");
    }

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
      {/* Search */}
      <input
        type="text"
        placeholder="Search wines, wineries, varietals..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-wine-800/50 bg-wine-900/50 text-stone-100 placeholder-wine-600 focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent mb-4"
      />

      {/* Status filter */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        {statuses.map((s) => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(s.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === s.key
                ? "bg-wine-700 text-white"
                : "bg-wine-900/50 text-wine-400 hover:bg-wine-800/60 border border-wine-800/40"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Color filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setColorFilter("")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            !colorFilter
              ? "bg-wine-700 text-white"
              : "bg-wine-900/50 text-wine-400 hover:bg-wine-800/60 border border-wine-800/40"
          }`}
        >
          All Colors
        </button>
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => setColorFilter(colorFilter === c ? "" : c)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap capitalize transition-colors ${
              colorFilter === c
                ? "bg-wine-700 text-white"
                : "bg-wine-900/50 text-wine-400 hover:bg-wine-800/60 border border-wine-800/40"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-wine-500">Sort:</span>
        {[
          { key: "createdAt", label: "Recent" },
          { key: "rating", label: "Top Rated" },
          { key: "price", label: "Price" },
          { key: "name", label: "Name" },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={`text-sm px-2 py-1 rounded transition-colors ${
              sort === s.key
                ? "bg-wine-800 text-wine-200 font-medium"
                : "text-wine-500 hover:text-wine-300"
            }`}
          >
            {s.label}
          </button>
        ))}
        <div className="flex-1" />
        <a
          href="/api/export"
          className="text-xs text-wine-500 hover:text-wine-300 transition-colors"
          download
        >
          Export CSV
        </a>
      </div>

      {/* Wine list */}
      {loading ? (
        <div className="text-center py-12 text-wine-600">Loading...</div>
      ) : wines.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🍷</div>
          <h2 className="text-xl font-semibold text-wine-200 mb-2">
            No wines yet
          </h2>
          <p className="text-wine-500 mb-6">
            Start building your collection by adding your first wine.
          </p>
          <a
            href="/add"
            className="inline-block bg-wine-700 hover:bg-wine-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            Add Your First Wine
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {wines.map((wine) => (
            <WineCard key={wine.id} wine={wine} onQuickRate={handleQuickRate} />
          ))}
        </div>
      )}
    </div>
  );
}
