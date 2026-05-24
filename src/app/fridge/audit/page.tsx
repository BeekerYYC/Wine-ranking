"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCategory } from "@/lib/CategoryContext";

type Phase = "input" | "analyzing" | "review" | "applying" | "done";

interface DetectedBottle {
  name: string;
  winery: string | null;
  vintage: number | null;
  varietal: string | null;
  color: string | null;
  quantity: number;
  confidence: number;
}

interface DiffResponse {
  photosAnalyzed: number;
  totalDetectedBottles: number;
  totalDbBottles: number;
  matches: { wineId: number; name: string; dbQty: number; detectedQty: number }[];
  quantityMismatches: { wineId: number; name: string; dbQty: number; detectedQty: number; delta: number }[];
  missingFromPhotos: { wineId: number; name: string; winery: string | null; vintage: number | null; color: string | null; dbQty: number }[];
  newInPhotos: DetectedBottle[];
}

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 1280;
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function CellarAuditPage() {
  const router = useRouter();
  const { category, config } = useCategory();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("input");
  const [photos, setPhotos] = useState<string[]>([]);
  const [diff, setDiff] = useState<DiffResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Per-row action state — key by wineId (for db rows) or "new-N" (for newInPhotos)
  const [missingActions, setMissingActions] = useState<Record<number, "consume" | "keep">>({});
  const [mismatchActions, setMismatchActions] = useState<Record<number, "adjust" | "keep">>({});
  const [newActions, setNewActions] = useState<Record<number, "add" | "skip">>({});
  const [applyResult, setApplyResult] = useState<{ applied: number; failed: number } | null>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const resized = await Promise.all(files.map(resizeImage));
    setPhotos((prev) => [...prev, ...resized]);
    e.target.value = "";
  };

  const removePhoto = (idx: number) => setPhotos((prev) => prev.filter((_, i) => i !== idx));

  const runAudit = async () => {
    if (photos.length === 0) {
      setError("Add at least one photo");
      return;
    }
    setError(null);
    setPhase("analyzing");
    try {
      const res = await fetch("/api/audit/diff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: photos, category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Audit failed");
      setDiff(data);

      // Default actions: suggest consume for missing, adjust for mismatch, add for new
      const ma: Record<number, "consume" | "keep"> = {};
      data.missingFromPhotos.forEach((m: { wineId: number }) => { ma[m.wineId] = "consume"; });
      setMissingActions(ma);

      const qa: Record<number, "adjust" | "keep"> = {};
      data.quantityMismatches.forEach((m: { wineId: number }) => { qa[m.wineId] = "adjust"; });
      setMismatchActions(qa);

      const na: Record<number, "add" | "skip"> = {};
      data.newInPhotos.forEach((_: unknown, i: number) => { na[i] = "add"; });
      setNewActions(na);

      setPhase("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Audit failed");
      setPhase("input");
    }
  };

  const applyChanges = async () => {
    if (!diff) return;
    setPhase("applying");

    const actions: Record<string, unknown>[] = [];

    diff.missingFromPhotos.forEach((m) => {
      if (missingActions[m.wineId] === "consume") {
        actions.push({ type: "decrement", wineId: m.wineId, deltaQty: m.dbQty });
      }
    });

    diff.quantityMismatches.forEach((m) => {
      if (mismatchActions[m.wineId] === "adjust") {
        if (m.delta < 0) {
          actions.push({ type: "decrement", wineId: m.wineId, deltaQty: -m.delta });
        } else if (m.delta > 0) {
          actions.push({ type: "increment", wineId: m.wineId, deltaQty: m.delta });
        }
      }
    });

    diff.newInPhotos.forEach((d, i) => {
      if (newActions[i] === "add") {
        actions.push({
          type: "create",
          newWine: {
            name: d.name,
            winery: d.winery,
            vintage: d.vintage,
            varietal: d.varietal,
            color: d.color,
            quantity: d.quantity,
          },
        });
      }
    });

    try {
      const res = await fetch("/api/audit/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions, category }),
      });
      const data = await res.json();
      setApplyResult({ applied: data.applied || 0, failed: data.failed || 0 });
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Apply failed");
      setPhase("review");
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg bg-surface-raised border border-border-subtle text-[13px] text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/20 transition-all";
  const labelClass = "block text-[12px] font-medium text-text-tertiary mb-1.5 uppercase tracking-wider";

  // --- INPUT PHASE ---
  if (phase === "input") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Cellar audit</h1>
          <p className="text-[13px] text-text-tertiary mt-0.5">
            Photograph each shelf or area of your {config.fridgeLabel.toLowerCase()}. AI counts what's actually there and reconciles it with what's in your database.
          </p>
        </div>

        {error && (
          <div className="bg-danger-muted border border-danger/15 rounded-xl p-3 mb-4">
            <p className="text-[13px] text-danger">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className={labelClass}>Photos</label>
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
                <p className="text-[13px] font-semibold text-text-primary">Choose photos of every shelf</p>
                <p className="text-[11px] text-text-muted mt-0.5">Multi-select supported. Try to cover all bottles with minimal overlap.</p>
              </button>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {photos.map((p, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border-subtle group">
                    <img src={p} alt={`Shelf ${i + 1}`} className="w-full h-full object-cover" />
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
            <p className="text-[11px] text-text-muted mt-2">
              Overlapping photos are fine — duplicates are deduped by max-count. Skip blurry or very obscured bottles; AI will only count what it can confidently identify.
            </p>
          </div>

          <button
            type="button"
            onClick={runAudit}
            disabled={photos.length === 0}
            className="w-full bg-gold/90 hover:bg-gold disabled:opacity-30 text-bg py-3 rounded-lg text-[14px] font-semibold transition-all"
          >
            Run audit ({photos.length} photo{photos.length !== 1 ? "s" : ""})
          </button>
        </div>
      </div>
    );
  }

  // --- ANALYZING PHASE ---
  if (phase === "analyzing") {
    return (
      <div className="max-w-lg mx-auto py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gold-muted flex items-center justify-center mx-auto mb-4">
          <div className="animate-spin w-7 h-7 border-2 border-gold border-t-transparent rounded-full" />
        </div>
        <h1 className="text-xl font-bold text-text-primary mb-2">Analyzing {photos.length} photo{photos.length !== 1 ? "s" : ""}</h1>
        <p className="text-[13px] text-text-tertiary">Running Claude vision across all photos in parallel...</p>
        <p className="text-[11px] text-text-muted mt-2">~5–10s per photo</p>
      </div>
    );
  }

  // --- REVIEW PHASE ---
  if (phase === "review" && diff) {
    const detectedTotal = diff.totalDetectedBottles;
    const dbTotal = diff.totalDbBottles;
    const diffSize = dbTotal - detectedTotal;

    return (
      <div className="max-w-3xl mx-auto pb-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Review changes</h1>
            <p className="text-[13px] text-text-tertiary mt-0.5">
              Detected <span className="text-text-primary font-semibold">{detectedTotal}</span> bottles · DB has <span className="text-text-primary font-semibold">{dbTotal}</span>
              {diffSize !== 0 && (
                <> · <span className={diffSize > 0 ? "text-danger" : "text-success"}>{diffSize > 0 ? `${diffSize} missing` : `+${-diffSize} new`}</span></>
              )}
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
            Re-shoot
          </button>
        </div>

        {error && (
          <div className="bg-danger-muted border border-danger/15 rounded-xl p-3 mb-4">
            <p className="text-[13px] text-danger">{error}</p>
          </div>
        )}

        {/* Missing from photos */}
        {diff.missingFromPhotos.length > 0 && (
          <Section title={`In DB but not seen in photos (${diff.missingFromPhotos.length})`} subtitle="Likely consumed. Will be decremented and logged.">
            {diff.missingFromPhotos.map((m) => (
              <Row key={m.wineId}>
                <RowInfo
                  title={m.name}
                  detail={[m.winery, m.vintage ? String(m.vintage) : null].filter(Boolean).join(" · ")}
                  badge={`DB: ${m.dbQty}`}
                />
                <ActionToggle
                  value={missingActions[m.wineId] || "consume"}
                  options={[
                    { value: "consume", label: "Mark consumed" },
                    { value: "keep", label: "Keep as-is" },
                  ]}
                  onChange={(v) => setMissingActions((s) => ({ ...s, [m.wineId]: v as "consume" | "keep" }))}
                />
              </Row>
            ))}
          </Section>
        )}

        {/* Quantity mismatches */}
        {diff.quantityMismatches.length > 0 && (
          <Section title={`Count mismatch (${diff.quantityMismatches.length})`} subtitle="DB and photos disagree on how many.">
            {diff.quantityMismatches.map((m) => (
              <Row key={m.wineId}>
                <RowInfo
                  title={m.name}
                  detail={`DB has ${m.dbQty}, photos show ${m.detectedQty}`}
                  badge={m.delta > 0 ? `+${m.delta}` : `${m.delta}`}
                  badgeTone={m.delta > 0 ? "success" : "danger"}
                />
                <ActionToggle
                  value={mismatchActions[m.wineId] || "adjust"}
                  options={[
                    { value: "adjust", label: `Set to ${m.detectedQty}` },
                    { value: "keep", label: "Keep DB count" },
                  ]}
                  onChange={(v) => setMismatchActions((s) => ({ ...s, [m.wineId]: v as "adjust" | "keep" }))}
                />
              </Row>
            ))}
          </Section>
        )}

        {/* New in photos */}
        {diff.newInPhotos.length > 0 && (
          <Section title={`In photos but not in DB (${diff.newInPhotos.length})`} subtitle="New bottles AI saw that aren't in your collection.">
            {diff.newInPhotos.map((d, i) => (
              <Row key={i}>
                <RowInfo
                  title={d.name}
                  detail={[d.winery, d.vintage ? String(d.vintage) : null, d.varietal].filter(Boolean).join(" · ")}
                  badge={`x${d.quantity}`}
                  confidence={d.confidence}
                />
                <ActionToggle
                  value={newActions[i] || "add"}
                  options={[
                    { value: "add", label: "Add to cellar" },
                    { value: "skip", label: "Skip" },
                  ]}
                  onChange={(v) => setNewActions((s) => ({ ...s, [i]: v as "add" | "skip" }))}
                />
              </Row>
            ))}
          </Section>
        )}

        {/* Matches (collapsed by default) */}
        {diff.matches.length > 0 && (
          <details className="bg-surface-raised border border-border-subtle rounded-xl mb-4">
            <summary className="cursor-pointer px-4 py-3 text-[13px] text-text-secondary font-medium">
              ✓ {diff.matches.length} wines match exactly
            </summary>
            <div className="border-t border-border-subtle">
              {diff.matches.map((m) => (
                <div key={m.wineId} className="px-4 py-2 text-[12px] text-text-tertiary border-b border-border-subtle last:border-b-0 flex justify-between">
                  <span>{m.name}</span>
                  <span className="tabular-nums">×{m.dbQty}</span>
                </div>
              ))}
            </div>
          </details>
        )}

        {diff.missingFromPhotos.length === 0 && diff.quantityMismatches.length === 0 && diff.newInPhotos.length === 0 && (
          <div className="bg-success-muted/40 border border-success/15 rounded-xl p-4 text-center mt-4">
            <p className="text-[13px] text-success font-semibold">Cellar matches your photos exactly.</p>
            <p className="text-[11px] text-text-tertiary mt-1">Nothing to apply.</p>
          </div>
        )}

        <button
          type="button"
          onClick={applyChanges}
          disabled={diff.missingFromPhotos.length === 0 && diff.quantityMismatches.length === 0 && diff.newInPhotos.length === 0}
          className="w-full bg-gold/90 hover:bg-gold disabled:opacity-30 text-bg py-3 rounded-lg text-[14px] font-semibold transition-all mt-6"
        >
          Apply changes
        </button>
      </div>
    );
  }

  // --- APPLYING ---
  if (phase === "applying") {
    return (
      <div className="max-w-lg mx-auto py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gold-muted flex items-center justify-center mx-auto mb-4">
          <div className="animate-spin w-7 h-7 border-2 border-gold border-t-transparent rounded-full" />
        </div>
        <h1 className="text-xl font-bold text-text-primary mb-2">Updating cellar</h1>
        <p className="text-[13px] text-text-tertiary">Applying changes...</p>
      </div>
    );
  }

  // --- DONE ---
  return (
    <div className="max-w-lg mx-auto text-center py-12">
      <div className="w-16 h-16 rounded-2xl bg-success-muted flex items-center justify-center mx-auto mb-4">
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-success">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-text-primary mb-2">Audit complete</h1>
      <p className="text-[13px] text-text-tertiary mb-1">
        Applied <span className="text-gold font-semibold">{applyResult?.applied ?? 0}</span> change{(applyResult?.applied ?? 0) !== 1 ? "s" : ""}
        {applyResult?.failed ? ` · ${applyResult.failed} failed` : ""}
      </p>
      <button onClick={() => router.push("/fridge")} className="bg-gold/90 hover:bg-gold text-bg px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-colors mt-6">
        View {config.fridgeLabel}
      </button>
    </div>
  );
}

// ───── helpers ─────

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2">
        <h2 className="text-[13px] font-semibold text-text-primary">{title}</h2>
        {subtitle && <p className="text-[11px] text-text-muted mt-0.5">{subtitle}</p>}
      </div>
      <div className="bg-surface-raised border border-border-subtle rounded-xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-3 border-b border-border-subtle last:border-b-0 flex items-center justify-between gap-3">{children}</div>;
}

function RowInfo({ title, detail, badge, badgeTone, confidence }: { title: string; detail?: string; badge?: string; badgeTone?: "danger" | "success"; confidence?: number }) {
  const tone = badgeTone === "success" ? "text-success bg-success-muted" : badgeTone === "danger" ? "text-danger bg-danger-muted" : "text-gold bg-gold-muted";
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-medium text-text-primary truncate">{title}</span>
        {badge && <span className={`text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded ${tone}`}>{badge}</span>}
        {confidence != null && (
          <span className={`text-[10px] tabular-nums ${confidence >= 0.8 ? "text-success" : confidence >= 0.5 ? "text-gold" : "text-danger"}`}>
            {Math.round(confidence * 100)}%
          </span>
        )}
      </div>
      {detail && <p className="text-[11px] text-text-tertiary truncate mt-0.5">{detail}</p>}
    </div>
  );
}

function ActionToggle<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="bg-surface border border-border-subtle text-[11px] text-text-primary px-2 py-1 rounded focus:outline-none focus:border-gold/30"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
