"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CameraCapture from "@/components/CameraCapture";
import StarRating from "@/components/StarRating";

const colors = ["red", "white", "rosé", "sparkling", "dessert", "orange"];
const occasions = ["date-night", "weeknight", "party", "gift", "celebration", "casual"];
const statusOptions = [
  { value: "collection", label: "In my collection" },
  { value: "wishlist", label: "Wishlist (want to buy)" },
  { value: "consumed", label: "Consumed (finished)" },
  { value: "restaurant", label: "Had at restaurant" },
];

export default function AddWine() {
  const router = useRouter();
  const [imageData, setImageData] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stores, setStores] = useState<{ id: number; name: string }[]>([]);
  const [lists, setLists] = useState<{ id: number; name: string }[]>([]);

  const [form, setForm] = useState({
    name: "",
    winery: "",
    vintage: "",
    varietal: "",
    region: "",
    country: "",
    color: "",
    price: "",
    rating: 0,
    notes: "",
    description: "",
    quantity: "1",
    status: "collection",
    storeName: "",
    occasion: [] as string[],
    foodPairings: "",
    onlineRating: "",
    listId: "",
  });

  useEffect(() => {
    fetch("/api/stores").then((r) => r.json()).then(setStores);
    fetch("/api/lists").then((r) => r.json()).then(setLists);
  }, []);

  const set = (field: string, value: string | number | string[]) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleCapture = async (data: string) => {
    setImageData(data);
    setAnalyzing(true);
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: data }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Analysis failed");
      }

      const info = await res.json();
      setForm((f) => ({
        ...f,
        name: info.name || f.name,
        winery: info.winery || f.winery,
        vintage: info.vintage?.toString() || f.vintage,
        varietal: info.varietal || f.varietal,
        region: info.region || f.region,
        country: info.country || f.country,
        color: info.color || f.color,
        description: info.description || f.description,
        foodPairings: info.foodPairings || f.foodPairings,
        onlineRating: info.onlineRating?.toString() || f.onlineRating,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleOccasion = (occ: string) => {
    setForm((f) => ({
      ...f,
      occasion: f.occasion.includes(occ)
        ? f.occasion.filter((o) => o !== occ)
        : [...f.occasion, occ],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/wines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          occasion: form.occasion.join(","),
          imageData,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      const wine = await res.json();
      router.push(`/wine/${wine.id}`);
    } catch {
      setError("Failed to save wine");
      setSaving(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-wine-800/50 bg-wine-900/50 text-stone-100 placeholder-wine-600 focus:outline-none focus:ring-2 focus:ring-wine-500";
  const labelClass = "block text-sm font-medium text-wine-300 mb-1";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-wine-100">Add Wine</h1>

      {!imageData ? (
        <CameraCapture onCapture={handleCapture} />
      ) : (
        <div className="relative mb-4">
          <img
            src={imageData}
            alt="Wine label"
            className="w-full max-h-64 object-contain rounded-xl border border-wine-800/30"
          />
          <button
            type="button"
            onClick={() => {
              setImageData(null);
              setForm((f) => ({ ...f, description: "", foodPairings: "", onlineRating: "" }));
            }}
            className="absolute top-2 right-2 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/70"
          >
            ×
          </button>
        </div>
      )}

      {analyzing && (
        <div className="bg-wine-900/60 border border-wine-700/50 rounded-xl p-4 mb-4 text-center">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-wine-400 border-t-transparent rounded-full mb-2" />
          <p className="text-wine-200 font-medium">Analyzing wine label...</p>
          <p className="text-sm text-wine-400">Using AI to extract wine details</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-800/50 rounded-xl p-4 mb-4">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div>
          <label className={labelClass}>Wine Name *</label>
          <input type="text" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Opus One 2019" className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Winery</label>
            <input type="text" value={form.winery} onChange={(e) => set("winery", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Vintage</label>
            <input type="number" value={form.vintage} onChange={(e) => set("vintage", e.target.value)} placeholder="2020" className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Varietal</label>
            <input type="text" value={form.varietal} onChange={(e) => set("varietal", e.target.value)} placeholder="Cabernet Sauvignon" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Color</label>
            <select value={form.color} onChange={(e) => set("color", e.target.value)} className={inputClass}>
              <option value="">Select...</option>
              {colors.map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Region</label>
            <input type="text" value={form.region} onChange={(e) => set("region", e.target.value)} placeholder="Napa Valley" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Country</label>
            <input type="text" value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="USA" className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Price</label>
            <input type="number" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="29.99" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Quantity</label>
            <input type="number" min="0" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputClass}>
              {statusOptions.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Store */}
        <div>
          <label className={labelClass}>Store / Where Purchased</label>
          <input
            type="text"
            value={form.storeName}
            onChange={(e) => set("storeName", e.target.value)}
            list="store-list"
            placeholder="Type or select a store..."
            className={inputClass}
          />
          <datalist id="store-list">
            {stores.map((s) => (
              <option key={s.id} value={s.name} />
            ))}
          </datalist>
        </div>

        {/* List */}
        <div>
          <label className={labelClass}>Add to List</label>
          <select value={form.listId} onChange={(e) => set("listId", e.target.value)} className={inputClass}>
            <option value="">No list</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        {/* Occasion tags */}
        <div>
          <label className={labelClass}>Occasion</label>
          <div className="flex flex-wrap gap-2">
            {occasions.map((occ) => (
              <button
                key={occ}
                type="button"
                onClick={() => toggleOccasion(occ)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  form.occasion.includes(occ)
                    ? "bg-wine-700 text-white"
                    : "bg-wine-900/50 text-wine-400 border border-wine-800/40 hover:bg-wine-800/60"
                }`}
              >
                {occ}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={`${labelClass} mb-2`}>Your Rating</label>
          <StarRating rating={form.rating} onChange={(r) => set("rating", r)} />
        </div>

        <div>
          <label className={labelClass}>Tasting Notes</label>
          <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="Your personal tasting notes..." className={`${inputClass} resize-none`} />
        </div>

        {form.onlineRating && (
          <div className="bg-grape-900/30 border border-grape-800/40 rounded-xl p-4">
            <h3 className="text-sm font-medium text-grape-300 mb-1">Estimated Community Score</h3>
            <p className="text-2xl font-bold text-grape-200">{form.onlineRating}<span className="text-sm text-grape-400">/100</span></p>
          </div>
        )}

        {form.foodPairings && (
          <div className="bg-wine-900/40 border border-wine-800/40 rounded-xl p-4">
            <h3 className="text-sm font-medium text-wine-300 mb-1">Food Pairings</h3>
            <p className="text-sm text-wine-200">{form.foodPairings}</p>
          </div>
        )}

        {form.description && (
          <div className="bg-wine-900/40 border border-wine-800/40 rounded-xl p-4">
            <h3 className="text-sm font-medium text-wine-300 mb-1">AI Description</h3>
            <p className="text-sm text-wine-200">{form.description}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!form.name.trim() || saving}
          className="w-full bg-wine-700 hover:bg-wine-600 disabled:bg-wine-900 disabled:text-wine-700 text-white py-3 rounded-xl font-medium transition-colors shadow-lg shadow-wine-900/50"
        >
          {saving ? "Saving..." : "Save Wine"}
        </button>
      </form>
    </div>
  );
}
