
-- Partner integrations settings table
CREATE TABLE public.partner_integrations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  api_key TEXT,
  api_secret TEXT,
  base_url TEXT,
  task_points INTEGER NOT NULL DEFAULT 10,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage partner integrations"
ON public.partner_integrations FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view enabled integrations"
ON public.partner_integrations FOR SELECT
USING (true);

-- Financial products table
CREATE TABLE public.financial_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('konta', 'kredyty', 'lokaty')),
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  description TEXT,
  interest_rate NUMERIC,
  annual_fee NUMERIC,
  min_amount NUMERIC,
  max_amount NUMERIC,
  currency TEXT DEFAULT 'PLN',
  features JSONB DEFAULT '[]'::jsonb,
  affiliate_url TEXT,
  partner_id TEXT REFERENCES public.partner_integrations(id),
  source TEXT, -- 'bankier' or 'superpartner' or 'manual'
  external_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products"
ON public.financial_products FOR SELECT
USING (true);

CREATE POLICY "Admins can manage products"
ON public.financial_products FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Partner task completions log
CREATE TABLE public.partner_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  partner_id TEXT NOT NULL REFERENCES public.partner_integrations(id),
  task_type TEXT NOT NULL, -- e.g. 'account_opened', 'credit_applied', 'deposit_created'
  product_id UUID REFERENCES public.financial_products(id),
  external_task_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, rejected
  points_awarded INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

ALTER TABLE public.partner_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks"
ON public.partner_tasks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage tasks"
ON public.partner_tasks FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default partner integrations
INSERT INTO public.partner_integrations (id, name, display_name, enabled, base_url, task_points, description) VALUES
('bankier', 'bankier', 'Bankier.pl', false, 'https://api.bankier.pl', 15, 'Integracja z serwisem Bankier.pl — porównywarka kont, kredytów i lokat'),
('superpartner', 'superpartner', 'SuperPartner.pl', false, 'https://api.superpartner.pl', 10, 'Program partnerski SuperPartner.pl');

-- DB function to award partner task points
CREATE OR REPLACE FUNCTION public.award_partner_task_points(_user_id UUID, _partner_id TEXT, _task_type TEXT, _external_task_id TEXT, _product_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _points INTEGER;
  _partner_name TEXT;
  _task_id UUID;
BEGIN
  SELECT task_points, display_name INTO _points, _partner_name
  FROM partner_integrations WHERE id = _partner_id AND enabled = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Partner not found or disabled');
  END IF;

  -- Check for duplicate
  IF EXISTS (SELECT 1 FROM partner_tasks WHERE partner_id = _partner_id AND external_task_id = _external_task_id AND status = 'confirmed') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_confirmed');
  END IF;

  INSERT INTO partner_tasks (user_id, partner_id, task_type, external_task_id, product_id, status, points_awarded, confirmed_at)
  VALUES (_user_id, _partner_id, _task_type, _external_task_id, _product_id, 'confirmed', _points, now())
  RETURNING id INTO _task_id;

  UPDATE user_points SET balance = balance + _points, total_earned = total_earned + _points WHERE user_id = _user_id;

  INSERT INTO points_transactions (user_id, amount, type, description)
  VALUES (_user_id, _points, 'partner_task', 'Zadanie ' || _partner_name || ': ' || _task_type);

  RETURN jsonb_build_object('success', true, 'points_awarded', _points, 'task_id', _task_id);
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_partner_integrations_updated_at
BEFORE UPDATE ON public.partner_integrations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_products_updated_at
BEFORE UPDATE ON public.financial_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
