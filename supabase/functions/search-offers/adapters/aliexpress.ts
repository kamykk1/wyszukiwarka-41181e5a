// Adapter AliExpress Affiliate.
// Realny endpoint: aliexpress.affiliate.product.query (TOP API, signed request).
// Aby włączyć: dodaj sekrety ALIEXPRESS_APP_KEY, ALIEXPRESS_APP_SECRET, ALIEXPRESS_TRACKING_ID.
import type { NormalizedOffer } from "./types.ts";
import { generateMockOffers } from "./mock-utils.ts";

export async function searchAliexpress(query: string): Promise<NormalizedOffer[]> {
  const appKey = Deno.env.get("ALIEXPRESS_APP_KEY");
  const appSecret = Deno.env.get("ALIEXPRESS_APP_SECRET");
  const trackingId = Deno.env.get("ALIEXPRESS_TRACKING_ID");

  if (!appKey || !appSecret || !trackingId) {
    return generateMockOffers("aliexpress", query, {
      count: 5,
      priceBase: 15,
      priceRange: 250,
      cashbackRate: 6.0,
      imageDomain: "aliexpress",
      urlTemplate: (id, q) =>
        `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(q)}&aff_ref=${id}`,
    });
  }

  // REAL — szkielet:
  // Signed request do https://api-sg.aliexpress.com/sync
  // method=aliexpress.affiliate.product.query, params + md5(sign)
  return [];
}
