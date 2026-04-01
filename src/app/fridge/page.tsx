"use client";

import { useEffect, useState } from "react";
import ConsumeModal from "@/components/ConsumeModal";
import WineBottlePlaceholder from "@/components/WineBottlePlaceholder";

interface Wine {
  id: number; name: string; winery?: string | null; vintage?: number | null;
  varietal?: string | null; color?: string | null; price?: number | null;
  rating?: number | null; quantity: number; imageData?: string | null;
  onlineRating?: number | null; confidence?: number | null;
}

const colorDot: Record<string, string> = {
  red: "bg-wine-red", white: "bg-wine-white", "rosé": "bg-wine-rose",
  sparkling: "bg-wine-sparkling", dessert: "bg-wine-dessert", orange: "bg-wine-orange",
};
const colorLabels = ["red", "white", "rosé", "sparkling", "dessert", "orange"];

export default function FridgePage() {
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [consumeWine, setConsumeWine] = useState<Wine | null>(null);
  const [groupBy, setGroupBy] = useState<"color" | "varietal">("color");

  const fetchWines = () => {
    fetch("/api/wines?status=collection")
      .then((r) => r.json())
      .then((data: Wine[]) => setWines(data.filter((w) => w.quantity > 0)))
      .finally(() => setLoading(false));
  };

  useEffect(fetchWines, []);

  const totalBottles = wines.reduce((sum, w) => sum + w.quantity, 0);
  const totalValue = wines.reduce((sum, w) => sum + (w.price || 0) * w.quantity, 0);

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

  const handleRemove = async (wineId: number) => {
    if (!confirm("Remove this wine from your fridge?")) return;
    await fetch(`/api/wines/${wineId}`, { method: "DELETE" });
    fetchWines();
  };

  // Group wines
  const grouped: Record<string, Wine[]> = {};
  wines.forEach((w) => {
    const key = groupBy === "color" ? (w.color || "other") : (w.varietal || "Other");
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(w);
  });

  // Sort groups: for colors use predefined order, for varietal sort alphabetically
  const sortedGroups = groupBy === "color"
    ? [...colorLabels, "other"].filter((c) => grouped[c])
    : Object.keys(grouped).sort();

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Wine Fridge</h1>
          <p className="text-[13px] text-text-tertiary mt-0.5">
            {totalBottles} bottle{totalBottles !== 1 ? "s" : ""} · {wines.length} label{wines.length !== 1 ? "s" : ""}
            {totalValue > 0 && ` · $${totalValue.toLocaleString()} value`}
          </p>
        </div>
        <a
          href="/fridge/scan"
          className="bg-gold/90 hover:bg-gold text-bg px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors flex items-center gap-2"
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Scan Bottles
        </a>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 mb-5">
        <a
          href="/fridge/drink"
          className="flex-1 bg-surface-raised hover:bg-surface-overlay border border-border-subtle rounded-lg px-4 py-3 text-center transition-all group"
        >
          <p className="text-[13px] font-medium text-text-primary group-hover:text-gold transition-colors">What should I drink?</p>
          <p className="text-[11px] text-text-muted mt-0.5">Get an AI suggestion</p>
        </a>
        <a
          href="/add"
          className="bg-surface-raised hover:bg-surface-overlay border border-border-subtle rounded-lg px-4 py-3 text-center transition-all group"
        >
          <p className="text-[13px] font-medium text-text-primary group-hover:text-gold transition-colors">Add manually</p>
          <p className="text-[11px] text-text-muted mt-0.5">Single bottle</p>
        </a>
      </div>

      {/* Group toggle */}
      {wines.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] text-text-muted">Group by</span>
          <div className="flex gap-0.5 bg-surface-raised rounded-md p-0.5 border border-border-subtle">
            {(["color", "varietal"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all capitalize ${
                  groupBy === g ? "bg-surface-overlay text-text-primary shadow-sm" : "text-text-muted"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-surface-raised rounded-xl" />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && wines.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gold-muted flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-gold">
              <path d="M8 2h8l-1 9H9L8 2z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 11v6" strokeLinecap="round" /><path d="M8 21h8" strokeLinecap="round" /><path d="M10 17h4" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-1">Fridge is empty</h2>
          <p className="text-[13px] text-text-tertiary mb-5">Scan your wine drawers to stock up</p>
          <a href="/fridge/scan" className="inline-flex items-center gap-2 bg-gold/90 hover:bg-gold text-bg px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-colors">
            Scan Bottles
          </a>
        </div>
      )}

      {/* Wine inventory grouped */}
      {!loading && sortedGroups.map((group) => (
        <div key={group} className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            {groupBy === "color" && <span className={`w-2.5 h-2.5 rounded-full ${colorDot[group] || "bg-surface-highlight"}`} />}
            <h2 className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider capitalize">{group}</h2>
            <span className="text-[11px] text-text-muted tabular-nums">
              {grouped[group].reduce((s, w) => s + w.quantity, 0)} btl
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {grouped[group].map((wine) => (
              <div key={wine.id} className="bg-surface-raised rounded-xl border border-border-subtle hover:border-border p-3 transition-all group relative">
                <a href={`/wine/${wine.id}`} className="block">
                  {wine.imageData ? (
                    <img src={wine.imageData} alt={wine.name} className="w-full h-24 object-contain rounded-lg mb-2" />
                  ) : (
                    <div className="mb-2">
                      <WineBottlePlaceholder color={wine.color} size="lg" name={wine.name} />
                    </div>
                  )}
                  <h3 className="text-[12px] font-semibold text-text-primary truncate">{wine.name}</h3>
                  {wine.vintage && <p className="text-[11px] text-text-tertiary tabular-nums">{wine.vintage}</p>}
                  <div className="flex items-center justify-between mt-1.5">
                    {wine.rating ? (
                      <div className="flex gap-px">{[1,2,3,4,5].map((s) => <span key={s} className={`text-[9px] ${s <= wine.rating! ? "text-gold" : "text-surface-highlight"}`}>★</span>)}</div>
                    ) : <span className="text-[10px] text-text-muted">Unrated</span>}
                    <div className="flex items-center gap-1">
                      {wine.confidence != null && (
                        <span className={`text-[9px] font-medium tabular-nums px-1 rounded ${
                          wine.confidence >= 0.8 ? "text-success bg-success-muted" : wine.confidence >= 0.5 ? "text-gold bg-gold-muted" : "text-danger bg-danger-muted"
                        }`}>{Math.round(wine.confidence * 100)}%</span>
                      )}
                      {wine.quantity > 1 && <span className="text-[10px] text-text-tertiary tabular-nums bg-surface-overlay px-1 rounded">×{wine.quantity}</span>}
                    </div>
                  </div>
                </a>
                {/* Quick actions on hover */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={(e) => { e.preventDefault(); setConsumeWine(wine); }}
                    className="w-6 h-6 rounded-full bg-bg/70 backdrop-blur-sm flex items-center justify-center text-text-muted hover:text-gold transition-colors"
                    title="Open a bottle"
                  >
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M8 2h8l-1 9H9L8 2z" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M12 11v6" strokeLinecap="round" /><path d="M8 21h8" strokeLinecap="round" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); handleRemove(wine.id); }}
                    className="w-6 h-6 rounded-full bg-bg/70 backdrop-blur-sm flex items-center justify-center text-text-muted hover:text-danger transition-colors"
                    title="Remove wine"
                  >
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Consume modal */}
      {consumeWine && (
        <ConsumeModal wine={consumeWine} onConfirm={handleConsume} onClose={() => setConsumeWine(null)} />
      )}
    </div>
  );
}
