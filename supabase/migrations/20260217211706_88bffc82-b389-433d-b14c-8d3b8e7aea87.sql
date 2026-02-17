
-- Fix admin_add_points: add admin authorization check
CREATE OR REPLACE FUNCTION public.admin_add_points(
  _user_id uuid, _amount integer, _description text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Authorization check: only admins can call this
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('error', 'Unauthorized: admin role required');
  END IF;

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
