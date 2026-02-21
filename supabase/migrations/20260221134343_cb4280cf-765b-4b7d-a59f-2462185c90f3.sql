
ALTER TABLE public.partner_integrations 
ADD COLUMN category_calc_mode jsonb NOT NULL DEFAULT '{}'::jsonb;
