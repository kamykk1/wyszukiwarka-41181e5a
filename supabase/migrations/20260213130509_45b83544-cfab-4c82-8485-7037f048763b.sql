
-- Remove the overly broad SELECT policy
DROP POLICY IF EXISTS "Authenticated can view basic store info" ON public.stores;

-- Only admins can SELECT from the raw stores table (they already have ALL via the admin policy)
-- No new policy needed — the existing "Admins can manage stores" ALL policy covers SELECT for admins.
