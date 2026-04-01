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
  imageData?: string | null;
  createdAt: string;
}

const colors = ["red", "white", "rosé", "sparkling", "dessert", "orange"];

export default function Home() {
  const [wines, setWines] = useState<Wine[]>([]);
  const [search, setSearch] = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const [sort, setSort] = useState("createdAt");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (colorFilter) params.set("color", colorFilter);
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
  }, [search, colorFilter, sort]);

  return (
    <div>
      {/* Search */}
      <input
        type="text"
        placeholder="Search wines..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent mb-4"
      />

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setColorFilter("")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            !colorFilter
              ? "bg-stone-800 text-white"
              : "bg-stone-200 text-stone-600 hover:bg-stone-300"
          }`}
        >
          All
        </button>
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => setColorFilter(colorFilter === c ? "" : c)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap capitalize transition-colors ${
              colorFilter === c
                ? "bg-stone-800 text-white"
                : "bg-stone-200 text-stone-600 hover:bg-stone-300"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-stone-500">Sort:</span>
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
                ? "bg-amber-100 text-amber-800 font-medium"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Wine list */}
      {loading ? (
        <div className="text-center py-12 text-stone-400">Loading...</div>
      ) : wines.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🍷</div>
          <h2 className="text-xl font-semibold text-stone-700 mb-2">
            No wines yet
          </h2>
          <p className="text-stone-500 mb-6">
            Start building your collection by adding your first wine.
          </p>
          <a
            href="/add"
            className="inline-block bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            Add Your First Wine
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {wines.map((wine) => (
            <WineCard key={wine.id} wine={wine} />
          ))}
        </div>
      )}
    </div>
  );
}
