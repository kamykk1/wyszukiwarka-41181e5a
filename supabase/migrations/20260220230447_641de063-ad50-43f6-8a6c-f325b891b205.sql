
-- Drop the security definer view
DROP VIEW IF EXISTS public.stores_cashback;

-- Instead, add a public SELECT policy on stores for cashback display
-- (read-only, only enabled stores with cashback)
CREATE POLICY "Anyone can view enabled stores with cashback"
ON public.stores
FOR SELECT
USING (enabled = true);
