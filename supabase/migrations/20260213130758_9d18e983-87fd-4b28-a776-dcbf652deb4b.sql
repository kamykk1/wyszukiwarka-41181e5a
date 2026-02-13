
-- Fix 1: Remove overly permissive SELECT policy on partner_integrations
DROP POLICY IF EXISTS "Anyone can view enabled integrations" ON public.partner_integrations;

-- Create a safe public view (without api_key, api_secret, category_api_keys)
CREATE OR REPLACE VIEW public.partner_integrations_public AS
  SELECT id, name, display_name, enabled, description, task_points, category_points
  FROM public.partner_integrations
  WHERE enabled = true;
