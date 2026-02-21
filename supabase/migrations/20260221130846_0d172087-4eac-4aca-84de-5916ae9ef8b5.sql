
-- Drop the overly broad policy
DROP POLICY IF EXISTS "Anyone can lookup email by username" ON public.profiles;

-- Create a secure function to resolve username to email
CREATE OR REPLACE FUNCTION public.get_email_by_username(_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT email FROM public.profiles WHERE username = _username LIMIT 1;
$$;
