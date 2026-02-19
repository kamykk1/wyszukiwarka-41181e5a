
-- Add Tradedoubler integration fields to stores table
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS partner_source text DEFAULT 'manual' CHECK (partner_source IN ('manual', 'tradedoubler')),
  ADD COLUMN IF NOT EXISTS tradedoubler_program_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tradedoubler_advertiser_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cashback_rate numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cashback_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS affiliate_url text DEFAULT NULL;

-- Create table to cache Tradedoubler programs list for admin UI
CREATE TABLE IF NOT EXISTS public.tradedoubler_programs (
  id text PRIMARY KEY,
  name text NOT NULL,
  advertiser_id text,
  logo_url text,
  cashback_rate numeric,
  cashback_type text,
  currency text DEFAULT 'PLN',
  status text,
  category text,
  url text,
  raw_data jsonb DEFAULT '{}'::jsonb,
  synced_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.tradedoubler_programs ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write cached programs
CREATE POLICY "Admins can manage tradedoubler programs"
  ON public.tradedoubler_programs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
