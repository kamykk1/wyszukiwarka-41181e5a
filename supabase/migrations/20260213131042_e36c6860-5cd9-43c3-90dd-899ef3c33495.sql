
-- Fix notification_log: remove overly permissive INSERT policy
-- Edge functions use service role so they don't need it
DROP POLICY IF EXISTS "System can insert notifications" ON public.notification_log;
