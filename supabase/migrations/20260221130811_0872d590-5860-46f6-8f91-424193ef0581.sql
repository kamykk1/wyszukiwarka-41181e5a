
-- Allow anyone to look up email by username for login purposes
CREATE POLICY "Anyone can lookup email by username"
ON public.profiles
FOR SELECT
USING (username IS NOT NULL);
