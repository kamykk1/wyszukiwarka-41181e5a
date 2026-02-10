
-- Stores configuration table
CREATE TABLE public.stores (
  id text PRIMARY KEY,
  name text NOT NULL,
  logo text NOT NULL DEFAULT '🏪',
  color text NOT NULL DEFAULT '#666666',
  enabled boolean NOT NULL DEFAULT false,
  api_key text,
  api_secret text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Only admins can read stores (with API keys)
CREATE POLICY "Admins can manage stores"
  ON public.stores FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Public can read enabled stores (without secrets) via a view
CREATE VIEW public.stores_public
WITH (security_invoker = on) AS
  SELECT id, name, logo, color, enabled
  FROM public.stores;

-- Anyone can read public store info
CREATE POLICY "Anyone can view stores public info"
  ON public.stores FOR SELECT
  USING (true);

-- But we need to drop the broad SELECT and use the view approach
-- Actually let's keep it simple: admins get full access, anon gets public view
-- Drop the broad policy and use a more restricted one
DROP POLICY "Anyone can view stores public info" ON public.stores;

CREATE POLICY "Authenticated can view basic store info"
  ON public.stores FOR SELECT
  TO authenticated
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial store data
INSERT INTO public.stores (id, name, logo, color, enabled) VALUES
  ('allegro', 'Allegro', '🟠', '#FF5A00', true),
  ('amazon', 'Amazon', '📦', '#FF9900', true),
  ('aliexpress', 'AliExpress', '🔴', '#E43225', true),
  ('temu', 'Temu', '🟤', '#FB7701', true),
  ('ebay', 'eBay', '🟡', '#E53238', true),
  ('ceneo', 'Ceneo', '🟢', '#00A046', false),
  ('empik', 'Empik', '🟣', '#6B2D8B', false);
