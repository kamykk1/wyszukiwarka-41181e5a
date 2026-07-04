
CREATE OR REPLACE FUNCTION public.spin_wheel()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID;
  _prize RECORD;
  _total_weight INTEGER;
  _random INTEGER;
  _cumulative INTEGER := 0;
  _idx INTEGER := 0;
  _total_prizes INTEGER;
  _last_spin_at TIMESTAMPTZ;
  _next_at TIMESTAMPTZ;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  SELECT MAX(created_at) INTO _last_spin_at
    FROM wheel_spins WHERE user_id = _uid;

  IF _last_spin_at IS NOT NULL AND _last_spin_at > now() - INTERVAL '24 hours' THEN
    _next_at := _last_spin_at + INTERVAL '24 hours';
    RETURN jsonb_build_object(
      'error', 'already_spun',
      'message', 'Kolejne kręcenie będzie dostępne za 24 godziny od ostatniej gry.',
      'next_available_at', _next_at,
      'last_spin_at', _last_spin_at,
      'server_now', now()
    );
  END IF;

  SELECT COALESCE(SUM(probability_weight), 0), COUNT(*)
    INTO _total_weight, _total_prizes
    FROM wheel_prizes WHERE is_active = true;
  IF _total_weight = 0 THEN
    RETURN jsonb_build_object('error', 'no_prizes', 'message', 'Brak aktywnych nagród', 'server_now', now());
  END IF;

  _random := floor(random() * _total_weight)::integer;

  FOR _prize IN SELECT * FROM wheel_prizes WHERE is_active = true ORDER BY id LOOP
    _cumulative := _cumulative + _prize.probability_weight;
    IF _random < _cumulative THEN
      INSERT INTO wheel_spins (user_id, prize_id, points_won, spin_date)
      VALUES (_uid, _prize.id, _prize.points_reward, CURRENT_DATE);

      IF _prize.points_reward > 0 THEN
        UPDATE user_points SET balance = balance + _prize.points_reward, total_earned = total_earned + _prize.points_reward WHERE user_id = _uid;
        INSERT INTO points_transactions (user_id, amount, type, description)
        VALUES (_uid, _prize.points_reward, 'wheel', 'Koło fortuny: ' || _prize.name);
      END IF;

      RETURN jsonb_build_object(
        'success', true,
        'server_now', now(),
        'next_available_at', now() + INTERVAL '24 hours',
        'prize', jsonb_build_object(
          'id', _prize.id,
          'name', _prize.name,
          'points_reward', _prize.points_reward,
          'color', _prize.color,
          'icon', _prize.icon,
          'segment_index', _idx,
          'total_segments', _total_prizes
        )
      );
    END IF;
    _idx := _idx + 1;
  END LOOP;

  RETURN jsonb_build_object('error', 'unexpected', 'server_now', now());
END;
$function$;

-- Publiczny ranking ostatnich zwycięzców — anonimizowany po stronie bazy.
CREATE OR REPLACE FUNCTION public.get_recent_wheel_winners()
 RETURNS TABLE(masked_username text, prize_name text, prize_icon text, points_won integer, created_at timestamptz)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT
    CASE
      WHEN p.username IS NULL OR length(p.username) = 0 THEN 'Anonim'
      WHEN length(p.username) <= 3 THEN p.username || repeat('•', 3)
      ELSE substr(p.username, 1, 3) || repeat('•', GREATEST(3, length(p.username) - 3))
    END AS masked_username,
    wp.name AS prize_name,
    wp.icon AS prize_icon,
    ws.points_won,
    ws.created_at
  FROM public.wheel_spins ws
  LEFT JOIN public.profiles p ON p.user_id = ws.user_id
  LEFT JOIN public.wheel_prizes wp ON wp.id = ws.prize_id
  WHERE ws.points_won > 0
  ORDER BY ws.created_at DESC
  LIMIT 3
$$;

REVOKE ALL ON FUNCTION public.get_recent_wheel_winners() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recent_wheel_winners() TO anon, authenticated;
