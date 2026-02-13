
-- Fix security definer view - recreate with security_invoker
DROP VIEW IF EXISTS public.partner_integrations_public;
CREATE VIEW public.partner_integrations_public
  WITH (security_invoker = true) AS
  SELECT id, name, display_name, enabled, description, task_points, category_points
  FROM public.partner_integrations
  WHERE enabled = true;
