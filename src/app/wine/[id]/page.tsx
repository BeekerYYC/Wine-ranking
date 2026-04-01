"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import StarRating from "@/components/StarRating";

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
  notes?: string | null;
  description?: string | null;
  imageData?: string | null;
  quantity: number;
  status: string;
  occasion?: string | null;
  foodPairings?: string | null;
  onlineRating?: number | null;
  store?: { id: number; name: string } | null;
  list?: { id: number; name: string } | null;
  createdAt: string;
}

const colorStyles: Record<string, string> = {
  red: "bg-red-900/60 text-red-200",
  white: "bg-yellow-900/40 text-yellow-200",
  "rosé": "bg-pink-900/50 text-pink-200",
  sparkling: "bg-sky-900/40 text-sky-200",
  dessert: "bg-amber-900/40 text-amber-200",
  orange: "bg-orange-900/40 text-orange-200",
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
    fetch(`/api/wines/${id}`)
      .then((r) => r.json())
      .then((w) => {
        setWine(w);
        setRating(w.rating || 0);
        setNotes(w.notes || "");
        setQuantity(w.quantity || 1);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!wine) return;
    setSaving(true);
    const res = await fetch(`/api/wines/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...wine, rating, notes, quantity }),
    });
    const updated = await res.json();
    setWine(updated);
    setEditing(false);
    setSaving(false);
  };

  const adjustQuantity = async (delta: number) => {
    const newQty = Math.max(0, quantity + delta);
    setQuantity(newQty);
    await fetch(`/api/wines/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: newQty }),
    });
  };

  const updateStatus = async (status: string) => {
    if (!wine) return;
    await fetch(`/api/wines/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setWine({ ...wine, status });
  };

  const handleDelete = async () => {
    if (!confirm("Delete this wine from your collection?")) return;
    await fetch(`/api/wines/${id}`, { method: "DELETE" });
    router.push("/");
  };

  if (loading) return <div className="text-center py-12 text-wine-600">Loading...</div>;
  if (!wine) return <div className="text-center py-12 text-wine-500">Wine not found</div>;

  const occasionTags = wine.occasion ? wine.occasion.split(",").filter(Boolean) : [];

  return (
    <div>
      <button
        onClick={() => router.push("/")}
        className="text-wine-400 hover:text-wine-200 mb-4 inline-flex items-center gap-1 text-sm transition-colors"
      >
        ← Back to collection
      </button>

      {wine.imageData && (
        <img
          src={wine.imageData}
          alt={wine.name}
          className="w-full max-h-72 object-contain rounded-xl border border-wine-800/30 mb-4"
        />
      )}

      <div className="flex items-start justify-between gap-2 mb-1">
        <h1 className="text-2xl font-bold text-stone-100">{wine.name}</h1>
        {wine.vintage && (
          <span className="text-lg text-wine-400 flex-shrink-0 mt-1">{wine.vintage}</span>
        )}
      </div>

      {wine.winery && <p className="text-wine-300 mb-3">{wine.winery}</p>}

      <div className="flex flex-wrap gap-2 mb-4">
        {wine.color && (
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${colorStyles[wine.color] || "bg-stone-800 text-stone-300"}`}>
            {wine.color}
          </span>
        )}
        {wine.varietal && (
          <span className="text-sm px-3 py-1 rounded-full bg-wine-900/60 text-wine-200">{wine.varietal}</span>
        )}
        {wine.region && (
          <span className="text-sm px-3 py-1 rounded-full bg-wine-900/40 text-wine-300">
            {wine.region}{wine.country ? `, ${wine.country}` : ""}
          </span>
        )}
        {occasionTags.map((tag) => (
          <span key={tag} className="text-sm px-3 py-1 rounded-full bg-grape-900/40 text-grape-300">{tag}</span>
        ))}
      </div>

      {/* Price & Online Rating */}
      <div className="flex items-center gap-6 mb-4">
        {wine.price != null && (
          <p className="text-xl font-semibold text-stone-100">${wine.price.toFixed(2)}</p>
        )}
        {wine.onlineRating && (
          <div className="flex items-center gap-1">
            <span className="text-xl font-bold text-grape-300">{wine.onlineRating}</span>
            <span className="text-sm text-grape-500">/100 est.</span>
          </div>
        )}
      </div>

      {/* Inventory controls */}
      <div className="bg-wine-900/40 border border-wine-800/40 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-wine-200">Inventory</h2>
          <select
            value={wine.status}
            onChange={(e) => updateStatus(e.target.value)}
            className="text-sm bg-wine-900/80 border border-wine-800/50 text-wine-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-wine-500"
          >
            <option value="collection">In Collection</option>
            <option value="wishlist">Wishlist</option>
            <option value="consumed">Consumed</option>
            <option value="restaurant">Restaurant</option>
          </select>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-wine-400">Bottles:</span>
          <button onClick={() => adjustQuantity(-1)} className="w-8 h-8 rounded-full bg-wine-800 hover:bg-wine-700 text-white flex items-center justify-center transition-colors">−</button>
          <span className="text-lg font-bold text-wine-100 w-8 text-center">{quantity}</span>
          <button onClick={() => adjustQuantity(1)} className="w-8 h-8 rounded-full bg-wine-800 hover:bg-wine-700 text-white flex items-center justify-center transition-colors">+</button>
        </div>
        {wine.store && (
          <p className="text-sm text-wine-400 mt-2">Purchased at: <span className="text-wine-300">{wine.store.name}</span></p>
        )}
        {wine.list && (
          <p className="text-sm text-wine-400 mt-1">List: <span className="text-wine-300">{wine.list.name}</span></p>
        )}
      </div>

      {/* Rating & Notes */}
      <div className="bg-wine-900/40 border border-wine-800/40 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-wine-200">Your Rating</h2>
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-sm text-wine-400 hover:text-wine-200 font-medium transition-colors">
              Edit
            </button>
          )}
        </div>

        <StarRating rating={rating} onChange={editing ? setRating : undefined} readonly={!editing} />

        {editing ? (
          <div className="mt-3">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Your tasting notes..."
              className="w-full px-3 py-2 rounded-lg border border-wine-800/50 bg-wine-900/50 text-stone-100 placeholder-wine-600 focus:outline-none focus:ring-2 focus:ring-wine-500 resize-none text-sm"
            />
            <div className="flex gap-2 mt-2">
              <button onClick={handleSave} disabled={saving} className="bg-wine-700 hover:bg-wine-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => { setEditing(false); setRating(wine.rating || 0); setNotes(wine.notes || ""); }}
                className="text-wine-400 hover:text-wine-200 px-4 py-2 text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          notes && <p className="text-sm text-wine-300 mt-2">{notes}</p>
        )}
      </div>

      {/* Food pairings */}
      {wine.foodPairings && (
        <div className="bg-wine-900/40 border border-wine-800/40 rounded-xl p-4 mb-4">
          <h2 className="font-semibold text-wine-200 mb-2">Food Pairings</h2>
          <div className="flex flex-wrap gap-2">
            {wine.foodPairings.split(",").map((p, i) => (
              <span key={i} className="text-sm px-3 py-1 rounded-full bg-amber-900/30 text-amber-200 border border-amber-800/30">
                {p.trim()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI Description */}
      {wine.description && (
        <div className="bg-wine-900/40 border border-wine-800/40 rounded-xl p-4 mb-4">
          <h2 className="font-semibold text-wine-200 mb-2">About This Wine</h2>
          <p className="text-sm text-wine-300 leading-relaxed">{wine.description}</p>
        </div>
      )}

      <p className="text-xs text-wine-600 mb-4">
        Added {new Date(wine.createdAt).toLocaleDateString()}
      </p>

      <button onClick={handleDelete} className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors">
        Delete wine
      </button>
    </div>
  );
}
