
-- Streak tracking table
CREATE TABLE public.user_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streak" ON public.user_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage streaks" ON public.user_streaks FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to check and update streak, awarding bonus if applicable
CREATE OR REPLACE FUNCTION public.check_daily_streak()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid UUID;
  _streak RECORD;
  _today DATE := CURRENT_DATE;
  _bonus INTEGER := 0;
  _new_streak INTEGER;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  SELECT * INTO _streak FROM user_streaks WHERE user_id = _uid FOR UPDATE;

  -- Create streak record if not exists
  IF NOT FOUND THEN
    INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date)
    VALUES (_uid, 1, 1, _today);
    RETURN jsonb_build_object('success', true, 'streak', 1, 'bonus', 0, 'already_checked', false);
  END IF;

  -- Already checked today
  IF _streak.last_activity_date = _today THEN
    RETURN jsonb_build_object('success', true, 'streak', _streak.current_streak, 'bonus', 0, 'already_checked', true);
  END IF;

  -- Consecutive day
  IF _streak.last_activity_date = _today - 1 THEN
    _new_streak := _streak.current_streak + 1;
  ELSE
    _new_streak := 1;
  END IF;

  -- Bonus: 1 pt per streak day, capped at 50
  _bonus := LEAST(_new_streak, 50);

  UPDATE user_streaks
  SET current_streak = _new_streak,
      longest_streak = GREATEST(_streak.longest_streak, _new_streak),
      last_activity_date = _today,
      updated_at = now()
  WHERE user_id = _uid;

  -- Award bonus points
  IF _bonus > 0 THEN
    UPDATE user_points SET balance = balance + _bonus, total_earned = total_earned + _bonus WHERE user_id = _uid;
    INSERT INTO points_transactions (user_id, amount, type, description)
    VALUES (_uid, _bonus, 'earned', 'Bonus za serię ' || _new_streak || ' dni aktywności');
  END IF;

  RETURN jsonb_build_object('success', true, 'streak', _new_streak, 'bonus', _bonus, 'already_checked', false);
END;
$$;
