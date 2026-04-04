"use client";

import { useState } from "react";
import StarRating from "./StarRating";
import { useCategory } from "@/lib/CategoryContext";

export default function ConsumeModal({
  wine,
  onConfirm,
  onClose,
}: {
  wine: { id: number; name: string; vintage?: number | null };
  onConfirm: (data: { rating?: number; notes?: string }) => void;
  onClose: () => void;
}) {
  const { config } = useCategory();
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleConfirm = () => {
    setSaving(true);
    onConfirm({ rating: rating || undefined, notes: notes || undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-raised border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 sm:mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-semibold text-text-primary">{config.consumeVerb}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary text-lg leading-none">×</button>
        </div>

        <p className="text-[13px] text-text-secondary mb-4">
          Opening <span className="text-text-primary font-medium">{wine.name}</span>
          {wine.vintage ? ` (${wine.vintage})` : ""}. Enjoy!
        </p>

        <div className="mb-4">
          <label className="block text-[11px] text-text-muted uppercase tracking-wider font-medium mb-2">Rate this {config.itemName}</label>
          <StarRating rating={rating} onChange={setRating} size="lg" />
        </div>

        <div className="mb-5">
          <label className="block text-[11px] text-text-muted uppercase tracking-wider font-medium mb-1.5">Tasting notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="How was it?"
            className="w-full px-3 py-2 rounded-lg bg-surface border border-border-subtle text-[13px] text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/20 resize-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 bg-gold/90 hover:bg-gold disabled:opacity-50 text-bg py-2.5 rounded-lg text-[13px] font-semibold transition-all"
          >
            {saving ? "Saving..." : "Confirm"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-text-muted hover:text-text-tertiary text-[13px] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
