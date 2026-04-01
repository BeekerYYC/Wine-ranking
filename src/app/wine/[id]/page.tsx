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
  red: "bg-red-500", white: "bg-yellow-300", "rosé": "bg-pink-400",
  sparkling: "bg-sky-400", dessert: "bg-amber-500", orange: "bg-orange-400",
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

  if (loading) return <div className="text-center py-16 text-text-tertiary text-sm">Loading...</div>;
  if (!wine) return <div className="text-center py-16 text-text-tertiary">Wine not found</div>;

  const occasionTags = wine.occasion ? wine.occasion.split(",").filter(Boolean) : [];

  return (
    <div className="max-w-lg mx-auto">
      <button onClick={() => router.push("/")} className="text-text-tertiary hover:text-text-primary text-[13px] mb-5 inline-flex items-center gap-1 transition-colors">
        ← Back
      </button>

      {wine.imageData && (
        <img src={wine.imageData} alt={wine.name} className="w-full max-h-64 object-contain rounded-xl border border-border mb-5" />
      )}

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-semibold text-text-primary leading-snug">{wine.name}</h1>
          {wine.vintage && <span className="text-text-tertiary tabular-nums flex-shrink-0">{wine.vintage}</span>}
        </div>
        {wine.winery && <p className="text-[14px] text-text-secondary mt-1">{wine.winery}</p>}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2.5 flex-wrap mb-5">
        {wine.color && <span className="flex items-center gap-1.5 text-[13px] text-text-secondary"><span className={`w-2 h-2 rounded-full ${colorDot[wine.color] || "bg-zinc-500"}`} />{wine.color}</span>}
        {wine.varietal && <span className="text-[13px] text-text-tertiary">{wine.varietal}</span>}
        {wine.region && <span className="text-[13px] text-text-tertiary">{wine.region}{wine.country ? `, ${wine.country}` : ""}</span>}
        {occasionTags.map((t) => <span key={t} className="text-[11px] text-accent bg-accent-muted px-2 py-0.5 rounded-full">{t}</span>)}
      </div>

      {/* Price & Score row */}
      <div className="flex items-center gap-6 mb-6">
        {wine.price != null && <span className="text-lg font-semibold tabular-nums">${wine.price.toFixed(2)}</span>}
        {wine.onlineRating && (
          <span className="text-[13px]"><span className="text-accent font-semibold tabular-nums">{wine.onlineRating}</span><span className="text-text-tertiary">/100 est.</span></span>
        )}
      </div>

      {/* Inventory */}
      <section className="bg-surface-raised rounded-xl border border-border p-4 mb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-medium text-text-secondary uppercase tracking-wider">Inventory</h2>
          <select value={wine.status} onChange={(e) => updateStatus(e.target.value)}
            className="text-[13px] bg-surface-overlay border border-border text-text-secondary rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-accent/30">
            <option value="collection">In Collection</option>
            <option value="wishlist">Wishlist</option>
            <option value="consumed">Consumed</option>
            <option value="restaurant">Restaurant</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-text-tertiary">Bottles</span>
          <button onClick={() => adjustQuantity(-1)} className="w-7 h-7 rounded-lg bg-surface-overlay hover:bg-border text-text-secondary flex items-center justify-center transition-colors text-sm">−</button>
          <span className="text-[15px] font-semibold tabular-nums w-6 text-center">{quantity}</span>
          <button onClick={() => adjustQuantity(1)} className="w-7 h-7 rounded-lg bg-surface-overlay hover:bg-border text-text-secondary flex items-center justify-center transition-colors text-sm">+</button>
        </div>
        {wine.store && <p className="text-[12px] text-text-tertiary mt-3">Purchased at <span className="text-text-secondary">{wine.store.name}</span></p>}
        {wine.list && <p className="text-[12px] text-text-tertiary mt-1">List: <span className="text-text-secondary">{wine.list.name}</span></p>}
      </section>

      {/* Rating */}
      <section className="bg-surface-raised rounded-xl border border-border p-4 mb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-medium text-text-secondary uppercase tracking-wider">Your Rating</h2>
          {!editing && <button onClick={() => setEditing(true)} className="text-[12px] text-accent hover:text-accent/80 font-medium transition-colors">Edit</button>}
        </div>
        <StarRating rating={rating} onChange={editing ? setRating : undefined} readonly={!editing} />
        {editing ? (
          <div className="mt-3">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Tasting notes..."
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-[13px] text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none" />
            <div className="flex gap-2 mt-2">
              <button onClick={handleSave} disabled={saving} className="bg-accent/90 hover:bg-accent text-surface px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors">
                {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => { setEditing(false); setRating(wine.rating || 0); setNotes(wine.notes || ""); }}
                className="text-text-tertiary hover:text-text-secondary px-3 py-1.5 text-[13px] transition-colors">Cancel</button>
            </div>
          </div>
        ) : notes && <p className="text-[13px] text-text-secondary mt-2 leading-relaxed">{notes}</p>}
      </section>

      {/* Food pairings */}
      {wine.foodPairings && (
        <section className="bg-surface-raised rounded-xl border border-border p-4 mb-3">
          <h2 className="text-[13px] font-medium text-text-secondary uppercase tracking-wider mb-2">Food Pairings</h2>
          <div className="flex flex-wrap gap-1.5">
            {wine.foodPairings.split(",").map((p, i) => (
              <span key={i} className="text-[12px] px-2.5 py-1 rounded-full bg-warm-muted text-warm border border-warm/10">{p.trim()}</span>
            ))}
          </div>
        </section>
      )}

      {/* Description */}
      {wine.description && (
        <section className="bg-surface-raised rounded-xl border border-border p-4 mb-3">
          <h2 className="text-[13px] font-medium text-text-secondary uppercase tracking-wider mb-2">About</h2>
          <p className="text-[13px] text-text-secondary leading-relaxed">{wine.description}</p>
        </section>
      )}

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
        <p className="text-[12px] text-text-tertiary">Added {new Date(wine.createdAt).toLocaleDateString()}</p>
        <button onClick={handleDelete} className="text-red-400/60 hover:text-red-400 text-[12px] font-medium transition-colors">Delete</button>
      </div>
    </div>
  );
}
