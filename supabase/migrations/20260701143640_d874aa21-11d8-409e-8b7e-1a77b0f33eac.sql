
-- Tabela cache znormalizowanych ofert z API partnerów
CREATE TABLE public.offers_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  query TEXT NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT,
  product_url TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PLN',
  shipping_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  price_total NUMERIC(12,2) NOT NULL,
  cashback_rate NUMERIC(6,2) NOT NULL DEFAULT 0,
  cashback_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  price_effective NUMERIC(12,2) NOT NULL,
  rating NUMERIC(3,2),
  reviews_count INTEGER,
  category TEXT,
  brand TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (partner_id, external_id, query)
);

CREATE INDEX offers_cache_query_idx ON public.offers_cache (query, price_effective);
CREATE INDEX offers_cache_fetched_at_idx ON public.offers_cache (fetched_at);

GRANT SELECT ON public.offers_cache TO anon, authenticated;
GRANT ALL ON public.offers_cache TO service_role;

ALTER TABLE public.offers_cache ENABLE ROW LEVEL SECURITY;

-- Dane pochodzą z publicznych API partnerów, więc odczyt jest publiczny.
-- Zapis wyłącznie z Edge Function (service_role, omija RLS).
CREATE POLICY "Offers cache is publicly readable"
ON public.offers_cache
FOR SELECT
TO anon, authenticated
USING (true);
