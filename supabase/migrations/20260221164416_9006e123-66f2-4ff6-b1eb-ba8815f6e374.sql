
-- Email templates editable from admin panel
CREATE TABLE public.email_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  subject_template TEXT NOT NULL DEFAULT '',
  html_template TEXT NOT NULL DEFAULT '',
  variables TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read email templates"
  ON public.email_templates FOR SELECT USING (true);

CREATE POLICY "Admins can manage email templates"
  ON public.email_templates FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default templates
INSERT INTO public.email_templates (id, name, description, subject_template, html_template, variables) VALUES
(
  'partner_points',
  'Punkty od partnera',
  'Wysyłany gdy użytkownik otrzyma punkty za zadanie partnera',
  '🎉 Otrzymałeś {{points}} punktów w NetSzukacz!',
  '<div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto;">
  <h2 style="color: #f97316;">Gratulacje! 🎉</h2>
  <p>Przyznano Ci <strong style="font-size: 1.3em; color: #f97316;">{{points}} punktów</strong> za:</p>
  <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0;"><strong>{{category}}</strong></p>
    <p style="margin: 4px 0 0; color: #666;">Partner: {{partner_name}}</p>
    {{amount_info}}
  </div>
  <p>Punkty zostały dodane do Twojego konta. Sprawdź swój stan punktów i dostępne nagrody na <a href="https://wyszukiwarka.lovable.app/rewards" style="color: #f97316;">stronie nagród</a>.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
  <p style="color: #999; font-size: 12px;">NetSzukacz.pl — Porównywarka cen i finansów</p>
</div>',
  ARRAY['points', 'category', 'partner_name', 'amount_info']
),
(
  'threshold_reached',
  'Osiągnięto próg punktowy',
  'Wysyłany gdy użytkownik osiągnie ustawiony próg punktów',
  '🎉 Osiągnięto {{threshold}} punktów w SmartPrice!',
  '<h2>Gratulacje{{name_greeting}}!</h2>
<p>Zdobyłeś już <strong>{{total_earned}}</strong> punktów w programie SmartPrice.</p>
<p>Sprawdź dostępne nagrody w naszym katalogu!</p>
<hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
<p style="color: #999; font-size: 12px;">NetSzukacz.pl — Porównywarka cen i finansów</p>',
  ARRAY['threshold', 'name_greeting', 'total_earned']
),
(
  'new_reward',
  'Nowa nagroda',
  'Wysyłany gdy pojawi się nowa nagroda w katalogu',
  '🎁 Nowa nagroda w SmartPrice: {{reward_name}}',
  '<h2>Nowa nagroda dostępna!</h2>
<p><strong>{{reward_name}}</strong> — {{points_cost}} punktów</p>
{{reward_description}}
<p>Zaloguj się i odbierz swoją nagrodę!</p>
<hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
<p style="color: #999; font-size: 12px;">NetSzukacz.pl — Porównywarka cen i finansów</p>',
  ARRAY['reward_name', 'points_cost', 'reward_description']
),
(
  'mailing_default',
  'Szablon mailingu',
  'Domyślny szablon używany przy wysyłce kampanii mailingowych',
  '{{subject}}',
  '<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#333;">
  <div style="background:#ff6b35;padding:20px;text-align:center;">
    <h1 style="color:white;margin:0;">SmartPrice</h1>
  </div>
  <div style="padding:24px;background:#fff;">
    <h2 style="color:#1a1a2e;">{{subject}}</h2>
    <p>Cześć {{name}}!</p>
    <div>{{message}}</div>
    {{click_button}}
  </div>
  <div style="padding:16px;text-align:center;color:#999;font-size:12px;border-top:1px solid #eee;">
    SmartPrice — porównywarka cen
  </div>
</div>',
  ARRAY['subject', 'name', 'message', 'click_button']
);

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
