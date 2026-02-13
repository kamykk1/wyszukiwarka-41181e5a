
-- Add address fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS street text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS postal_code text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text DEFAULT 'Polska';

-- Create mailing_campaigns table for paid mailing
CREATE TABLE public.mailing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  message text NOT NULL,
  audience text NOT NULL DEFAULT 'all',
  points_reward integer NOT NULL DEFAULT 0,
  sent_at timestamp with time zone,
  sent_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.mailing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage campaigns" ON public.mailing_campaigns
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create mailing_clicks table to track user clicks on mailing links
CREATE TABLE public.mailing_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.mailing_campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  clicked_at timestamp with time zone NOT NULL DEFAULT now(),
  points_awarded integer NOT NULL DEFAULT 0,
  UNIQUE(campaign_id, user_id)
);

ALTER TABLE public.mailing_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clicks" ON public.mailing_clicks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clicks" ON public.mailing_clicks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage clicks" ON public.mailing_clicks
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Function to award mailing click points
CREATE OR REPLACE FUNCTION public.award_mailing_click_points(_user_id uuid, _campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _points INTEGER;
BEGIN
  SELECT points_reward INTO _points FROM mailing_campaigns WHERE id = _campaign_id;
  IF _points IS NULL OR _points <= 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_points');
  END IF;

  INSERT INTO mailing_clicks (campaign_id, user_id, points_awarded)
  VALUES (_campaign_id, _user_id, _points)
  ON CONFLICT (campaign_id, user_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_clicked');
  END IF;

  UPDATE user_points
  SET balance = balance + _points, total_earned = total_earned + _points
  WHERE user_id = _user_id;

  INSERT INTO points_transactions (user_id, amount, type, description)
  VALUES (_user_id, _points, 'earned', 'Punkty za kliknięcie w mailing');

  RETURN jsonb_build_object('success', true, 'points_awarded', _points);
END;
$$;

-- Function to admin-add points to a user
CREATE OR REPLACE FUNCTION public.admin_add_points(_user_id uuid, _amount integer, _description text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _amount = 0 THEN
    RETURN jsonb_build_object('error', 'Amount cannot be zero');
  END IF;

  UPDATE user_points
  SET balance = balance + _amount,
      total_earned = CASE WHEN _amount > 0 THEN total_earned + _amount ELSE total_earned END
  WHERE user_id = _user_id;

  INSERT INTO points_transactions (user_id, amount, type, description)
  VALUES (_user_id, _amount, 'adjusted', _description);

  RETURN jsonb_build_object('success', true);
END;
$$;
