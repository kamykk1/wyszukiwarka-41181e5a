
-- Table to track click events and prevent abuse
CREATE TABLE public.click_points_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  click_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.click_points_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own click logs"
ON public.click_points_log FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own click logs"
ON public.click_points_log FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Dedup index
CREATE UNIQUE INDEX idx_click_points_unique_daily 
ON public.click_points_log (user_id, product_name, click_date);

-- Atomic function to award points for clicking a purchase link
CREATE OR REPLACE FUNCTION public.award_click_points(_user_id UUID, _product_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Try insert, skip if already clicked today
  INSERT INTO click_points_log (user_id, product_name, click_date)
  VALUES (_user_id, _product_name, CURRENT_DATE)
  ON CONFLICT (user_id, product_name, click_date) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_clicked_today');
  END IF;

  -- Award 1 point
  UPDATE user_points
  SET balance = balance + 1, total_earned = total_earned + 1
  WHERE user_id = _user_id;

  -- Log transaction
  INSERT INTO points_transactions (user_id, amount, type, description)
  VALUES (_user_id, 1, 'click', 'Kliknięcie w link: ' || _product_name);

  RETURN jsonb_build_object('success', true, 'points_awarded', 1);
END;
$$;
