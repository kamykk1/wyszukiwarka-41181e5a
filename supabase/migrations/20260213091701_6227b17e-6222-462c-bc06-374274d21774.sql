
-- Add 'purchase' type to points_transactions
ALTER TABLE public.points_transactions DROP CONSTRAINT points_transactions_type_check;
ALTER TABLE public.points_transactions ADD CONSTRAINT points_transactions_type_check 
  CHECK (type = ANY (ARRAY['earned', 'redeemed', 'adjusted', 'click', 'purchase']));

-- Function to award points for confirmed purchases (10 pts)
CREATE OR REPLACE FUNCTION public.award_purchase_points(_user_id UUID, _product_name TEXT, _store_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Award 10 points
  UPDATE user_points
  SET balance = balance + 10, total_earned = total_earned + 10
  WHERE user_id = _user_id;

  -- Log transaction
  INSERT INTO points_transactions (user_id, amount, type, description)
  VALUES (_user_id, 10, 'purchase', 'Zakup: ' || _product_name || ' w ' || _store_name);

  RETURN jsonb_build_object('success', true, 'points_awarded', 10);
END;
$$;
