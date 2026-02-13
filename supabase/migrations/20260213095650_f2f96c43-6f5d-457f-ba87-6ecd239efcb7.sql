
CREATE OR REPLACE FUNCTION public.award_click_points(_user_id uuid, _product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _points INTEGER;
BEGIN
  INSERT INTO click_points_log (user_id, product_name, click_date)
  VALUES (_user_id, _product_name, CURRENT_DATE)
  ON CONFLICT (user_id, product_name, click_date) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_clicked_today');
  END IF;

  SELECT click_points INTO _points FROM reward_settings WHERE id = 'default';
  IF _points IS NULL THEN _points := 1; END IF;

  UPDATE user_points
  SET balance = balance + _points, total_earned = total_earned + _points
  WHERE user_id = _user_id;

  INSERT INTO points_transactions (user_id, amount, type, description)
  VALUES (_user_id, _points, 'click', 'Kliknięcie w link: ' || _product_name);

  RETURN jsonb_build_object('success', true, 'points_awarded', _points);
END;
$$;

CREATE OR REPLACE FUNCTION public.award_purchase_points(_user_id uuid, _product_name text, _store_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _points INTEGER;
BEGIN
  SELECT purchase_points INTO _points FROM reward_settings WHERE id = 'default';
  IF _points IS NULL THEN _points := 10; END IF;

  UPDATE user_points
  SET balance = balance + _points, total_earned = total_earned + _points
  WHERE user_id = _user_id;

  INSERT INTO points_transactions (user_id, amount, type, description)
  VALUES (_user_id, _points, 'purchase', 'Zakup: ' || _product_name || ' w ' || _store_name);

  RETURN jsonb_build_object('success', true, 'points_awarded', _points);
END;
$$;
