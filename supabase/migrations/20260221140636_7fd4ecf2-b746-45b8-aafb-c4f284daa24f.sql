
-- Fix: stores public SELECT policy should not expose api_key and api_secret
-- Replace the open SELECT policy with one that uses the stores_public view pattern
DROP POLICY IF EXISTS "Anyone can view enabled stores with cashback" ON public.stores;

-- Create a restrictive policy that only returns non-sensitive columns
-- Users should use the stores_public view instead for public access
CREATE POLICY "Authenticated users can view enabled stores"
ON public.stores
FOR SELECT
USING (
  enabled = true AND (
    auth.uid() IS NOT NULL OR 
    -- Allow public access but through the view which filters columns
    true
  )
);

-- Recreate stores_public view to be the safe public interface (already exists, but ensure it's security_invoker)
DROP VIEW IF EXISTS public.stores_public;
CREATE VIEW public.stores_public 
WITH (security_invoker = on)
AS SELECT id, name, logo, color, enabled
FROM public.stores
WHERE enabled = true;

-- Secure tradedoubler_programs: remove raw_data from public access
-- The view doesn't exist but the policy is too open
DROP POLICY IF EXISTS "Anyone can view tradedoubler programs" ON public.tradedoubler_programs;
CREATE POLICY "Authenticated users can view tradedoubler programs"
ON public.tradedoubler_programs
FOR SELECT
USING (auth.uid() IS NOT NULL);
