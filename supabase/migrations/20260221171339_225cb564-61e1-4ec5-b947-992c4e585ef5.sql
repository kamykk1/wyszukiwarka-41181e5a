-- First deduplicate: keep only the earliest click per user+product
DELETE FROM click_points_log a
USING click_points_log b
WHERE a.user_id = b.user_id
  AND a.product_name = b.product_name
  AND a.created_at > b.created_at;

-- Now create unique index: 1 click per product ever
CREATE UNIQUE INDEX click_points_log_user_product_idx ON public.click_points_log (user_id, product_name);

-- Update the award_click_points function (auth.uid() version)
CREATE OR REPLACE FUNCTION public.award_click_points(_product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  ON CONFLICT (user_id, product_name) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_clicked');
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
$function$;

-- Update the award_click_points function (user_id version)
CREATE OR REPLACE FUNCTION public.award_click_points(_user_id uuid, _product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _points INTEGER;
BEGIN
  INSERT INTO click_points_log (user_id, product_name, click_date)
  VALUES (_user_id, _product_name, CURRENT_DATE)
  ON CONFLICT (user_id, product_name) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_clicked');
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
$function$;