/**
 * Seed inventory from a wine purchase receipt.
 *
 * Each item is created as a Wine row in the "collection" status, linked to the
 * store, then enriched with tasting notes / critic reviews / food pairings /
 * label image via the same enrichWine() flow used by the photo upload feature.
 *
 * If a wine with the same name + winery already exists in the collection, its
 * quantity is incremented instead (mirrors the bulk-scan confirm behavior).
 *
 * Run:
 *   vercel env pull .env.local            # get DATABASE_URL + ANTHROPIC_API_KEY
 *   npm run seed:receipt
 */

import { prisma } from "../src/lib/db";
import { enrichWine } from "../src/lib/enrich";

type ReceiptItem = {
  sku: string;
  name: string;
  winery?: string;
  varietal?: string;
  region?: string;
  country?: string;
  color: "red" | "white" | "rosé" | "sparkling" | "dessert" | "orange";
  price: number; // regular (list) price per bottle
  quantity: number;
};

const STORE = "Kensington Wine Market";

// Kensington Wine Market — 2026-05-23 — Calgary, Alberta. Total 27 bottles.
// Prices are the regular (list) price per bottle.
const RECEIPT: ReceiptItem[] = [
  {
    sku: "738682",
    name: "Aubuisieres Cuvée de Silex",
    winery: "Domaine des Aubuisières",
    varietal: "Chenin Blanc",
    region: "Vouvray, Loire",
    country: "France",
    color: "white",
    price: 27.99,
    quantity: 1,
  },
  {
    sku: "780708",
    name: "Dagueneau Pouilly Fumé",
    winery: "Didier Dagueneau",
    varietal: "Sauvignon Blanc",
    region: "Pouilly-Fumé, Loire",
    country: "France",
    color: "white",
    price: 47.99,
    quantity: 1,
  },
  {
    sku: "744676",
    name: "Kloof Street Old Vine Chenin",
    winery: "Mullineux",
    varietal: "Chenin Blanc",
    region: "Swartland",
    country: "South Africa",
    color: "white",
    price: 29.99,
    quantity: 1,
  },
  {
    sku: "772854",
    name: "Evodia Old Vines Garnacha",
    winery: "Bodegas Altovinum",
    varietal: "Garnacha",
    region: "Calatayud",
    country: "Spain",
    color: "red",
    price: 23.99,
    quantity: 2,
  },
  {
    sku: "820453",
    name: "Terminus Meldor",
    // Producer left null — enrich will fill description/tasting notes.
    color: "red",
    price: 29.99,
    quantity: 1,
  },
  {
    sku: "808835",
    name: "Durigutti Cabernet Franc",
    winery: "Durigutti",
    varietal: "Cabernet Franc",
    region: "Mendoza",
    country: "Argentina",
    color: "red",
    price: 24.99,
    quantity: 3,
  },
  {
    sku: "776625",
    name: "Sola Fred",
    winery: "Celler Frisach",
    varietal: "Garnatxa / Carinyena blend",
    region: "Terra Alta",
    country: "Spain",
    color: "red",
    price: 23.99,
    quantity: 3,
  },
  {
    sku: "820439",
    name: "Mas Blanch i Jove Saó Rosat",
    winery: "Mas Blanch i Jove",
    varietal: "Garnacha Rosé",
    region: "Costers del Segre, Catalonia",
    country: "Spain",
    color: "rosé",
    price: 29.99,
    quantity: 2,
  },
  {
    sku: "727295",
    name: "Mulderbosch Rosé",
    winery: "Mulderbosch",
    varietal: "Cabernet Sauvignon Rosé",
    region: "Stellenbosch / Western Cape",
    country: "South Africa",
    color: "rosé",
    price: 23.99,
    quantity: 2,
  },
  {
    sku: "817597",
    name: "Dagueneau Rosé Côte Charité",
    winery: "Didier Dagueneau",
    varietal: "Pinot Noir Rosé",
    region: "Côte Charité, Loire",
    country: "France",
    color: "rosé",
    price: 34.99,
    quantity: 2,
  },
  {
    sku: "46755",
    name: "Clos du Soleil Rosé",
    winery: "Clos du Soleil",
    varietal: "Rosé blend",
    region: "Similkameen Valley, BC",
    country: "Canada",
    color: "rosé",
    price: 24.99,
    quantity: 2,
  },
  {
    sku: "878916",
    name: "Glup Rosado",
    // Spanish rosado; producer left null.
    region: undefined,
    country: "Spain",
    color: "rosé",
    price: 29.99,
    quantity: 2,
  },
  {
    sku: "848353",
    name: "Narrative Rosé",
    winery: "Okanagan Crush Pad (Narrative)",
    varietal: "Rosé blend",
    region: "Okanagan Valley, BC",
    country: "Canada",
    color: "rosé",
    price: 24.99,
    quantity: 2,
  },
  {
    sku: "757951",
    name: "Perrin Miraval Provence Rosé",
    winery: "Château Miraval (Famille Perrin)",
    varietal: "Provence Rosé blend",
    region: "Côtes de Provence",
    country: "France",
    color: "rosé",
    price: 36.99,
    quantity: 1,
  },
  {
    sku: "871542",
    name: "JL Denois Brut Rosé",
    winery: "Jean-Louis Denois",
    varietal: "Sparkling Rosé",
    region: "Limoux",
    country: "France",
    color: "sparkling",
    price: 34.99,
    quantity: 1,
  },
  {
    sku: "781580",
    name: "Croix des Pins Ventoux Rosé",
    winery: "Domaine de la Croix des Pins",
    varietal: "Ventoux Rosé blend",
    region: "Ventoux, Rhône",
    country: "France",
    color: "rosé",
    price: 27.99,
    quantity: 1,
  },
];

