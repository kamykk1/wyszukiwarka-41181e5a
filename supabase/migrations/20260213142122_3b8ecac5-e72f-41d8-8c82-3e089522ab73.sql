
-- Add header_html column for full HTML header content
ALTER TABLE public.page_settings ADD COLUMN header_html text NOT NULL DEFAULT '';

-- Populate with default HTML matching current static content
UPDATE public.page_settings SET header_html = '<div class="mb-3" style="display:inline-flex;align-items:center;gap:0.5rem;border-radius:9999px;border:1px solid rgba(var(--accent),0.3);background:rgba(var(--accent),0.1);padding:6px 16px;font-size:0.875rem;font-weight:500;color:hsl(var(--accent));">🏦 Porównywarka kont bankowych</div>
<h1 style="font-size:2rem;font-weight:900;color:hsl(var(--foreground));">Konta Bankowe</h1>
<p style="margin-top:0.5rem;color:hsl(var(--muted-foreground));">Porównaj najlepsze konta osobiste, firmowe i oszczędnościowe</p>' WHERE id = 'konta';

UPDATE public.page_settings SET header_html = '<div class="mb-3" style="display:inline-flex;align-items:center;gap:0.5rem;border-radius:9999px;border:1px solid rgba(var(--accent),0.3);background:rgba(var(--accent),0.1);padding:6px 16px;font-size:0.875rem;font-weight:500;color:hsl(var(--accent));">💳 Porównywarka kredytów</div>
<h1 style="font-size:2rem;font-weight:900;color:hsl(var(--foreground));">Kredyty</h1>
<p style="margin-top:0.5rem;color:hsl(var(--muted-foreground));">Znajdź najkorzystniejszy kredyt gotówkowy, konsolidacyjny lub hipoteczny</p>' WHERE id = 'kredyty';

UPDATE public.page_settings SET header_html = '<div class="mb-3" style="display:inline-flex;align-items:center;gap:0.5rem;border-radius:9999px;border:1px solid rgba(var(--accent),0.3);background:rgba(var(--accent),0.1);padding:6px 16px;font-size:0.875rem;font-weight:500;color:hsl(var(--accent));">🐷 Porównywarka lokat</div>
<h1 style="font-size:2rem;font-weight:900;color:hsl(var(--foreground));">Lokaty</h1>
<p style="margin-top:0.5rem;color:hsl(var(--muted-foreground));">Znajdź najwyższe oprocentowanie lokat terminowych</p>' WHERE id = 'lokaty';
