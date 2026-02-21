-- Remove the INSERT policy that allows users to bypass award_click_points function
DROP POLICY IF EXISTS "Users can insert own click logs" ON public.click_points_log;