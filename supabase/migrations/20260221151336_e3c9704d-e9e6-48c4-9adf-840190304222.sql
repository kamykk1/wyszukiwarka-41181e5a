-- Add per-product point reward to financial_products
ALTER TABLE public.financial_products
ADD COLUMN IF NOT EXISTS points_reward integer DEFAULT NULL;

COMMENT ON COLUMN public.financial_products.points_reward IS 'Custom point reward for this specific product. If NULL, category default from partner_integrations is used.';