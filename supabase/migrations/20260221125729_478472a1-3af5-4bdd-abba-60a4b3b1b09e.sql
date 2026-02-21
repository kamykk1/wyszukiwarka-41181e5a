
-- Add username column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Add page_settings rows for additional pages
INSERT INTO public.page_settings (id, header_html, subtitle) VALUES 
  ('home', '', ''),
  ('cashback', '', ''),
  ('rewards', '', ''),
  ('leaderboard', '', '')
ON CONFLICT (id) DO NOTHING;
