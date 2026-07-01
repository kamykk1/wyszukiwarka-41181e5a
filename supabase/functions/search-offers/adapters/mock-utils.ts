// Generator realistycznych mocków dla adapterów bez skonfigurowanych kluczy API.
import type { NormalizedOffer } from "./types.ts";

const CATEGORIES = ["Elektronika", "Moda", "Dom", "Sport", "Zdrowie"];
const BRANDS = ["Samsung", "Xiaomi", "Apple", "Bosch", "Philips", "LG", "Sony", "Nike"];

function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateMockOffers(
  partner: NormalizedOffer["partner_id"],
  query: string,
  opts: {
    count: number;
    priceBase: number;
    priceRange: number;
    cashbackRate: number;
    currency?: string;
    imageDomain?: string;
    urlTemplate: (id: string, q: string) => string;
  },
): NormalizedOffer[] {
  const rnd = seededRandom(`${partner}:${query.toLowerCase()}`);
  const offers: NormalizedOffer[] = [];
  const q = query.trim();
  for (let i = 0; i < opts.count; i++) {
    const brand = BRANDS[Math.floor(rnd() * BRANDS.length)];
    const price = +(opts.priceBase + rnd() * opts.priceRange).toFixed(2);
    const shipping = rnd() > 0.6 ? 0 : +(9.99 + rnd() * 15).toFixed(2);
    const id = `${partner}-${Math.floor(rnd() * 1_000_000)}`;
    offers.push({
      partner_id: partner,
      external_id: id,
      title: `${brand} ${q} ${["Pro", "Max", "Lite", "Plus", "Standard"][i % 5]}`,
      image_url: opts.imageDomain
        ? `https://picsum.photos/seed/${encodeURIComponent(id)}/400/400`
        : null,
      product_url: opts.urlTemplate(id, q),
      price,
      currency: opts.currency ?? "PLN",
      shipping_price: shipping,
      price_total: +(price + shipping).toFixed(2),
      cashback_rate: opts.cashbackRate,
      rating: +(3.5 + rnd() * 1.5).toFixed(1),
      reviews_count: Math.floor(rnd() * 5000),
      category: CATEGORIES[Math.floor(rnd() * CATEGORIES.length)],
      brand,
    });
  }
  return offers;
}
