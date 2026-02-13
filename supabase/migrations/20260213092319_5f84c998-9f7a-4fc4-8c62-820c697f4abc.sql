
-- Fix overly permissive INSERT policy on notification_log
DROP POLICY "System can insert notifications" ON public.notification_log;

-- Only allow authenticated users or admins to insert their own notifications
CREATE POLICY "Admins can manage notifications"
ON public.notification_log FOR ALL
USING (has_role(auth.uid(), 'admin'));
