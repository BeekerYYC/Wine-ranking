"use client";

import { useEffect, useState } from "react";

interface MissingWine {
  id: number;
  name: string;
  winery?: string | null;
  vintage?: number | null;
}

type Phase = "loading" | "ready" | "running" | "done" | "error";

export default function FindLabelsModal({
  category,
  onClose,
  onComplete,
}: {
  category: string;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [wines, setWines] = useState<MissingWine[]>([]);
  const [progress, setProgress] = useState({ done: 0, found: 0, failed: 0, current: "" });
  const [errors, setErrors] = useState<{ name: string; reason: string }[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/wines/missing-images?category=${category}&status=collection`)
      .then((r) => r.json())
      .then((data) => {
        setWines(data.wines || []);
        setPhase("ready");
      })
      .catch((e) => {
        setErrorMessage(e instanceof Error ? e.message : "Could not load wines");
        setPhase("error");
      });
  }, [category]);

  const handleRun = async () => {
    setPhase("running");
    const localErrors: { name: string; reason: string }[] = [];
    let found = 0;
    let failed = 0;

    for (let i = 0; i < wines.length; i++) {
      const w = wines[i];
      setProgress({ done: i, found, failed, current: w.name });
      try {
        const res = await fetch(`/api/wines/${w.id}/find-image`, { method: "POST" });
        if (res.ok) {
          found++;
        } else {
          failed++;
          const data = await res.json().catch(() => ({}));
          localErrors.push({ name: w.name, reason: data.error || `HTTP ${res.status}` });
        }
      } catch (e) {
        failed++;
        localErrors.push({ name: w.name, reason: e instanceof Error ? e.message : "Request failed" });
      }
    }

    setProgress({ done: wines.length, found, failed, current: "Done" });
    setErrors(localErrors);
    setPhase("done");
    onComplete();
  };

  const pct = wines.length > 0 ? Math.round((progress.done / wines.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface-raised border border-border rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-border-subtle flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold text-text-primary">Find label images</h2>
            <p className="text-[12px] text-text-tertiary mt-0.5">
              Search the web for a bottle/label photo for every wine missing one.
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary text-lg leading-none">×</button>
        </div>

        <div className="p-5">
          {phase === "loading" && (
            <div className="flex items-center gap-3">
              <div className="animate-spin w-4 h-4 border-2 border-gold border-t-transparent rounded-full" />
              <span className="text-[13px] text-text-tertiary">Checking your collection...</span>
            </div>
          )}

          {phase === "error" && (
            <p className="text-[13px] text-danger">{errorMessage}</p>
          )}

          {phase === "ready" && wines.length === 0 && (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-2xl bg-success-muted flex items-center justify-center mx-auto mb-3">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-success">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-[14px] font-semibold text-text-primary">All bottles have images</p>
              <p className="text-[12px] text-text-tertiary mt-0.5">Nothing to find.</p>
            </div>
          )}

          {phase === "ready" && wines.length > 0 && (
            <>
              <p className="text-[13px] text-text-secondary mb-3">
                <span className="text-gold font-semibold">{wines.length}</span> bottle{wines.length !== 1 ? "s" : ""} missing label images.
              </p>
              <ul className="text-[12px] text-text-tertiary space-y-1 max-h-48 overflow-y-auto mb-4 bg-surface rounded-lg p-3 border border-border-subtle">
                {wines.map((w) => (
                  <li key={w.id} className="flex justify-between gap-2">
                    <span className="truncate">{w.name}</span>
                    {w.winery && <span className="text-text-muted truncate">{w.winery}</span>}
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-text-muted mb-3">
                Each lookup takes ~5–10s. Roughly {Math.ceil((wines.length * 8) / 60)} minute{Math.ceil((wines.length * 8) / 60) !== 1 ? "s" : ""} total.
              </p>
              <button
                onClick={handleRun}
                className="w-full bg-gold/90 hover:bg-gold text-bg py-2.5 rounded-lg text-[13px] font-semibold transition-colors"
              >
                Find labels for {wines.length} bottle{wines.length !== 1 ? "s" : ""}
              </button>
            </>
          )}

          {phase === "running" && (
            <>
              <div className="bg-surface-raised rounded-full h-2 mb-2 overflow-hidden">
                <div className="bg-gold h-full rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[11px] text-text-muted tabular-nums mb-3">
                {progress.done} of {wines.length} · {progress.found} found · {progress.failed} failed
              </p>
              <p className="text-[13px] text-text-secondary truncate">
                <span className="text-text-muted">Searching:</span> {progress.current}
              </p>
            </>
          )}

          {phase === "done" && (
            <>
              <div className="w-12 h-12 rounded-2xl bg-success-muted flex items-center justify-center mx-auto mb-3">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-success">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-center text-[14px] font-semibold text-text-primary">
                Found <span className="text-gold">{progress.found}</span> of {wines.length}
              </p>
              {progress.failed > 0 && (
                <div className="mt-3 bg-danger-muted/40 border border-danger/15 rounded-lg p-3">
                  <p className="text-[11px] text-danger font-medium mb-1">{progress.failed} couldn't be found:</p>
                  <ul className="text-[11px] text-text-tertiary space-y-0.5 max-h-32 overflow-y-auto">
                    {errors.map((e, i) => <li key={i}>• {e.name}</li>)}
                  </ul>
                </div>
              )}
              <button
                onClick={onClose}
                className="w-full bg-gold/90 hover:bg-gold text-bg py-2.5 rounded-lg text-[13px] font-semibold transition-colors mt-4"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
