import StarRating from "./StarRating";

const colorBadge: Record<string, string> = {
  red: "bg-red-800 text-white",
  white: "bg-yellow-100 text-yellow-800 border border-yellow-300",
  rosé: "bg-pink-200 text-pink-800",
  sparkling: "bg-sky-100 text-sky-800 border border-sky-300",
  dessert: "bg-amber-200 text-amber-800",
  orange: "bg-orange-200 text-orange-800",
};

interface Wine {
  id: number;
  name: string;
  winery?: string | null;
  vintage?: number | null;
  varietal?: string | null;
  region?: string | null;
  country?: string | null;
  color?: string | null;
  price?: number | null;
  rating?: number | null;
  imageData?: string | null;
}

export default function WineCard({ wine }: { wine: Wine }) {
  return (
    <a
      href={`/wine/${wine.id}`}
      className="block bg-white rounded-xl shadow-sm border border-stone-200 hover:shadow-md transition-shadow overflow-hidden"
    >
      <div className="flex gap-4 p-4">
        {wine.imageData && (
          <img
            src={wine.imageData}
            alt={wine.name}
            className="w-16 h-20 object-cover rounded-lg flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-stone-900 truncate">
              {wine.name}
            </h3>
            {wine.vintage && (
              <span className="text-sm text-stone-500 flex-shrink-0">
                {wine.vintage}
              </span>
            )}
          </div>
          {wine.winery && (
            <p className="text-sm text-stone-600 truncate">{wine.winery}</p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {wine.color && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorBadge[wine.color] || "bg-stone-200 text-stone-700"}`}
              >
                {wine.color}
              </span>
            )}
            {wine.varietal && (
              <span className="text-xs text-stone-500">{wine.varietal}</span>
            )}
            {wine.region && (
              <span className="text-xs text-stone-400">· {wine.region}</span>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            {wine.rating ? (
              <StarRating rating={wine.rating} readonly />
            ) : (
              <span className="text-xs text-stone-400">Not rated</span>
            )}
            {wine.price != null && (
              <span className="text-sm font-medium text-stone-700">
                ${wine.price.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}
