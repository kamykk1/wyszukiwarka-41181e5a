
-- Fix award_click_points: use auth.uid() instead of _user_id parameter
CREATE OR REPLACE FUNCTION public.award_click_points(_product_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _points INTEGER;
  _uid UUID;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  INSERT INTO click_points_log (user_id, product_name, click_date)
  VALUES (_uid, _product_name, CURRENT_DATE)
  ON CONFLICT (user_id, product_name, click_date) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_clicked_today');
  END IF;

  SELECT click_points INTO _points FROM reward_settings WHERE id = 'default';
  IF _points IS NULL THEN _points := 1; END IF;

  UPDATE user_points
  SET balance = balance + _points, total_earned = total_earned + _points
  WHERE user_id = _uid;

  INSERT INTO points_transactions (user_id, amount, type, description)
  VALUES (_uid, _points, 'click', 'Kliknięcie w link: ' || _product_name);

  RETURN jsonb_build_object('success', true, 'points_awarded', _points);
END;
$$;

-- Fix award_purchase_points: use auth.uid() instead of _user_id parameter
CREATE OR REPLACE FUNCTION public.award_purchase_points(_product_name text, _store_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _points INTEGER;
  _uid UUID;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  SELECT purchase_points INTO _points FROM reward_settings WHERE id = 'default';
  IF _points IS NULL THEN _points := 10; END IF;

  UPDATE user_points
  SET balance = balance + _points, total_earned = total_earned + _points
  WHERE user_id = _uid;

  INSERT INTO points_transactions (user_id, amount, type, description)
  VALUES (_uid, _points, 'purchase', 'Zakup: ' || _product_name || ' w ' || _store_name);

  RETURN jsonb_build_object('success', true, 'points_awarded', _points);
END;
$$;

-- Fix award_mailing_click_points: use auth.uid() instead of _user_id parameter
CREATE OR REPLACE FUNCTION public.award_mailing_click_points(_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _points INTEGER;
  _uid UUID;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  SELECT points_reward INTO _points FROM mailing_campaigns WHERE id = _campaign_id;
  IF _points IS NULL OR _points <= 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_points');
  END IF;

  INSERT INTO mailing_clicks (campaign_id, user_id, points_awarded)
  VALUES (_campaign_id, _uid, _points)
  ON CONFLICT (campaign_id, user_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_clicked');
  END IF;

  UPDATE user_points
  SET balance = balance + _points, total_earned = total_earned + _points
  WHERE user_id = _uid;

  INSERT INTO points_transactions (user_id, amount, type, description)
  VALUES (_uid, _points, 'earned', 'Punkty za kliknięcie w mailing');

  RETURN jsonb_build_object('success', true, 'points_awarded', _points);
END;
$$;

-- Fix redeem_reward: use auth.uid() instead of _user_id parameter
CREATE OR REPLACE FUNCTION public.redeem_reward(_reward_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _points_cost INTEGER;
  _current_balance INTEGER;
  _stock INTEGER;
  _reward_name TEXT;
  _uid UUID;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  SELECT balance INTO _current_balance
  FROM user_points WHERE user_id = _uid FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'User points not found');
  END IF;

  SELECT points_cost, stock, name INTO _points_cost, _stock, _reward_name
  FROM rewards WHERE id = _reward_id AND is_active = true FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Reward not found or inactive');
  END IF;

  IF _current_balance < _points_cost THEN
    RETURN jsonb_build_object('error', 'Insufficient points');
  END IF;

  IF _stock IS NOT NULL AND _stock <= 0 THEN
    RETURN jsonb_build_object('error', 'Out of stock');
  END IF;

  INSERT INTO reward_redemptions (user_id, reward_id, points_spent)
  VALUES (_uid, _reward_id, _points_cost);

  UPDATE user_points SET balance = balance - _points_cost WHERE user_id = _uid;

  INSERT INTO points_transactions (user_id, amount, type, description)
  VALUES (_uid, -_points_cost, 'redeemed', 'Odebrano: ' || _reward_name);

  IF _stock IS NOT NULL THEN
    UPDATE rewards SET stock = stock - 1 WHERE id = _reward_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
