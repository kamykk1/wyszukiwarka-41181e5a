
-- Settings table for admin-configurable values (like point value in PLN)
CREATE TABLE public.reward_settings (
  id text PRIMARY KEY DEFAULT 'default',
  point_value_pln numeric NOT NULL DEFAULT 0.01,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.reward_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reward settings"
  ON public.reward_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage reward settings"
  ON public.reward_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'));

INSERT INTO public.reward_settings (id, point_value_pln) VALUES ('default', 0.01);

-- User points balance
CREATE TABLE public.user_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  balance integer NOT NULL DEFAULT 0,
  total_earned integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own points"
  ON public.user_points FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all points"
  ON public.user_points FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can manage points"
  ON public.user_points FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Points transactions log
CREATE TABLE public.points_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  type text NOT NULL CHECK (type IN ('earned', 'redeemed', 'adjusted')),
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.points_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage transactions"
  ON public.points_transactions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Rewards catalog
CREATE TABLE public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  points_cost integer NOT NULL,
  image_url text,
  stock integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active rewards"
  ON public.rewards FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage rewards"
  ON public.rewards FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Redemptions
CREATE TABLE public.reward_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reward_id uuid REFERENCES public.rewards(id) NOT NULL,
  points_spent integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own redemptions"
  ON public.reward_redemptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create redemptions"
  ON public.reward_redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage redemptions"
  ON public.reward_redemptions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at on rewards
CREATE TRIGGER update_rewards_updated_at
  BEFORE UPDATE ON public.rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reward_settings_updated_at
  BEFORE UPDATE ON public.reward_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_points_updated_at
  BEFORE UPDATE ON public.user_points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create user_points row on new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'name');
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  INSERT INTO public.user_points (user_id, balance, total_earned)
  VALUES (NEW.id, 0, 0);
  RETURN NEW;
END;
$$;
