// Wspólny typ znormalizowanej oferty dla wszystkich partnerów.
export interface NormalizedOffer {
  partner_id: "allegro" | "aliexpress" | "amazon" | "temu";
  external_id: string;
  title: string;
  image_url: string | null;
  product_url: string;
  price: number;
  currency: string;
  shipping_price: number;
  price_total: number;
  cashback_rate: number;
  rating: number | null;
  reviews_count: number | null;
  category: string | null;
  brand: string | null;
}

export interface AdapterResult {
  partner_id: NormalizedOffer["partner_id"];
  status: "ok" | "error" | "disabled";
  offers: NormalizedOffer[];
  latency_ms: number;
  error?: string;
}

export type Adapter = (query: string) => Promise<NormalizedOffer[]>;
