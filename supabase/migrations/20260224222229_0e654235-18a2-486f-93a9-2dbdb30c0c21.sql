
-- Wheel prizes table
CREATE TABLE public.wheel_prizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  points_reward INTEGER NOT NULL DEFAULT 0,
  probability_weight INTEGER NOT NULL DEFAULT 1,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  icon TEXT NOT NULL DEFAULT '🎁',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wheel_prizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active prizes" ON public.wheel_prizes FOR SELECT USING (true);
CREATE POLICY "Admins can manage prizes" ON public.wheel_prizes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Wheel spins log
CREATE TABLE public.wheel_spins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prize_id UUID REFERENCES public.wheel_prizes(id),
  points_won INTEGER NOT NULL DEFAULT 0,
  spin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, spin_date)
);

ALTER TABLE public.wheel_spins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own spins" ON public.wheel_spins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage spins" ON public.wheel_spins FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Spin function
CREATE OR REPLACE FUNCTION public.spin_wheel()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid UUID;
  _prize RECORD;
  _total_weight INTEGER;
  _random INTEGER;
  _cumulative INTEGER := 0;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Check daily limit
  IF EXISTS (SELECT 1 FROM wheel_spins WHERE user_id = _uid AND spin_date = CURRENT_DATE) THEN
    RETURN jsonb_build_object('error', 'already_spun', 'message', 'Już kręciłeś dziś kołem!');
  END IF;

  -- Get total weight
  SELECT COALESCE(SUM(probability_weight), 0) INTO _total_weight FROM wheel_prizes WHERE is_active = true;
  IF _total_weight = 0 THEN
    RETURN jsonb_build_object('error', 'no_prizes', 'message', 'Brak aktywnych nagród');
  END IF;

  -- Random weighted selection
  _random := floor(random() * _total_weight)::integer;

  FOR _prize IN SELECT * FROM wheel_prizes WHERE is_active = true ORDER BY id LOOP
    _cumulative := _cumulative + _prize.probability_weight;
    IF _random < _cumulative THEN
      -- Record spin
      INSERT INTO wheel_spins (user_id, prize_id, points_won, spin_date)
      VALUES (_uid, _prize.id, _prize.points_reward, CURRENT_DATE);

      -- Award points
      IF _prize.points_reward > 0 THEN
        UPDATE user_points SET balance = balance + _prize.points_reward, total_earned = total_earned + _prize.points_reward WHERE user_id = _uid;
        INSERT INTO points_transactions (user_id, amount, type, description)
        VALUES (_uid, _prize.points_reward, 'wheel', 'Koło fortuny: ' || _prize.name);
      END IF;

      RETURN jsonb_build_object('success', true, 'prize', jsonb_build_object(
        'id', _prize.id, 'name', _prize.name, 'points_reward', _prize.points_reward, 'color', _prize.color, 'icon', _prize.icon
      ));
    END IF;
  END LOOP;

  RETURN jsonb_build_object('error', 'unexpected');
END;
$$;
