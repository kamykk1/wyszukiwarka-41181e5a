-- Drop unused public partner view (data served via admin-partners edge function only)
DROP VIEW IF EXISTS public.partner_integrations_public;

-- Add leaderboard opt-out
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_on_leaderboard boolean NOT NULL DEFAULT true;

-- Recreate leaderboard view respecting privacy flag
DROP VIEW IF EXISTS public.leaderboard;
CREATE VIEW public.leaderboard
WITH (security_invoker = true)
AS
SELECT
  CASE WHEN p.show_on_leaderboard THEN p.name ELSE 'Anonim' END AS name,
  CASE WHEN p.show_on_leaderboard THEN p.avatar_url ELSE NULL END AS avatar_url,
  up.total_earned,
  up.balance,
  rank() OVER (ORDER BY up.total_earned DESC) AS rank
FROM public.user_points up
JOIN public.profiles p ON p.user_id = up.user_id
WHERE up.total_earned > 0
ORDER BY up.total_earned DESC
LIMIT 100;

GRANT SELECT ON public.leaderboard TO authenticated, anon;