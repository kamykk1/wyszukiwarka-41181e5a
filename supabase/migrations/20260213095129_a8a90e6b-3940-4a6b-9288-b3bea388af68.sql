
ALTER TABLE public.reward_settings 
ADD COLUMN IF NOT EXISTS click_points INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS purchase_points INTEGER NOT NULL DEFAULT 10;

CREATE OR REPLACE VIEW public.leaderboard AS
SELECT p.name, p.avatar_url, up.total_earned, up.balance, RANK() OVER (ORDER BY up.total_earned DESC) as rank
FROM public.user_points up JOIN public.profiles p ON p.user_id = up.user_id
WHERE up.total_earned > 0
ORDER BY up.total_earned DESC
LIMIT 100;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
