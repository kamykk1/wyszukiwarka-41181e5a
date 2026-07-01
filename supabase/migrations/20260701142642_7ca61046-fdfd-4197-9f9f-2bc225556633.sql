
-- 1. Revoke EXECUTE on all SECURITY DEFINER functions from PUBLIC/anon/authenticated, then re-grant selectively.

-- Trigger / internal functions (no client calls)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_reward() FROM PUBLIC, anon, authenticated;

-- Service-role-only variants (called by edge functions)
REVOKE ALL ON FUNCTION public.award_purchase_points(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.award_click_points(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.award_mailing_click_points(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.award_partner_task_points(uuid, text, text, text, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.redeem_reward(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_referral(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_add_points(uuid, integer, text) FROM PUBLIC, anon, authenticated;

-- Admin function: only signed-in users may attempt (function itself enforces admin role)
GRANT EXECUTE ON FUNCTION public.admin_add_points(uuid, integer, text) TO authenticated;

-- Client-callable functions: authenticated only, revoke anon
REVOKE ALL ON FUNCTION public.award_purchase_points(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_purchase_points(text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.award_click_points(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_click_points(text) TO authenticated;

REVOKE ALL ON FUNCTION public.award_mailing_click_points(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_mailing_click_points(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.redeem_reward(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_reward(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_or_create_referral_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_referral_code() TO authenticated;

REVOKE ALL ON FUNCTION public.spin_wheel() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spin_wheel() TO authenticated;

REVOKE ALL ON FUNCTION public.check_daily_streak() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_daily_streak() TO authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Login/registration helpers: anon needs to call (pre-auth)
REVOKE ALL ON FUNCTION public.get_email_by_username(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.is_username_taken(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_username_taken(text) TO anon, authenticated;

-- 2. Storage: drop broad SELECT on email-assets to prevent listing. Public URLs still resolve for public buckets.
DROP POLICY IF EXISTS "Public read email assets" ON storage.objects;

-- 3. Explicit deny INSERT/UPDATE/DELETE on click_points_log for regular users (all writes via SECURITY DEFINER).
CREATE POLICY "Block direct writes to click log"
  ON public.click_points_log
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- 4. Explicit deny INSERT/UPDATE/DELETE on partner_tasks for regular users. Keep existing admin ALL policy + user SELECT.
-- Restrictive policy that blocks writes but allows reads via other policies.
CREATE POLICY "Block direct writes to partner tasks"
  ON public.partner_tasks
  AS RESTRICTIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Block direct updates to partner tasks"
  ON public.partner_tasks
  AS RESTRICTIVE
  FOR UPDATE
  TO anon, authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Block direct deletes on partner tasks"
  ON public.partner_tasks
  AS RESTRICTIVE
  FOR DELETE
  TO anon, authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Allow referred user to view their own referral records
CREATE POLICY "Users can view own referrals as referred"
  ON public.referrals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = referred_user_id);
