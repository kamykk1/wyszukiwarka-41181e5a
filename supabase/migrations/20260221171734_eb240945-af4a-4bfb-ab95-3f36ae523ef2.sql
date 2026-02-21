-- Fix security definer views by recreating them with security_invoker

-- 1. Drop and recreate leaderboard view
DROP VIEW IF EXISTS public.leaderboard;
CREATE VIEW public.leaderboard
WITH (security_invoker = true)
AS
SELECT p.name,
    p.avatar_url,
    up.total_earned,
    up.balance,
    rank() OVER (ORDER BY up.total_earned DESC) AS rank
FROM user_points up
JOIN profiles p ON p.user_id = up.user_id
WHERE up.total_earned > 0
ORDER BY up.total_earned DESC
LIMIT 100;

-- Grant access to leaderboard for all authenticated users
GRANT SELECT ON public.leaderboard TO authenticated;
GRANT SELECT ON public.leaderboard TO anon;

-- 2. Drop and recreate stores_public view
DROP VIEW IF EXISTS public.stores_public;
CREATE VIEW public.stores_public
WITH (security_invoker = true)
AS
SELECT id, name, logo, color, enabled, cashback_rate, cashback_type, affiliate_url, partner_source
FROM stores
WHERE enabled = true;

GRANT SELECT ON public.stores_public TO authenticated;
GRANT SELECT ON public.stores_public TO anon;

-- 3. Drop and recreate partner_integrations_public view
DROP VIEW IF EXISTS public.partner_integrations_public;
CREATE VIEW public.partner_integrations_public
WITH (security_invoker = true)
AS
SELECT id, name, display_name, description, enabled, task_points, category_points, category_calc_mode
FROM partner_integrations;

GRANT SELECT ON public.partner_integrations_public TO authenticated;
GRANT SELECT ON public.partner_integrations_public TO anon;

-- Create storage bucket for email assets
INSERT INTO storage.buckets (id, name, public) VALUES ('email-assets', 'email-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to email assets
CREATE POLICY "Public read email assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'email-assets');

-- Allow admins to manage email assets
CREATE POLICY "Admins manage email assets"
ON storage.objects FOR ALL
USING (bucket_id = 'email-assets' AND public.has_role(auth.uid(), 'admin'));
