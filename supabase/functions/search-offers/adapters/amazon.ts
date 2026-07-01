// Adapter Amazon PA-API 5 (Product Advertising API).
// Realny endpoint: POST https://webservices.amazon.<region>/paapi5/searchitems
// Auth: AWS Signature v4 (access key + secret + associate tag).
// Aby włączyć: AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, AMAZON_ASSOCIATE_TAG, AMAZON_REGION (np. "pl" lub "de").
import type { NormalizedOffer } from "./types.ts";
import { generateMockOffers } from "./mock-utils.ts";

export async function searchAmazon(query: string): Promise<NormalizedOffer[]> {
  const accessKey = Deno.env.get("AMAZON_ACCESS_KEY");
  const secretKey = Deno.env.get("AMAZON_SECRET_KEY");
  const associateTag = Deno.env.get("AMAZON_ASSOCIATE_TAG");

  if (!accessKey || !secretKey || !associateTag) {
    return generateMockOffers("amazon", query, {
      count: 4,
      priceBase: 45,
      priceRange: 1200,
      cashbackRate: 3.0,
      imageDomain: "amazon",
      urlTemplate: (id, q) =>
        `https://www.amazon.pl/s?k=${encodeURIComponent(q)}&tag=placeholder-21&ref=${id}`,
    });
  }
  // REAL — SigV4 SearchItems payload z Keywords, Resources[Images.Primary.Large, Offers.Listings.Price, ItemInfo.Title]
  return [];
}
