
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, username, first_name, last_name, street, city, postal_code, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'name',
    NEW.email,
    NEW.raw_user_meta_data ->> 'username',
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'street',
    NEW.raw_user_meta_data ->> 'city',
    NEW.raw_user_meta_data ->> 'postal_code',
    NEW.raw_user_meta_data ->> 'phone'
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  INSERT INTO public.user_points (user_id, balance, total_earned)
  VALUES (NEW.id, 0, 0);
  RETURN NEW;
END;
$function$;

-- Fix existing test user
UPDATE public.profiles SET username = 'testuser2026', first_name = 'Test', last_name = 'User'
WHERE email = 'testuser2026@test.com' AND username IS NULL;
