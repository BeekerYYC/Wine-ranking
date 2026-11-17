"use client";

export default function StarRating({
  rating,
  onChange,
  readonly = false,
  size = "md",
}: {
  rating: number;
  onChange?: (r: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  // xl: thumb-sized stars for rating on a phone, with empty stars visible
  // against the dark sheet (the default empty colour nearly disappears there).
  const sizeClass = size === "sm" ? "text-sm" : size === "lg" ? "text-xl" : size === "xl" ? "text-[34px] px-1" : "text-base";
  const emptyClass = size === "xl" ? "text-text-muted/50" : "text-surface-highlight";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onChange?.(star === rating ? 0 : star);
          }}
          className={`${sizeClass} transition-all leading-none ${
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
          } ${star <= rating ? "text-gold" : emptyClass}`}
          aria-label={`${star} star${star !== 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
