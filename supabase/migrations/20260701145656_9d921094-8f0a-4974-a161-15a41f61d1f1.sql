
CREATE TABLE IF NOT EXISTS public.offers_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  cache_ttl_minutes INTEGER NOT NULL DEFAULT 30 CHECK (cache_ttl_minutes BETWEEN 1 AND 10080),
  refresh_interval_minutes INTEGER NOT NULL DEFAULT 60 CHECK (refresh_interval_minutes BETWEEN 5 AND 10080),
  popular_queries TEXT[] NOT NULL DEFAULT ARRAY['iphone','laptop','telewizor','buty','perfumy']::TEXT[],
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_refresh_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT offers_settings_single CHECK (id = 'default')
);

GRANT SELECT ON public.offers_settings TO authenticated;
GRANT ALL ON public.offers_settings TO service_role;

ALTER TABLE public.offers_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read offers settings"
  ON public.offers_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can update offers settings"
  ON public.offers_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert offers settings"
  ON public.offers_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.offers_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_offers_cache_query_fetched
  ON public.offers_cache (query, fetched_at DESC);
