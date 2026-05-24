"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCategory } from "@/lib/CategoryContext";

interface ReceiptItem {
  name: string;
  winery: string | null;
  vintage: number | null;
  varietal: string | null;
  region: string | null;
  country: string | null;
  color: string | null;
  price: number | null;
  quantity: number;
}

type Phase = "input" | "review" | "saving" | "done";

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 1600; // receipts have small text, keep more detail than label photos
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function ReceiptEntryPage() {
  const router = useRouter();
  const { category, config } = useCategory();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("input");
  const [photos, setPhotos] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [storeName, setStoreName] = useState("");
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, current: "" });
  const [enrichErrors, setEnrichErrors] = useState<string[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  const inputClass = "w-full px-3 py-2 rounded-lg bg-surface-raised border border-border-subtle text-[13px] text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/20 transition-all";
  const tableInputClass = "w-full px-2 py-1 rounded bg-surface border border-border-subtle text-[12px] text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/20 transition-all";
  const labelClass = "block text-[12px] font-medium text-text-tertiary mb-1.5 uppercase tracking-wider";

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const resized = await Promise.all(files.map(resizeImage));
    setPhotos((prev) => [...prev, ...resized]);
    e.target.value = "";
  };

  const removePhoto = (idx: number) => setPhotos((prev) => prev.filter((_, i) => i !== idx));

  const handleParse = async () => {
    if (photos.length === 0 && !text.trim()) {
      setError("Add a photo or paste the receipt text first");
      return;
    }
    setError(null);
    setParsing(true);
    try {
      const res = await fetch("/api/receipt/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: photos, text, category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Parse failed");
      if (!Array.isArray(data.items) || data.items.length === 0) {
        throw new Error("No items found on the receipt");
      }
      if (data.storeName && !storeName) setStoreName(data.storeName);
      setItems(data.items);
      setPhase("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Parse failed");
    } finally {
      setParsing(false);
    }
  };

  const updateItem = (idx: number, patch: Partial<ReceiptItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const addItem = () => setItems((prev) => [
    ...prev,
    { name: "", winery: null, vintage: null, varietal: null, region: null, country: null, color: null, price: null, quantity: 1 },
  ]);

  const handleSave = async () => {
    const valid = items.filter((it) => it.name.trim().length > 0);
    if (valid.length === 0) {
      setError("Add at least one item with a name");
      return;
    }
    setError(null);
    setPhase("saving");
    setProgress({ done: 0, total: valid.length, current: "Creating inventory..." });
    setEnrichErrors([]);

    try {
      const res = await fetch("/api/receipt/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeName, items: valid, category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      const created: { wineId: number; name: string; action: string }[] = data.results;
      setSavedCount(created.length);

      // Enrich each wine sequentially with progress
      const errs: string[] = [];
      for (let i = 0; i < created.length; i++) {
        const w = created[i];
        setProgress({ done: i, total: created.length, current: `Enriching: ${w.name}` });
        try {
          const er = await fetch(`/api/wines/${w.wineId}/enrich`, { method: "POST" });
          if (!er.ok) {
            const ed = await er.json().catch(() => ({}));
            errs.push(`${w.name}: ${ed.error || "enrichment failed"}`);
          }
        } catch (e) {
          errs.push(`${w.name}: ${e instanceof Error ? e.message : "failed"}`);
        }
      }
      setProgress({ done: created.length, total: created.length, current: "Done" });
      setEnrichErrors(errs);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setPhase("review");
    }
  };

  const totalQty = items.reduce((n, it) => n + (it.quantity || 0), 0);

  // --- INPUT PHASE ---
  if (phase === "input") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Add from receipt</h1>
          <p className="text-[13px] text-text-tertiary mt-0.5">
            Upload a photo of your receipt or paste the text — AI will identify every {config.itemName} and add them to your {config.fridgeLabel.toLowerCase()}.
          </p>
        </div>

        {error && (
          <div className="bg-danger-muted border border-danger/15 rounded-xl p-3 mb-4">
            <p className="text-[13px] text-danger">{error}</p>
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className={labelClass}>Store (optional — we'll guess from the receipt)</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="e.g. Kensington Wine Market"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Receipt photo(s)</label>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
            {photos.length === 0 ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border border-dashed border-border hover:border-gold/40 rounded-xl p-6 text-center hover:bg-gold-subtle transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-gold-muted flex items-center justify-center mx-auto mb-2">
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-gold">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                  </svg>
                </div>
                <p className="text-[13px] font-semibold text-text-primary">Choose receipt photos</p>
                <p className="text-[11px] text-text-muted mt-0.5">Long receipts? Upload multiple — they'll be combined.</p>
              </button>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {photos.map((p, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border-subtle group">
                    <img src={p} alt={`Receipt ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-bg/80 text-text-secondary flex items-center justify-center text-xs hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                    >×</button>
                    <div className="absolute bottom-1 left-1 text-[10px] bg-bg/70 text-text-secondary px-1 rounded">{i + 1}</div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-lg border border-dashed border-border hover:border-gold/40 flex items-center justify-center hover:bg-gold-subtle transition-all"
                >
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-text-muted">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-text-muted uppercase tracking-wider">
            <div className="flex-1 h-px bg-border-subtle" />
            or
            <div className="flex-1 h-px bg-border-subtle" />
          </div>

          <div>
            <label className={labelClass}>Paste receipt text</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder="Paste each line from the receipt — name, price, quantity. AI will figure out the rest."
              className={`${inputClass} resize-none font-mono text-[12px]`}
            />
          </div>

          <button
            type="button"
            onClick={handleParse}
            disabled={parsing || (photos.length === 0 && !text.trim())}
            className="w-full bg-gold/90 hover:bg-gold disabled:opacity-30 text-bg py-3 rounded-lg text-[14px] font-semibold transition-all flex items-center justify-center gap-2"
          >
            {parsing ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-bg border-t-transparent rounded-full" />
                Parsing receipt...
              </>
            ) : (
              "Parse receipt"
            )}
          </button>
        </div>
      </div>
    );
  }

  // --- REVIEW PHASE ---
  if (phase === "review") {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Review receipt</h1>
            <p className="text-[13px] text-text-tertiary mt-0.5">
              {items.length} items · {totalQty} bottles. Edit anything, then save.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPhase("input")}
            className="text-text-muted hover:text-text-secondary text-[12px] flex items-center gap-1.5 transition-colors mt-2"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>

        {error && (
          <div className="bg-danger-muted border border-danger/15 rounded-xl p-3 mb-4">
            <p className="text-[13px] text-danger">{error}</p>
          </div>
        )}

        <div className="mb-4">
          <label className={labelClass}>Store</label>
          <input
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="Store name"
            className={inputClass}
          />
        </div>

        <div className="overflow-x-auto bg-surface-raised rounded-xl border border-border-subtle">
          <table className="w-full text-[12px]">
            <thead className="bg-surface text-text-muted text-[10px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-2 py-2 font-medium">Name</th>
                <th className="text-left px-2 py-2 font-medium">{config.producerLabel}</th>
                <th className="text-left px-2 py-2 font-medium">{config.varietalLabel}</th>
                <th className="text-left px-2 py-2 font-medium">{config.colorLabel}</th>
                <th className="text-left px-2 py-2 font-medium">Region</th>
                <th className="text-left px-2 py-2 font-medium">Country</th>
                <th className="text-left px-2 py-2 font-medium w-20">Vintage</th>
                <th className="text-left px-2 py-2 font-medium w-20">Price</th>
                <th className="text-left px-2 py-2 font-medium w-16">Qty</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="border-t border-border-subtle">
                  <td className="px-2 py-1.5">
                    <input value={it.name} onChange={(e) => updateItem(i, { name: e.target.value })} className={tableInputClass} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={it.winery ?? ""} onChange={(e) => updateItem(i, { winery: e.target.value || null })} className={tableInputClass} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={it.varietal ?? ""} onChange={(e) => updateItem(i, { varietal: e.target.value || null })} className={tableInputClass} />
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={it.color ?? ""}
                      onChange={(e) => updateItem(i, { color: e.target.value || null })}
                      className={tableInputClass}
                    >
                      <option value="">—</option>
                      {config.types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={it.region ?? ""} onChange={(e) => updateItem(i, { region: e.target.value || null })} className={tableInputClass} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={it.country ?? ""} onChange={(e) => updateItem(i, { country: e.target.value || null })} className={tableInputClass} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      value={it.vintage ?? ""}
                      onChange={(e) => updateItem(i, { vintage: e.target.value ? parseInt(e.target.value) : null })}
                      className={tableInputClass}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      step="0.01"
                      value={it.price ?? ""}
                      onChange={(e) => updateItem(i, { price: e.target.value ? parseFloat(e.target.value) : null })}
                      className={tableInputClass}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      min="1"
                      value={it.quantity}
                      onChange={(e) => updateItem(i, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                      className={tableInputClass}
                    />
                  </td>
                  <td className="px-1">
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      title="Remove"
                      className="text-text-muted hover:text-danger text-base px-1.5 py-0.5 rounded transition-colors"
                    >×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4 gap-3">
          <button
            type="button"
            onClick={addItem}
            className="text-[12px] text-text-tertiary hover:text-gold transition-colors flex items-center gap-1.5"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add row
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="bg-gold/90 hover:bg-gold text-bg px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-colors"
          >
            Save & enrich all
          </button>
        </div>
      </div>
    );
  }

  // --- SAVING PHASE ---
  if (phase === "saving") {
    const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
    return (
      <div className="max-w-lg mx-auto py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gold-muted flex items-center justify-center mx-auto mb-4">
          <div className="animate-spin w-7 h-7 border-2 border-gold border-t-transparent rounded-full" />
        </div>
        <h1 className="text-xl font-bold text-text-primary mb-2">Saving your receipt</h1>
        <p className="text-[13px] text-text-tertiary mb-6">{progress.current}</p>
        <div className="bg-surface-raised rounded-full h-2 mb-2 overflow-hidden">
          <div className="bg-gold h-full rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[11px] text-text-muted tabular-nums">
          {progress.done} of {progress.total} enriched
        </p>
      </div>
    );
  }

  // --- DONE PHASE ---
  return (
    <div className="max-w-lg mx-auto text-center py-12">
      <div className="w-16 h-16 rounded-2xl bg-success-muted flex items-center justify-center mx-auto mb-4">
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-success">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-text-primary mb-2">Receipt added</h1>
      <p className="text-[13px] text-text-tertiary mb-1">
        Added <span className="text-gold font-semibold">{savedCount}</span> {config.itemNamePlural} to your {config.fridgeLabel.toLowerCase()}
      </p>
      {enrichErrors.length > 0 && (
        <div className="mt-4 bg-danger-muted/50 border border-danger/15 rounded-xl p-3 text-left">
          <p className="text-[12px] text-danger font-medium mb-1">
            {enrichErrors.length} enrichment {enrichErrors.length === 1 ? "issue" : "issues"} (wines were still saved)
          </p>
          <ul className="text-[11px] text-text-tertiary space-y-0.5 max-h-32 overflow-y-auto">
            {enrichErrors.map((e, i) => <li key={i}>• {e}</li>)}
          </ul>
        </div>
      )}
      <div className="flex gap-3 justify-center mt-6">
        <button onClick={() => router.push("/fridge")} className="bg-gold/90 hover:bg-gold text-bg px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-colors">
          View {config.fridgeLabel}
        </button>
        <button onClick={() => { setPhase("input"); setPhotos([]); setText(""); setItems([]); setStoreName(""); setSavedCount(0); setEnrichErrors([]); }}
          className="bg-surface-raised hover:bg-surface-overlay border border-border-subtle text-text-secondary px-5 py-2.5 rounded-lg text-[13px] font-medium transition-all">
          Add another receipt
        </button>
      </div>
    </div>
  );
}
