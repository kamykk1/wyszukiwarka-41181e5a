
-- Fix 1: Create atomic redeem_reward function to prevent race conditions
CREATE OR REPLACE FUNCTION public.redeem_reward(
  _user_id UUID,
  _reward_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _points_cost INTEGER;
  _current_balance INTEGER;
  _stock INTEGER;
  _reward_name TEXT;
BEGIN
  SELECT balance INTO _current_balance
  FROM user_points WHERE user_id = _user_id FOR UPDATE;

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
  VALUES (_user_id, _reward_id, _points_cost);

  UPDATE user_points SET balance = balance - _points_cost WHERE user_id = _user_id;

  INSERT INTO points_transactions (user_id, amount, type, description)
  VALUES (_user_id, -_points_cost, 'redeemed', 'Odebrano: ' || _reward_name);

  IF _stock IS NOT NULL THEN
    UPDATE rewards SET stock = stock - 1 WHERE id = _reward_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Fix 2: Add validation trigger for rewards table
CREATE OR REPLACE FUNCTION public.validate_reward()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF length(NEW.name) > 200 THEN
    RAISE EXCEPTION 'Reward name too long (max 200 characters)';
  END IF;
  IF NEW.description IS NOT NULL AND length(NEW.description) > 1000 THEN
    RAISE EXCEPTION 'Reward description too long (max 1000 characters)';
  END IF;
  IF NEW.points_cost <= 0 OR NEW.points_cost > 10000000 THEN
    RAISE EXCEPTION 'Points cost must be between 1 and 10,000,000';
  END IF;
  IF NEW.stock IS NOT NULL AND (NEW.stock < 0 OR NEW.stock > 1000000) THEN
    RAISE EXCEPTION 'Stock must be between 0 and 1,000,000';
  END IF;
  IF NEW.image_url IS NOT NULL AND length(NEW.image_url) > 2000 THEN
    RAISE EXCEPTION 'Image URL too long (max 2000 characters)';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_reward_before_insert_update
BEFORE INSERT OR UPDATE ON public.rewards
FOR EACH ROW
EXECUTE FUNCTION public.validate_reward();
