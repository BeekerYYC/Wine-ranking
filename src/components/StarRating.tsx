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
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = size === "sm" ? "text-sm" : size === "lg" ? "text-xl" : "text-base";
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
          } ${star <= rating ? "text-gold" : "text-surface-highlight"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
