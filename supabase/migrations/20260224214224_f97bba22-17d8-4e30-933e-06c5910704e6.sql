
-- Add referral settings to reward_settings
ALTER TABLE public.reward_settings
  ADD COLUMN IF NOT EXISTS referral_points_referrer integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS referral_points_referred integer NOT NULL DEFAULT 25;

-- Referral codes table
CREATE TABLE public.referral_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral code"
  ON public.referral_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage referral codes"
  ON public.referral_codes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Referrals table (tracks completed referrals)
CREATE TABLE public.referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid NOT NULL,
  referred_user_id uuid NOT NULL UNIQUE,
  referral_code_id uuid NOT NULL REFERENCES public.referral_codes(id),
  points_awarded_referrer integer NOT NULL DEFAULT 0,
  points_awarded_referred integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals as referrer"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "Admins can manage referrals"
  ON public.referrals FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to generate referral code for a user
CREATE OR REPLACE FUNCTION public.get_or_create_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID;
  _code TEXT;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN RETURN NULL; END IF;

  SELECT code INTO _code FROM referral_codes WHERE user_id = _uid;
  IF _code IS NOT NULL THEN RETURN _code; END IF;

  -- Generate unique 8-char code
  LOOP
    _code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    BEGIN
      INSERT INTO referral_codes (user_id, code) VALUES (_uid, _code);
      RETURN _code;
    EXCEPTION WHEN unique_violation THEN
      -- retry with new code
    END;
  END LOOP;
END;
$$;

-- Function to process referral after signup (called by handle_new_user trigger or manually)
CREATE OR REPLACE FUNCTION public.process_referral(_referred_user_id uuid, _referral_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _referrer_id UUID;
  _code_id UUID;
  _pts_referrer INTEGER;
  _pts_referred INTEGER;
BEGIN
  IF _referral_code IS NULL OR _referral_code = '' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_code');
  END IF;

  SELECT id, user_id INTO _code_id, _referrer_id
  FROM referral_codes WHERE code = upper(trim(_referral_code));

  IF _code_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_code');
  END IF;

  IF _referrer_id = _referred_user_id THEN
    RETURN jsonb_build_object('success', false, 'reason', 'self_referral');
  END IF;

  IF EXISTS (SELECT 1 FROM referrals WHERE referred_user_id = _referred_user_id) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_referred');
  END IF;

  SELECT referral_points_referrer, referral_points_referred
  INTO _pts_referrer, _pts_referred
  FROM reward_settings WHERE id = 'default';
  
  IF _pts_referrer IS NULL THEN _pts_referrer := 50; END IF;
  IF _pts_referred IS NULL THEN _pts_referred := 25; END IF;

  INSERT INTO referrals (referrer_id, referred_user_id, referral_code_id, points_awarded_referrer, points_awarded_referred)
  VALUES (_referrer_id, _referred_user_id, _code_id, _pts_referrer, _pts_referred);

  -- Award referrer
  UPDATE user_points SET balance = balance + _pts_referrer, total_earned = total_earned + _pts_referrer WHERE user_id = _referrer_id;
  INSERT INTO points_transactions (user_id, amount, type, description)
  VALUES (_referrer_id, _pts_referrer, 'referral', 'Bonus za polecenie znajomego');

  -- Award referred user
  UPDATE user_points SET balance = balance + _pts_referred, total_earned = total_earned + _pts_referred WHERE user_id = _referred_user_id;
  INSERT INTO points_transactions (user_id, amount, type, description)
  VALUES (_referred_user_id, _pts_referred, 'referral', 'Bonus powitalny za kod polecający');

  RETURN jsonb_build_object('success', true, 'points_referrer', _pts_referrer, 'points_referred', _pts_referred);
END;
$$;

-- Update handle_new_user to process referral code from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _referral_code TEXT;
BEGIN
  INSERT INTO public.profiles (user_id, name, email, username, first_name, last_name, street, city, postal_code, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'name',
    NEW.email,
    NEW.raw_user_meta_data ->> 'username',
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'street',
    NEW.raw_user_meta_data ->> 'city',
    NEW.raw_user_meta_data ->> 'postal_code',
    NEW.raw_user_meta_data ->> 'phone'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  INSERT INTO public.user_points (user_id, balance, total_earned) VALUES (NEW.id, 0, 0);

  -- Process referral code if provided
  _referral_code := NEW.raw_user_meta_data ->> 'referral_code';
  IF _referral_code IS NOT NULL AND _referral_code <> '' THEN
    PERFORM process_referral(NEW.id, _referral_code);
  END IF;

  RETURN NEW;
END;
$$;
