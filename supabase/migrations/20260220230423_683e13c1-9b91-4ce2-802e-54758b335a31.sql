
-- Create a public view that exposes cashback-relevant store data
CREATE OR REPLACE VIEW public.stores_cashback AS
SELECT
  id,
  name,
  logo,
  color,
  enabled,
  partner_source,
  tradedoubler_program_id,
  cashback_rate,
  cashback_type,
  affiliate_url
FROM public.stores
WHERE enabled = true
  AND cashback_rate IS NOT NULL
  AND cashback_rate > 0
ORDER BY cashback_rate DESC;

-- Grant public read access to this view
GRANT SELECT ON public.stores_cashback TO anon, authenticated;
