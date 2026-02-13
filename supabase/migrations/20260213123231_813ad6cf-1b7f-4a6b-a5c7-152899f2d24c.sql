
ALTER TABLE public.partner_integrations 
ADD COLUMN IF NOT EXISTS category_api_keys jsonb NOT NULL DEFAULT '{}'::jsonb;
