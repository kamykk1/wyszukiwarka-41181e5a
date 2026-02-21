
CREATE VIEW public.partner_integrations_public AS
SELECT id, name, display_name, description, enabled, task_points, category_points, category_calc_mode
FROM public.partner_integrations;
