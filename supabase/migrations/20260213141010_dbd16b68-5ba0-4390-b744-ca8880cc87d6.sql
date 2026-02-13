
-- Table for editable page descriptions
CREATE TABLE public.page_settings (
  id text PRIMARY KEY,
  subtitle text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.page_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read page settings" ON public.page_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage page settings" ON public.page_settings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default values
INSERT INTO public.page_settings (id, subtitle) VALUES
  ('konta', 'Porównaj najlepsze konta osobiste, firmowe i oszczędnościowe'),
  ('kredyty', 'Znajdź najkorzystniejszy kredyt gotówkowy, konsolidacyjny lub hipoteczny'),
  ('lokaty', 'Znajdź najwyższe oprocentowanie lokat terminowych');
