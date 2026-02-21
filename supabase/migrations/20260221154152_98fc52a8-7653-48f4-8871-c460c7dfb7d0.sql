
-- Remove the overly permissive policy we just created
DROP POLICY IF EXISTS "Anyone can view enabled stores via view" ON public.stores;

-- Drop the view we just created
DROP VIEW IF EXISTS public.stores_public;

-- Recreate view WITHOUT security_invoker (uses definer privileges, bypasses RLS)
-- This is safe because the view only exposes non-sensitive columns
CREATE VIEW public.stores_public AS
SELECT id, name, logo, color, enabled, cashback_rate, cashback_type, affiliate_url, partner_source
FROM public.stores
WHERE enabled = true;

-- Grant access to the safe view
GRANT SELECT ON public.stores_public TO authenticated;
GRANT SELECT ON public.stores_public TO anon;
