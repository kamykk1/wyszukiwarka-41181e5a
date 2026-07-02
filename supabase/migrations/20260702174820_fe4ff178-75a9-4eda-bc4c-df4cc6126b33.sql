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
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  IF EXISTS (SELECT 1 FROM wheel_spins WHERE user_id = _uid AND spin_date = CURRENT_DATE) THEN
    RETURN jsonb_build_object('error', 'already_spun', 'message', 'Już kręciłeś dziś kołem!');
  END IF;

  SELECT COALESCE(SUM(probability_weight), 0), COUNT(*)
    INTO _total_weight, _total_prizes
    FROM wheel_prizes WHERE is_active = true;
  IF _total_weight = 0 THEN
    RETURN jsonb_build_object('error', 'no_prizes', 'message', 'Brak aktywnych nagród');
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

  RETURN jsonb_build_object('error', 'unexpected');
END;
$function$;