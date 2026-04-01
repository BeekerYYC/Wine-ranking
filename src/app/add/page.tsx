"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CameraCapture from "@/components/CameraCapture";
import StarRating from "@/components/StarRating";

const colors = ["red", "white", "rosé", "sparkling", "dessert", "orange"];
const occasions = ["date-night", "weeknight", "party", "gift", "celebration", "casual"];
const statusOptions = [
  { value: "collection", label: "In my collection" },
  { value: "wishlist", label: "Wishlist" },
  { value: "consumed", label: "Consumed" },
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
    name: "", winery: "", vintage: "", varietal: "", region: "", country: "",
    color: "", price: "", rating: 0, notes: "", description: "", quantity: "1",
    status: "collection", storeName: "", occasion: [] as string[],
    foodPairings: "", onlineRating: "", listId: "",
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
      if (!res.ok) throw new Error((await res.json()).error || "Analysis failed");
      const info = await res.json();
      setForm((f) => ({
        ...f,
        name: info.name || f.name, winery: info.winery || f.winery,
        vintage: info.vintage?.toString() || f.vintage, varietal: info.varietal || f.varietal,
        region: info.region || f.region, country: info.country || f.country,
        color: info.color || f.color, description: info.description || f.description,
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
      occasion: f.occasion.includes(occ) ? f.occasion.filter((o) => o !== occ) : [...f.occasion, occ],
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
        body: JSON.stringify({ ...form, occasion: form.occasion.join(","), imageData }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const wine = await res.json();
      router.push(`/wine/${wine.id}`);
    } catch {
      setError("Failed to save wine");
      setSaving(false);
    }
  };

  const input = "w-full px-3 py-2 rounded-lg bg-surface-raised border border-border text-[14px] text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/30 transition-all";
  const label = "block text-[13px] font-medium text-text-secondary mb-1.5";

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-semibold mb-6">Add wine</h1>

      {!imageData ? (
        <CameraCapture onCapture={handleCapture} />
      ) : (
        <div className="relative mb-5">
          <img src={imageData} alt="Wine label" className="w-full max-h-56 object-contain rounded-xl border border-border" />
          <button type="button" onClick={() => { setImageData(null); setForm((f) => ({ ...f, description: "", foodPairings: "", onlineRating: "" })); }}
            className="absolute top-2 right-2 bg-surface/80 backdrop-blur-sm text-text-secondary w-7 h-7 rounded-full flex items-center justify-center hover:text-text-primary text-sm transition-colors">
            ×
          </button>
        </div>
      )}

      {analyzing && (
        <div className="bg-accent-muted border border-accent/20 rounded-xl p-4 mb-5 text-center">
          <div className="animate-spin inline-block w-5 h-5 border-2 border-accent border-t-transparent rounded-full mb-2" />
          <p className="text-[14px] text-text-primary font-medium">Analyzing label...</p>
          <p className="text-[12px] text-text-tertiary">Extracting wine details with AI</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-5">
          <p className="text-[13px] text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 mt-5">
        <div>
          <label className={label}>Wine name <span className="text-accent">*</span></label>
          <input type="text" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Opus One 2019" className={input} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className={label}>Winery</label><input type="text" value={form.winery} onChange={(e) => set("winery", e.target.value)} className={input} /></div>
          <div><label className={label}>Vintage</label><input type="number" value={form.vintage} onChange={(e) => set("vintage", e.target.value)} placeholder="2020" className={input} /></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className={label}>Varietal</label><input type="text" value={form.varietal} onChange={(e) => set("varietal", e.target.value)} placeholder="Cabernet Sauvignon" className={input} /></div>
          <div>
            <label className={label}>Color</label>
            <select value={form.color} onChange={(e) => set("color", e.target.value)} className={input}>
              <option value="">Select...</option>
              {colors.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className={label}>Region</label><input type="text" value={form.region} onChange={(e) => set("region", e.target.value)} placeholder="Napa Valley" className={input} /></div>
          <div><label className={label}>Country</label><input type="text" value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="USA" className={input} /></div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div><label className={label}>Price</label><input type="number" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="29.99" className={input} /></div>
          <div><label className={label}>Qty</label><input type="number" min="0" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} className={input} /></div>
          <div>
            <label className={label}>Status</label>
            <select value={form.status} onChange={(e) => set("status", e.target.value)} className={input}>
              {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={label}>Store</label>
          <input type="text" value={form.storeName} onChange={(e) => set("storeName", e.target.value)} list="store-list" placeholder="Where purchased..." className={input} />
          <datalist id="store-list">{stores.map((s) => <option key={s.id} value={s.name} />)}</datalist>
        </div>

        {lists.length > 0 && (
          <div>
            <label className={label}>List</label>
            <select value={form.listId} onChange={(e) => set("listId", e.target.value)} className={input}>
              <option value="">No list</option>
              {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className={label}>Occasion</label>
          <div className="flex flex-wrap gap-1.5">
            {occasions.map((occ) => (
              <button key={occ} type="button" onClick={() => toggleOccasion(occ)}
                className={`px-2.5 py-1 rounded-full text-[12px] font-medium transition-all ${
                  form.occasion.includes(occ)
                    ? "bg-accent/15 text-accent ring-1 ring-accent/25"
                    : "text-text-tertiary bg-surface-overlay hover:text-text-secondary"
                }`}>
                {occ}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={`${label} mb-2`}>Rating</label>
          <StarRating rating={form.rating} onChange={(r) => set("rating", r)} />
        </div>

        <div>
          <label className={label}>Tasting notes</label>
          <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="Your impressions..." className={`${input} resize-none`} />
        </div>

        {/* AI results */}
        {(form.onlineRating || form.foodPairings || form.description) && (
          <div className="space-y-3 pt-2">
            <div className="text-[11px] uppercase tracking-wider text-text-tertiary font-medium">AI Analysis</div>
            {form.onlineRating && (
              <div className="flex items-center gap-3 bg-surface-overlay rounded-lg p-3">
                <span className="text-[11px] text-text-tertiary uppercase tracking-wider">Est. Score</span>
                <span className="text-lg font-semibold text-accent tabular-nums">{form.onlineRating}<span className="text-[12px] text-text-tertiary font-normal">/100</span></span>
              </div>
            )}
            {form.foodPairings && (
              <div className="bg-surface-overlay rounded-lg p-3">
                <p className="text-[11px] text-text-tertiary uppercase tracking-wider mb-2">Pairings</p>
                <p className="text-[13px] text-text-secondary leading-relaxed">{form.foodPairings}</p>
              </div>
            )}
            {form.description && (
              <div className="bg-surface-overlay rounded-lg p-3">
                <p className="text-[11px] text-text-tertiary uppercase tracking-wider mb-2">About</p>
                <p className="text-[13px] text-text-secondary leading-relaxed">{form.description}</p>
              </div>
            )}
          </div>
        )}

        <button type="submit" disabled={!form.name.trim() || saving}
          className="w-full bg-accent/90 hover:bg-accent disabled:opacity-30 text-surface py-2.5 rounded-xl text-[14px] font-medium transition-all mt-2">
          {saving ? "Saving..." : "Save wine"}
        </button>
      </form>
    </div>
  );
}
