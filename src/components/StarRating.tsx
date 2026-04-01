"use client";

export default function StarRating({
  rating,
  onChange,
  readonly = false,
}: {
  rating: number;
  onChange?: (r: number) => void;
  readonly?: boolean;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star === rating ? 0 : star)}
          className={`text-2xl transition-colors ${
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
          } ${star <= rating ? "text-amber-500" : "text-stone-300"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
