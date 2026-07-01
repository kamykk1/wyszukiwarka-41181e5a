import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UnifiedOffer {
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
  cashback_amount: number;
  price_effective: number;
  rating: number | null;
  reviews_count: number | null;
  category: string | null;
  brand: string | null;
}

export interface PartnerStatus {
  id: UnifiedOffer["partner_id"];
  status: "ok" | "error" | "disabled";
  count: number;
  latency_ms: number;
  error?: string;
}

export type SortKey = "price_effective" | "price" | "cashback" | "rating";

export function useOfferSearch(query: string, sort: SortKey) {
  const [offers, setOffers] = useState<UnifiedOffer[]>([]);
  const [partners, setPartners] = useState<PartnerStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setOffers([]);
      setPartners([]);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.functions.invoke("search-offers", {
          body: { query, sort, limit: 60 },
        });
        if (cancelled) return;
        if (error) throw error;
        setOffers(data?.offers ?? []);
        setPartners(data?.partners ?? []);
      } catch (err) {
        if (cancelled) return;
        console.error("useOfferSearch", err);
        setError("Nie udało się pobrać ofert.");
        setOffers([]);
        setPartners([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const t = setTimeout(run, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
      controller.abort();
    };
  }, [query, sort]);

  return { offers, partners, loading, error };
}
