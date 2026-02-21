
CREATE OR REPLACE FUNCTION public.is_username_taken(_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE username = _username);
$$;
