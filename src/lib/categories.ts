export type Category = "wine" | "coffee" | "beer";

export interface CategoryConfig {
  key: Category;
  label: string;
  plural: string;
  icon: string;
  accentColor: string;
  accentMuted: string;
  accentHover: string;
  bgTint: string;
  // Terminology
  itemName: string;        // "wine" / "coffee" / "beer"
  itemNamePlural: string;  // "wines" / "coffees" / "beers"
  producerLabel: string;   // "Winery" / "Roaster" / "Brewery"
  varietalLabel: string;   // "Varietal" / "Roast" / "Style"
  vintageLabel: string;    // "Vintage" / "Roast Date" / "Brew Date"
  colorLabel: string;      // "Color" / "Roast Level" / "Type"
  fridgeLabel: string;     // "Wine Fridge" / "Coffee Shelf" / "Beer Fridge"
  scanLabel: string;       // "Scan Bottles" / "Scan Bags" / "Scan Cans"
  sommelierLabel: string;  // "Sommelier" / "Barista" / "Cicerone"
  consumeVerb: string;     // "Open a bottle" / "Brew a cup" / "Crack one open"
  consumedVerb: string;    // "Drank" / "Brewed" / "Drank"
  drinkPrompt: string;     // "What should I drink?" for all
  pairingLabel: string;    // "Food Pairings" / "Pairs Well With" / "Goes Great With"
  // Color/type options for this category
  types: { value: string; label: string; dotColor: string }[];
  // Quick prompts for "What should I drink?"
  quickPrompts: { label: string; value: string }[];
  // AI analyze prompt context
  analyzeContext: string;
  // Placeholder shape
  placeholderType: "bottle" | "bag" | "can";
}

