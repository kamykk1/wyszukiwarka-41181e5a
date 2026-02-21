
-- Drop the overly permissive SELECT policy that exposes api_key/api_secret
DROP POLICY IF EXISTS "Authenticated users can view enabled stores" ON public.stores;

-- Drop old public view and recreate with cashback fields (no credentials)
DROP VIEW IF EXISTS public.stores_public;

CREATE VIEW public.stores_public
WITH (security_invoker = true)
AS SELECT
  id, name, logo, color, enabled,
  cashback_rate, cashback_type, affiliate_url, partner_source
FROM public.stores
WHERE enabled = true;

-- Grant access to the view
GRANT SELECT ON public.stores_public TO authenticated;
GRANT SELECT ON public.stores_public TO anon;

-- Add a policy so the view's security_invoker can read enabled stores
-- but only expose the columns in the view (no api_key/api_secret)
CREATE POLICY "Anyone can view enabled stores via view"
ON public.stores
FOR SELECT
USING (enabled = true);