async function seedItem(item: ReceiptItem, storeId: number) {
  const where: Record<string, unknown> = {
    name: { equals: item.name, mode: "insensitive" },
    category: "wine",
    status: "collection",
  };
  if (item.winery) where.winery = { equals: item.winery, mode: "insensitive" };

  const existing = await prisma.wine.findFirst({ where });

  let wineId: number;
  let mode: "merged" | "created";

  if (existing) {
    const updated = await prisma.wine.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + item.quantity },
    });
    wineId = updated.id;
    mode = "merged";
  } else {
    const created = await prisma.wine.create({
      data: {
        name: item.name,
        category: "wine",
        winery: item.winery ?? null,
        varietal: item.varietal ?? null,
        region: item.region ?? null,
        country: item.country ?? null,
        color: item.color,
        price: item.price,
        quantity: item.quantity,
        status: "collection",
        storeId,
      },
    });
    wineId = created.id;
    mode = "created";
  }

  return { wineId, mode };
}

async function main() {
  console.log(`Seeding ${RECEIPT.length} unique wines (${RECEIPT.reduce((n, i) => n + i.quantity, 0)} bottles total) from ${STORE}...`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("⚠  ANTHROPIC_API_KEY not set — wines will be created but NOT enriched.");
  }

  const store = await prisma.store.upsert({
    where: { name: STORE },
    update: {},
    create: { name: STORE },
  });

  let created = 0;
  let merged = 0;
  let enriched = 0;
  let enrichFailed = 0;

  for (const item of RECEIPT) {
    process.stdout.write(`• ${item.name.padEnd(40)} x${item.quantity}  `);

    const { wineId, mode } = await seedItem(item, store.id);
    if (mode === "created") created++;
    else merged++;
    process.stdout.write(`${mode} (id=${wineId})  `);

    if (process.env.ANTHROPIC_API_KEY) {
      const result = await enrichWine(wineId);
      if (result.success) {
        enriched++;
        process.stdout.write("✓ enriched\n");
      } else {
        enrichFailed++;
        process.stdout.write(`✗ enrich failed: ${result.error}\n`);
      }
    } else {
      process.stdout.write("(skipped enrich)\n");
    }
  }

  console.log(`\nDone. created=${created} merged=${merged} enriched=${enriched} enrichFailed=${enrichFailed}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
