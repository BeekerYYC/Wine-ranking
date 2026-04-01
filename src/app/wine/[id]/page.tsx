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
  createdAt: string;
}

const colorStyles: Record<string, string> = {
  red: "bg-red-800 text-white",
  white: "bg-yellow-100 text-yellow-800",
  rosé: "bg-pink-200 text-pink-800",
  sparkling: "bg-sky-100 text-sky-800",
  dessert: "bg-amber-200 text-amber-800",
  orange: "bg-orange-200 text-orange-800",
};

export default function WineDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [wine, setWine] = useState<Wine | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/wines/${id}`)
      .then((r) => r.json())
      .then((w) => {
        setWine(w);
        setRating(w.rating || 0);
        setNotes(w.notes || "");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!wine) return;
    setSaving(true);
    const res = await fetch(`/api/wines/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...wine, rating, notes }),
    });
    const updated = await res.json();
    setWine(updated);
    setEditing(false);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this wine from your collection?")) return;
    await fetch(`/api/wines/${id}`, { method: "DELETE" });
    router.push("/");
  };

  if (loading) {
    return <div className="text-center py-12 text-stone-400">Loading...</div>;
  }

  if (!wine) {
    return <div className="text-center py-12 text-stone-500">Wine not found</div>;
  }

  return (
    <div>
      <button
        onClick={() => router.push("/")}
        className="text-stone-500 hover:text-stone-700 mb-4 inline-flex items-center gap-1 text-sm"
      >
        ← Back to collection
      </button>

      {wine.imageData && (
        <img
          src={wine.imageData}
          alt={wine.name}
          className="w-full max-h-72 object-contain rounded-xl border border-stone-200 mb-4"
        />
      )}

      <div className="flex items-start justify-between gap-2 mb-1">
        <h1 className="text-2xl font-bold text-stone-900">{wine.name}</h1>
        {wine.vintage && (
          <span className="text-lg text-stone-500 flex-shrink-0 mt-1">
            {wine.vintage}
          </span>
        )}
      </div>

      {wine.winery && (
        <p className="text-stone-600 mb-3">{wine.winery}</p>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {wine.color && (
          <span
            className={`text-sm px-3 py-1 rounded-full font-medium ${colorStyles[wine.color] || "bg-stone-200 text-stone-700"}`}
          >
            {wine.color}
          </span>
        )}
        {wine.varietal && (
          <span className="text-sm px-3 py-1 rounded-full bg-stone-200 text-stone-700">
            {wine.varietal}
          </span>
        )}
        {wine.region && (
          <span className="text-sm px-3 py-1 rounded-full bg-stone-100 text-stone-600">
            {wine.region}
            {wine.country ? `, ${wine.country}` : ""}
          </span>
        )}
      </div>

      {wine.price != null && (
        <p className="text-xl font-semibold text-stone-800 mb-4">
          ${wine.price.toFixed(2)}
        </p>
      )}

      {/* Rating & Notes */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-stone-800">Your Rating</h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              Edit
            </button>
          )}
        </div>

        <StarRating
          rating={rating}
          onChange={editing ? setRating : undefined}
          readonly={!editing}
        />

        {editing ? (
          <div className="mt-3">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Your tasting notes..."
              className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none text-sm"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setRating(wine.rating || 0);
                  setNotes(wine.notes || "");
                }}
                className="text-stone-500 hover:text-stone-700 px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          notes && <p className="text-sm text-stone-600 mt-2">{notes}</p>
        )}
      </div>

      {/* AI Description */}
      {wine.description && (
        <div className="bg-stone-100 rounded-xl p-4 mb-4">
          <h2 className="font-semibold text-stone-800 mb-2">About This Wine</h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            {wine.description}
          </p>
        </div>
      )}

      <p className="text-xs text-stone-400 mb-4">
        Added {new Date(wine.createdAt).toLocaleDateString()}
      </p>

      <button
        onClick={handleDelete}
        className="text-red-500 hover:text-red-700 text-sm font-medium"
      >
        Delete wine
      </button>
    </div>
  );
}
