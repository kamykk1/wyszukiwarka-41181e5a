
-- Add category_points JSONB to partner_integrations for per-category point settings
ALTER TABLE public.partner_integrations 
ADD COLUMN IF NOT EXISTS category_points jsonb NOT NULL DEFAULT '{}'::jsonb;

-- COMMENT: category_points stores per-category points like:
-- {"konta_osobiste": 15, "konta_firmowe": 20, "kredyty_gotowkowe": 25, ...}
