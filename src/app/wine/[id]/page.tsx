"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import StarRating from "@/components/StarRating";

interface Wine {
  id: number; name: string; winery?: string | null; vintage?: number | null;
  varietal?: string | null; region?: string | null; country?: string | null;
  color?: string | null; price?: number | null; rating?: number | null;
  notes?: string | null; description?: string | null; imageData?: string | null;
  quantity: number; status: string; occasion?: string | null;
  foodPairings?: string | null; onlineRating?: number | null;
  store?: { id: number; name: string } | null;
  list?: { id: number; name: string } | null; createdAt: string;
}

const colorDot: Record<string, string> = {
  red: "bg-wine-red", white: "bg-wine-white", "rosé": "bg-wine-rose",
  sparkling: "bg-wine-sparkling", dessert: "bg-wine-dessert", orange: "bg-wine-orange",
};

export default function WineDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [wine, setWine] = useState<Wine | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/wines/${id}`).then((r) => r.json()).then((w) => {
      setWine(w); setRating(w.rating || 0); setNotes(w.notes || ""); setQuantity(w.quantity || 1);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!wine) return;
    setSaving(true);
    const res = await fetch(`/api/wines/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...wine, rating, notes, quantity }),
    });
    setWine(await res.json()); setEditing(false); setSaving(false);
  };

  const adjustQuantity = async (delta: number) => {
    const newQty = Math.max(0, quantity + delta);
    setQuantity(newQty);
    await fetch(`/api/wines/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity: newQty }) });
  };

  const updateStatus = async (status: string) => {
    if (!wine) return;
    await fetch(`/api/wines/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setWine({ ...wine, status });
  };

  const handleDelete = async () => {
    if (!confirm("Delete this wine?")) return;
    await fetch(`/api/wines/${id}`, { method: "DELETE" });
    router.push("/");
  };

  if (loading) return (
    <div className="max-w-lg mx-auto">
      <div className="animate-pulse space-y-4 py-8">
        <div className="h-4 bg-surface-raised rounded w-16" />
        <div className="h-48 bg-surface-raised rounded-xl" />
        <div className="h-6 bg-surface-raised rounded w-2/3" />
        <div className="h-4 bg-surface-raised rounded w-1/3" />
      </div>
    </div>
  );
  if (!wine) return <div className="text-center py-16 text-text-tertiary">Wine not found</div>;

  const occasionTags = wine.occasion ? wine.occasion.split(",").filter(Boolean) : [];

  return (
    <div className="max-w-lg mx-auto">
      <button onClick={() => router.push("/")} className="text-text-muted hover:text-text-secondary text-[12px] mb-5 inline-flex items-center gap-1.5 transition-colors">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to collection
      </button>

      {wine.imageData && (
        <div className="bg-surface-raised rounded-xl border border-border-subtle p-4 mb-4 flex justify-center">
          <img src={wine.imageData} alt={wine.name} className="max-h-56 object-contain rounded-lg" />
        </div>
      )}

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold text-text-primary leading-snug">{wine.name}</h1>
          {wine.vintage && <span className="text-text-tertiary tabular-nums flex-shrink-0 text-[15px]">{wine.vintage}</span>}
        </div>
        {wine.winery && <p className="text-[14px] text-text-secondary mt-1">{wine.winery}</p>}
      </div>

      {/* Meta tags */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        {wine.color && (
          <span className="flex items-center gap-1.5 text-[12px] text-text-secondary bg-surface-raised px-2 py-1 rounded-md border border-border-subtle">
            <span className={`w-2 h-2 rounded-full ${colorDot[wine.color] || "bg-surface-highlight"}`} />{wine.color}
          </span>
        )}
        {wine.varietal && <span className="text-[12px] text-text-tertiary bg-surface-raised px-2 py-1 rounded-md border border-border-subtle">{wine.varietal}</span>}
        {wine.region && <span className="text-[12px] text-text-tertiary bg-surface-raised px-2 py-1 rounded-md border border-border-subtle">{wine.region}{wine.country ? `, ${wine.country}` : ""}</span>}
        {occasionTags.map((t) => <span key={t} className="text-[11px] text-gold bg-gold-muted px-2 py-0.5 rounded-md capitalize">{t}</span>)}
      </div>

      {/* Price & Score */}
      <div className="flex items-center gap-5 mb-5">
        {wine.price != null && <span className="text-xl font-bold tabular-nums">${wine.price.toFixed(2)}</span>}
        {wine.onlineRating && (
          <span className="text-[13px]"><span className="text-gold font-bold tabular-nums">{wine.onlineRating}</span><span className="text-text-muted">/100 est.</span></span>
        )}
      </div>

      {/* Inventory */}
      <section className="bg-surface-raised rounded-xl border border-border-subtle p-4 mb-2.5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Inventory</h2>
          <select value={wine.status} onChange={(e) => updateStatus(e.target.value)}
            className="text-[12px] bg-surface-overlay border border-border-subtle text-text-secondary rounded-md px-2 py-1 focus:outline-none focus:border-gold/30 transition-all">
            <option value="collection">In Collection</option>
            <option value="wishlist">Wishlist</option>
            <option value="consumed">Consumed</option>
            <option value="restaurant">Restaurant</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-text-tertiary">Bottles</span>
          <button onClick={() => adjustQuantity(-1)} className="w-7 h-7 rounded-md bg-surface-overlay hover:bg-surface-highlight text-text-secondary flex items-center justify-center transition-colors text-sm">−</button>
          <span className="text-[15px] font-bold tabular-nums w-6 text-center">{quantity}</span>
          <button onClick={() => adjustQuantity(1)} className="w-7 h-7 rounded-md bg-surface-overlay hover:bg-surface-highlight text-text-secondary flex items-center justify-center transition-colors text-sm">+</button>
        </div>
        {wine.store && <p className="text-[11px] text-text-muted mt-3">Purchased at <span className="text-text-tertiary">{wine.store.name}</span></p>}
        {wine.list && <p className="text-[11px] text-text-muted mt-1">List: <span className="text-text-tertiary">{wine.list.name}</span></p>}
      </section>

      {/* Rating */}
      <section className="bg-surface-raised rounded-xl border border-border-subtle p-4 mb-2.5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Your Rating</h2>
          {!editing && <button onClick={() => setEditing(true)} className="text-[12px] text-gold hover:text-gold-light font-medium transition-colors">Edit</button>}
        </div>
        <StarRating rating={rating} onChange={editing ? setRating : undefined} readonly={!editing} />
        {editing ? (
          <div className="mt-3">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Tasting notes..."
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border-subtle text-[13px] text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/20 resize-none" />
            <div className="flex gap-2 mt-2">
              <button onClick={handleSave} disabled={saving} className="bg-gold/90 hover:bg-gold text-bg px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors">
                {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => { setEditing(false); setRating(wine.rating || 0); setNotes(wine.notes || ""); }}
                className="text-text-muted hover:text-text-tertiary px-3 py-1.5 text-[12px] transition-colors">Cancel</button>
            </div>
          </div>
        ) : notes && <p className="text-[13px] text-text-secondary mt-2 leading-relaxed">{notes}</p>}
      </section>

      {/* Food pairings */}
      {wine.foodPairings && (
        <section className="bg-surface-raised rounded-xl border border-border-subtle p-4 mb-2.5">
          <h2 className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-2">Food Pairings</h2>
          <div className="flex flex-wrap gap-1.5">
            {wine.foodPairings.split(",").map((p, i) => (
              <span key={i} className="text-[11px] px-2.5 py-1 rounded-md bg-gold-muted text-gold border border-gold/10">{p.trim()}</span>
            ))}
          </div>
        </section>
      )}

      {/* Description */}
      {wine.description && (
        <section className="bg-surface-raised rounded-xl border border-border-subtle p-4 mb-2.5">
          <h2 className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-2">About</h2>
          <p className="text-[12px] text-text-secondary leading-relaxed">{wine.description}</p>
        </section>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-border-subtle">
        <p className="text-[11px] text-text-muted">Added {new Date(wine.createdAt).toLocaleDateString()}</p>
        <button onClick={handleDelete} className="text-danger/50 hover:text-danger text-[12px] font-medium transition-colors">Delete wine</button>
      </div>
    </div>
  );
}
