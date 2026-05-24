/**
 * Normalize the stored Wine.color value to the canonical form used by
 * CategoryConfig.types[].value.
 *
 * Historically wines were saved with inconsistent casing/accents (e.g.
 * "rose", "Rosé", "Rose") because different code paths (photo scan,
 * manual entry, AI analyze) had slightly different prompts and no
 * server-side normalization. This helper lets filter pills and count
 * aggregations treat them all as the same value.
 *
 * Returns null when the input doesn't map to any known type.
 */
const ALIASES: Record<string, string> = {
  // wine
  red: "red",
  white: "white",
  rose: "rosé",
  "rosé": "rosé",
  "rosè": "rosé",
  rosado: "rosé",
  pink: "rosé",
  sparkling: "sparkling",
  champagne: "sparkling",
  dessert: "dessert",
  orange: "orange",
  // coffee
  light: "light",
  medium: "medium",
  "medium-dark": "medium-dark",
  dark: "dark",
  espresso: "espresso",
  decaf: "decaf",
  // beer
  ipa: "ipa",
  lager: "lager",
  stout: "stout",
  pilsner: "pilsner",
  wheat: "wheat",
  sour: "sour",
  porter: "porter",
  "pale-ale": "pale-ale",
};

export function normalizeColor(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  return ALIASES[key] ?? null;
}
