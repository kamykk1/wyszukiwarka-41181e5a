
-- Add notification preferences to profiles
ALTER TABLE public.profiles 
ADD COLUMN email_notifications BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN points_threshold INTEGER DEFAULT 500;

-- Table to track sent notifications (prevent duplicates)  
CREATE TABLE public.notification_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  reference_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.notification_log FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notification_log FOR INSERT
WITH CHECK (true);

-- Index for dedup checks
CREATE INDEX idx_notification_log_user_type ON public.notification_log (user_id, type, reference_id);