export const CATEGORIES: Record<Category, CategoryConfig> = {
  wine: {
    key: "wine",
    label: "Wine",
    plural: "Wines",
    icon: "🍷",
    accentColor: "#b73a5e",
    accentMuted: "rgba(183, 58, 94, 0.12)",
    accentHover: "rgba(183, 58, 94, 0.18)",
    bgTint: "rgba(183, 58, 94, 0.04)",
    itemName: "wine",
    itemNamePlural: "wines",
    producerLabel: "Winery",
    varietalLabel: "Varietal",
    vintageLabel: "Vintage",
    colorLabel: "Color",
    fridgeLabel: "Wine Fridge",
    scanLabel: "Scan Bottles",
    sommelierLabel: "Sommelier",
    consumeVerb: "Open a bottle",
    consumedVerb: "Drank",
    drinkPrompt: "What should I drink?",
    pairingLabel: "Food Pairings",
    types: [
      { value: "red", label: "Red", dotColor: "#c75050" },
      { value: "white", label: "White", dotColor: "#e8dca0" },
      { value: "rosé", label: "Rosé", dotColor: "#d4849a" },
      { value: "sparkling", label: "Sparkling", dotColor: "#7abed4" },
      { value: "dessert", label: "Dessert", dotColor: "#d4a44e" },
      { value: "orange", label: "Orange", dotColor: "#d48a4e" },
    ],
    quickPrompts: [
      { label: "🥩 Steak dinner", value: "I'm having steak for dinner" },
      { label: "🍕 Pizza night", value: "Pizza night, what wine?" },
      { label: "🐟 Seafood", value: "Having seafood tonight" },
      { label: "🧀 Cheese board", value: "Making a cheese board" },
      { label: "🍝 Pasta", value: "Italian pasta dinner" },
      { label: "🎉 Celebration", value: "Something special to celebrate" },
    ],
    analyzeContext: "wine bottle label",
    placeholderType: "bottle",
  },
  coffee: {
    key: "coffee",
    label: "Coffee",
    plural: "Coffees",
    icon: "☕",
    accentColor: "#A0724A",
    accentMuted: "rgba(160, 114, 74, 0.12)",
    accentHover: "rgba(160, 114, 74, 0.18)",
    bgTint: "rgba(160, 114, 74, 0.04)",
    itemName: "coffee",
    itemNamePlural: "coffees",
    producerLabel: "Roaster",
    varietalLabel: "Origin",
    vintageLabel: "Roast Date",
    colorLabel: "Roast Level",
    fridgeLabel: "Coffee Shelf",
    scanLabel: "Scan Bags",
    sommelierLabel: "Barista",
    consumeVerb: "Brew a cup",
    consumedVerb: "Brewed",
    drinkPrompt: "What should I brew?",
    pairingLabel: "Pairs Well With",
    types: [
      { value: "light", label: "Light Roast", dotColor: "#C4A882" },
      { value: "medium", label: "Medium Roast", dotColor: "#8B6914" },
      { value: "medium-dark", label: "Medium-Dark", dotColor: "#6B4423" },
      { value: "dark", label: "Dark Roast", dotColor: "#3E2723" },
      { value: "espresso", label: "Espresso", dotColor: "#1B0E07" },
      { value: "decaf", label: "Decaf", dotColor: "#9E9E9E" },
    ],
    quickPrompts: [
      { label: "☀️ Morning wake-up", value: "Need a strong morning coffee" },
      { label: "📖 Afternoon read", value: "Relaxing afternoon read, something smooth" },
      { label: "🍰 With dessert", value: "Having dessert, what coffee pairs well?" },
      { label: "❄️ Iced coffee", value: "Want something good as iced coffee" },
      { label: "🫖 Pour over", value: "Doing a pour over, what should I use?" },
      { label: "☕ Espresso shot", value: "Quick espresso, what's best?" },
    ],
    analyzeContext: "coffee bag or label",
    placeholderType: "bag",
  },
  beer: {
    key: "beer",
    label: "Beer",
    plural: "Beers",
    icon: "🍺",
    accentColor: "#D4870E",
    accentMuted: "rgba(212, 135, 14, 0.12)",
    accentHover: "rgba(212, 135, 14, 0.18)",
    bgTint: "rgba(212, 135, 14, 0.04)",
    itemName: "beer",
    itemNamePlural: "beers",
    producerLabel: "Brewery",
    varietalLabel: "Style",
    vintageLabel: "Brew Date",
    colorLabel: "Type",
    fridgeLabel: "Beer Fridge",
    scanLabel: "Scan Cans",
    sommelierLabel: "Cicerone",
    consumeVerb: "Crack one open",
    consumedVerb: "Drank",
    drinkPrompt: "What should I drink?",
    pairingLabel: "Goes Great With",
    types: [
      { value: "ipa", label: "IPA", dotColor: "#D4870E" },
      { value: "lager", label: "Lager", dotColor: "#F5D76E" },
      { value: "stout", label: "Stout", dotColor: "#2C1810" },
      { value: "pilsner", label: "Pilsner", dotColor: "#ECD078" },
      { value: "wheat", label: "Wheat", dotColor: "#F0E68C" },
      { value: "sour", label: "Sour", dotColor: "#E8836B" },
      { value: "porter", label: "Porter", dotColor: "#4A2C17" },
      { value: "pale-ale", label: "Pale Ale", dotColor: "#C68E17" },
    ],
    quickPrompts: [
      { label: "🍔 BBQ night", value: "Having burgers on the BBQ" },
      { label: "🌮 Taco Tuesday", value: "Taco night, what beer?" },
      { label: "🏈 Game day", value: "Watching the game, something easy-drinking" },
      { label: "🍕 Pizza", value: "Pizza night, what pairs well?" },
      { label: "🌶️ Spicy food", value: "Having spicy food tonight" },
      { label: "😎 Hot day", value: "Hot day, something refreshing and cold" },
    ],
    analyzeContext: "beer can, bottle, or label",
    placeholderType: "can",
  },
};

export const CATEGORY_LIST: Category[] = ["wine", "coffee", "beer"];

export function getCategoryConfig(category: Category): CategoryConfig {
  return CATEGORIES[category];
}
