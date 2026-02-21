CREATE POLICY "Anyone can view tradedoubler programs"
ON public.tradedoubler_programs
FOR SELECT
USING (true);