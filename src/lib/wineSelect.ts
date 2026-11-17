import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Every Wine column except the photo itself.
 *
 * A stored photo is ~175 KB of base64. List and stats queries used to load
 * every bottle's photo from the database only to throw it away (or just check
 * that one existed), so each cellar or dashboard load pulled megabytes for
 * nothing. Use this select plus idsWithPhoto() instead.
 */
export const WINE_WITHOUT_PHOTO = {
  id: true, name: true, winery: true, vintage: true, varietal: true, region: true,
  country: true, category: true, color: true, price: true, rating: true, notes: true,
  description: true, tastingNotes: true, drinkingWindow: true, criticReviews: true,
  labelImageUrl: true, quantity: true, status: true, occasion: true, foodPairings: true,
  onlineRating: true, marketPrice: true, marketCurrency: true, marketPriceNote: true,
  marketPriceAt: true, confidence: true, storeId: true, listId: true, consumedAt: true,
  createdAt: true, updatedAt: true,
} satisfies Prisma.WineSelect;

// Fails to compile if a column is added to Wine but not listed above, so lists
// can't silently start dropping a new field.
type Unlisted = Exclude<Prisma.WineScalarFieldEnum, "imageData" | keyof typeof WINE_WITHOUT_PHOTO>;
const everyColumnListed: [Unlisted] extends [never] ? true : Unlisted = true;
void everyColumnListed;

/** Ids of the wines matching `where` that have a stored photo. */
export async function idsWithPhoto(where: Prisma.WineWhereInput): Promise<Set<number>> {
  const rows = await prisma.wine.findMany({
    where: { AND: [where, { imageData: { not: null } }] },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}
