
DROP FUNCTION IF EXISTS public.award_purchase_points(text, text);

DROP POLICY IF EXISTS "Anyone can read email templates" ON public.email_templates;

DROP POLICY IF EXISTS "Authenticated can read offers settings" ON public.offers_settings;
CREATE POLICY "Admins can read offers settings"
  ON public.offers_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can view tradedoubler programs" ON public.tradedoubler_programs;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon',
                   r.proname, r.args);
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_add_points(uuid, integer, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_referral(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.award_partner_task_points(uuid, text, text, text, uuid, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.award_click_points(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.award_mailing_click_points(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.award_purchase_points(uuid, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.redeem_reward(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_reward() FROM authenticated, anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.award_click_points(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_reward(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.spin_wheel() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_daily_streak() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_referral_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_mailing_click_points(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_username_taken(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO anon, authenticated;
