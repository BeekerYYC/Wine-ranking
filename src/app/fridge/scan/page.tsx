"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BulkPhotoUploader from "@/components/BulkPhotoUploader";

type Stage = "upload" | "processing" | "done";

export default function ScanPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("upload");
  const [batchId, setBatchId] = useState<number | null>(null);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [bottlesFound, setBottlesFound] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const startScan = async (photos: string[]) => {
    setStage("processing");
    setProgress({ processed: 0, total: photos.length });
    setError(null);

    try {
      // Create batch
      const batchRes = await fetch("/api/scan/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos }),
      });
      const { id } = await batchRes.json();
      setBatchId(id);

      // Process one photo at a time
      let done = false;
      while (!done) {
        const res = await fetch(`/api/scan/batch/${id}/process`, { method: "POST" });
        const data = await res.json();

        if (data.error) {
          console.warn("Photo processing error:", data.error);
        }

        if (data.batch) {
          const analyzed = data.batch.items.filter((i: { status: string }) => i.status === "analyzed").length;
          setBottlesFound(analyzed);
          setProgress({ processed: data.batch.processed, total: data.batch.totalPhotos });
        }

        done = data.done;
      }

      setStage("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
      setStage("upload");
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <button onClick={() => router.push("/fridge")} className="text-text-muted hover:text-text-secondary text-[12px] mb-5 inline-flex items-center gap-1.5 transition-colors">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to fridge
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Scan Bottles</h1>
        <p className="text-[13px] text-text-tertiary mt-0.5">
          {stage === "upload" && "Take photos of your wine drawers or individual bottles"}
          {stage === "processing" && "AI is analyzing your photos..."}
          {stage === "done" && "Scan complete!"}
        </p>
      </div>

      {error && (
        <div className="bg-danger-muted border border-danger/15 rounded-xl p-3 mb-5">
          <p className="text-[13px] text-danger">{error}</p>
        </div>
      )}

      {/* Upload stage */}
      {stage === "upload" && <BulkPhotoUploader onPhotosReady={startScan} />}

      {/* Processing stage */}
      {stage === "processing" && (
        <div className="space-y-5">
          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] text-text-primary font-medium">
                Analyzing photo {progress.processed + 1} of {progress.total}...
              </span>
              <span className="text-[12px] text-gold tabular-nums">{Math.round((progress.processed / progress.total) * 100)}%</span>
            </div>
            <div className="bg-surface-raised rounded-full h-2 overflow-hidden border border-border-subtle">
              <div
                className="bg-gold h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(progress.processed / progress.total) * 100}%` }}
              />
            </div>
          </div>

          {/* Current status */}
          <div className="bg-surface-raised rounded-xl border border-border-subtle p-5 text-center">
            <div className="animate-spin inline-block w-8 h-8 border-2 border-gold border-t-transparent rounded-full mb-3" />
            <p className="text-[14px] text-text-primary font-medium">Identifying bottles...</p>
            <p className="text-[12px] text-text-muted mt-1">
              {bottlesFound > 0
                ? `Found ${bottlesFound} bottle${bottlesFound !== 1 ? "s" : ""} so far`
                : "Looking for wine labels in your photos"}
            </p>
          </div>

          {/* Tips */}
          <div className="bg-gold-subtle rounded-xl p-4">
            <p className="text-[11px] text-text-muted">
              Each photo is analyzed separately to identify individual bottles.
              Group shots of fridge drawers work great — AI will pick out each bottle.
            </p>
          </div>
        </div>
      )}

      {/* Done stage */}
      {stage === "done" && batchId && (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-2xl bg-success-muted flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-success">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-1">
            Found {bottlesFound} bottle{bottlesFound !== 1 ? "s" : ""}!
          </h2>
          <p className="text-[13px] text-text-tertiary mb-6">Review and confirm each bottle to add to your fridge</p>
          <button
            onClick={() => router.push(`/fridge/scan/${batchId}/review`)}
            className="bg-gold/90 hover:bg-gold text-bg px-6 py-3 rounded-lg text-[14px] font-semibold transition-colors"
          >
            Review Bottles
          </button>
        </div>
      )}
    </div>
  );
}
