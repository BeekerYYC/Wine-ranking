"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BulkPhotoUploader from "@/components/BulkPhotoUploader";
import { useCategory } from "@/lib/CategoryContext";

type Stage = "upload" | "processing" | "done";

interface ProcessResponse {
  done?: boolean;
  error?: string;
  batch?: { processed: number; totalPhotos: number; items: { status: string }[] };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** POST and parse JSON; null when the request or the JSON fails (e.g. a gateway timeout page). */
async function postJson(url: string): Promise<{ ok: boolean; data: ProcessResponse | null }> {
  try {
    const res = await fetch(url, { method: "POST" });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: null };
  }
}

export default function ScanPage() {
  const router = useRouter();
  const { category, config } = useCategory();
  const [stage, setStage] = useState<Stage>("upload");
  const [batchId, setBatchId] = useState<number | null>(null);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [itemsFound, setItemsFound] = useState(0);
  const [unreadPhotos, setUnreadPhotos] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Kept so a failed scan returns to the upload screen with the photos still there.
  const [photos, setPhotos] = useState<string[]>([]);

  const startScan = async (selected: string[]) => {
    setPhotos(selected);
    setStage("processing");
    setProgress({ processed: 0, total: selected.length });
    setItemsFound(0);
    setUnreadPhotos(0);
    setError(null);

    const backToUpload = (message: string) => {
      setError(message);
      setStage("upload");
    };

    let id: number;
    try {
      const batchRes = await fetch("/api/scan/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: selected, category }),
      });
      if (batchRes.status === 413) {
        return backToUpload("That's too many photos to upload at once. Try scanning about 20 at a time.");
      }
      const data = await batchRes.json().catch(() => null);
      if (!batchRes.ok || typeof data?.id !== "number") {
        return backToUpload(data?.error || `Couldn't start the scan (HTTP ${batchRes.status}). Your photos are still here — try again.`);
      }
      id = data.id;
      setBatchId(id);
    } catch {
      return backToUpload("Couldn't reach the server. Your photos are still here — try again.");
    }

    // Analyze one photo per request until the server says it's done. A photo
    // whose request keeps failing (e.g. timing out) is retried twice, then
    // skipped, so one bad photo can't stall or abort the whole scan. The cap
    // makes an endless loop impossible whatever the server returns.
    let found = 0;
    let unread = 0;
    let failuresInARow = 0;
    const maxRequests = selected.length * 4 + 10;

    for (let i = 0; i < maxRequests; i++) {
      const skip = failuresInARow >= 3;
      const { ok, data } = await postJson(`/api/scan/batch/${id}/process${skip ? "?skip=1" : ""}`);

      if (ok && data && typeof data.done === "boolean") {
        failuresInARow = 0;
        if (skip || data.error) unread++;
        if (data.batch) {
          found = data.batch.items.filter((it) => it.status === "analyzed").length;
          setItemsFound(found);
          setProgress({ processed: data.batch.processed, total: data.batch.totalPhotos });
        }
        setUnreadPhotos(unread);
        if (data.done) break;
        continue;
      }

      // Our own error (e.g. the API key isn't configured) won't fix itself on retry.
      if (!ok && data?.error && !skip) {
        if (found > 0) {
          setError(`${data.error}. Review what was found so far.`);
          setStage("done");
        } else {
          backToUpload(data.error);
        }
        return;
      }

      failuresInARow++;
      await sleep(1500 * Math.min(failuresInARow, 3));
    }

    if (found === 0) {
      return backToUpload(`No ${config.itemNamePlural} could be identified in these photos. Your photos are still here — try again or use clearer shots.`);
    }
    setStage("done");
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
          {stage === "processing" && "AI is analyzing your photos..."}
          {stage === "done" && "Scan complete!"}
        </p>
      </div>

      {error && (
        <div className="bg-danger-muted border border-danger/15 rounded-xl p-3 mb-5">
          <p className="text-[13px] text-danger">{error}</p>
        </div>
      )}

      {stage === "upload" && <BulkPhotoUploader onPhotosReady={startScan} initialPhotos={photos} />}

      {stage === "processing" && (
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] text-text-primary font-medium">
                Analyzing photo {Math.min(progress.processed + 1, progress.total)} of {progress.total}...
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
          {unreadPhotos > 0 && (
            <p className="text-[12px] text-text-muted -mt-4 mb-6">
              {unreadPhotos} photo{unreadPhotos !== 1 ? "s" : ""} couldn&apos;t be read and {unreadPhotos !== 1 ? "were" : "was"} skipped.
            </p>
          )}
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
