// Adapter Allegro Affiliate API.
// Realny endpoint: GET https://api.allegro.pl/offers/listing?phrase=...
// Auth: OAuth 2.0 client_credentials -> Bearer token.
// Aby włączyć: dodaj sekrety ALLEGRO_CLIENT_ID i ALLEGRO_CLIENT_SECRET,
// odkomentuj sekcję realną i wywal generateMockOffers.
import type { NormalizedOffer } from "./types.ts";
import { generateMockOffers } from "./mock-utils.ts";

export async function searchAllegro(query: string): Promise<NormalizedOffer[]> {
  const clientId = Deno.env.get("ALLEGRO_CLIENT_ID");
  const clientSecret = Deno.env.get("ALLEGRO_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    // MOCK — dopóki brak kluczy zwracamy realistyczne dane demo.
    return generateMockOffers("allegro", query, {
      count: 4,
      priceBase: 89,
      priceRange: 900,
      cashbackRate: 2.5,
      imageDomain: "allegro",
      urlTemplate: (id, q) =>
        `https://allegro.pl/listing?string=${encodeURIComponent(q)}&utm_source=netszukacz&ref=${id}`,
    });
  }

  // REAL — szkielet gotowy do podpięcia:
  // const tokenRes = await fetch("https://allegro.pl/auth/oauth/token", {
  //   method: "POST",
  //   headers: {
  //     Authorization: "Basic " + btoa(`${clientId}:${clientSecret}`),
  //     "Content-Type": "application/x-www-form-urlencoded",
  //   },
  //   body: "grant_type=client_credentials",
  // });
  // const { access_token } = await tokenRes.json();
  // const res = await fetch(
  //   `https://api.allegro.pl/offers/listing?phrase=${encodeURIComponent(query)}&limit=20`,
  //   { headers: { Authorization: `Bearer ${access_token}`, Accept: "application/vnd.allegro.public.v1+json" } },
  // );
  // const data = await res.json();
  // return (data.items?.promoted ?? []).concat(data.items?.regular ?? []).map((item: any) => ({...}));
  return [];
}
