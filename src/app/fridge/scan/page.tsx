"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BulkPhotoUploader from "@/components/BulkPhotoUploader";
import { useCategory } from "@/lib/CategoryContext";

type Stage = "upload" | "uploading" | "processing" | "done";

export default function ScanPage() {
  const router = useRouter();
  const { category, config } = useCategory();
  const [stage, setStage] = useState<Stage>("upload");
  const [batchId, setBatchId] = useState<number | null>(null);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [uploaded, setUploaded] = useState({ done: 0, total: 0 });
  const [itemsFound, setItemsFound] = useState(0);
  const [error, setError] = useState<string | null>(null);

  /** Read an error out of a failed response, whatever format it arrived in. */
  const errorFrom = async (res: Response, fallback: string) => {
    const body = await res.text().catch(() => "");
    try {
      const parsed = JSON.parse(body);
      if (parsed?.error) return String(parsed.error);
    } catch {
      // A payload rejected by the platform comes back as plain text, not JSON —
      // calling res.json() on it used to surface a JSON parse error instead of
      // anything the user could act on.
      if (res.status === 413 || /too large/i.test(body)) {
        return "That photo was too large to upload. Try re-taking it, or add photos in smaller groups.";
      }
    }
    return `${fallback} (HTTP ${res.status})`;
  };

  const startScan = async (photos: string[]) => {
    setStage("uploading");
    setUploaded({ done: 0, total: photos.length });
    setProgress({ processed: 0, total: photos.length });
    setError(null);

    try {
      // Create the batch empty, then send one photo per request. Posting the whole
      // array at once capped a scan at roughly 14 photos, because the combined
      // body ran past the ~4.2 MB request limit.
      const batchRes = await fetch("/api/scan/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      if (!batchRes.ok) throw new Error(await errorFrom(batchRes, "Could not start the scan"));
      const { id } = await batchRes.json();
      setBatchId(id);

      const failed: number[] = [];
      for (let i = 0; i < photos.length; i++) {
        const res = await fetch(`/api/scan/batch/${id}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photo: photos[i] }),
        });
        if (!res.ok) {
          // One bad photo should not lose the whole batch.
          failed.push(i + 1);
          console.warn(`photo ${i + 1} upload failed:`, await errorFrom(res, "upload failed"));
        }
        setUploaded({ done: i + 1, total: photos.length });
      }

      if (failed.length === photos.length) {
        throw new Error("None of the photos could be uploaded. Please try again.");
      }
      if (failed.length > 0) {
        setError(`Photo${failed.length > 1 ? "s" : ""} ${failed.join(", ")} could not be uploaded — carrying on with the rest.`);
      }

      setStage("processing");

      let done = false;
      while (!done) {
        const res = await fetch(`/api/scan/batch/${id}/process`, { method: "POST" });
        if (!res.ok) throw new Error(await errorFrom(res, "AI analysis failed"));
        const data = await res.json();

        if (data.error) {
          console.warn("Photo processing error:", data.error);
        }

        if (data.batch) {
          const analyzed = data.batch.items.filter((i: { status: string }) => i.status === "analyzed").length;
          setItemsFound(analyzed);
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
        Back to {config.fridgeLabel.toLowerCase()}
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{config.scanLabel}</h1>
        <p className="text-[13px] text-text-tertiary mt-0.5">
          {stage === "upload" && `Take photos of your ${config.itemNamePlural} or individual items`}
          {stage === "uploading" && `Uploading ${uploaded.total} photo${uploaded.total !== 1 ? "s" : ""}...`}
          {stage === "processing" && "AI is analyzing your photos..."}
          {stage === "done" && "Scan complete!"}
        </p>
      </div>

      {error && (
        <div className="bg-danger-muted border border-danger/15 rounded-xl p-3 mb-5">
          <p className="text-[13px] text-danger">{error}</p>
        </div>
      )}

      {stage === "upload" && <BulkPhotoUploader onPhotosReady={startScan} />}

      {stage === "uploading" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-text-primary font-medium">
              Uploading photo {Math.min(uploaded.done + 1, uploaded.total)} of {uploaded.total}
            </span>
            <span className="text-[12px] text-gold tabular-nums">
              {Math.round((uploaded.done / Math.max(uploaded.total, 1)) * 100)}%
            </span>
          </div>
          <div className="bg-surface-raised rounded-full h-2 overflow-hidden border border-border-subtle">
            <div
              className="bg-gold h-full rounded-full transition-all duration-300"
              style={{ width: `${(uploaded.done / Math.max(uploaded.total, 1)) * 100}%` }}
            />
          </div>
          <p className="text-[11px] text-text-muted">
            Photos are sent one at a time, so there is no limit on how many you can scan.
          </p>
        </div>
      )}

      {stage === "processing" && (
        <div className="space-y-5">
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

          <div className="bg-surface-raised rounded-xl border border-border-subtle p-5 text-center">
            <div className="animate-spin inline-block w-8 h-8 border-2 border-gold border-t-transparent rounded-full mb-3" />
            <p className="text-[14px] text-text-primary font-medium">Identifying items...</p>
            <p className="text-[12px] text-text-muted mt-1">
              {itemsFound > 0
                ? `Found ${itemsFound} item${itemsFound !== 1 ? "s" : ""} so far`
                : `Looking for ${config.itemNamePlural} in your photos`}
            </p>
          </div>

          <div className="bg-gold-subtle rounded-xl p-4">
            <p className="text-[11px] text-text-muted">
              Each photo is analyzed separately to identify individual items.
              Group shots work great — AI will pick out each {config.itemName}.
            </p>
          </div>
        </div>
      )}

      {stage === "done" && batchId && (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-2xl bg-success-muted flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-success">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-1">
            Found {itemsFound} item{itemsFound !== 1 ? "s" : ""}!
          </h2>
          <p className="text-[13px] text-text-tertiary mb-6">Review and confirm each item to add to your {config.fridgeLabel.toLowerCase()}</p>
          <button
            onClick={() => router.push(`/fridge/scan/${batchId}/review`)}
            className="bg-gold/90 hover:bg-gold text-bg px-6 py-3 rounded-lg text-[14px] font-semibold transition-colors"
          >
            Review Items
          </button>
        </div>
      )}
    </div>
  );
}
