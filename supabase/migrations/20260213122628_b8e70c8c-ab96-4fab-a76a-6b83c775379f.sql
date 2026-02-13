
CREATE OR REPLACE FUNCTION public.award_partner_task_points(
  _user_id uuid, _partner_id text, _task_type text, _external_task_id text, _product_id uuid DEFAULT NULL, _override_points integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _points INTEGER;
  _partner_name TEXT;
  _task_id UUID;
BEGIN
  IF _override_points IS NOT NULL THEN
    _points := _override_points;
    SELECT display_name INTO _partner_name FROM partner_integrations WHERE id = _partner_id AND enabled = true;
  ELSE
    SELECT task_points, display_name INTO _points, _partner_name
    FROM partner_integrations WHERE id = _partner_id AND enabled = true;
  END IF;

  IF _partner_name IS NULL THEN
    RETURN jsonb_build_object('error', 'Partner not found or disabled');
  END IF;

  IF EXISTS (SELECT 1 FROM partner_tasks WHERE partner_id = _partner_id AND external_task_id = _external_task_id AND status = 'confirmed') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_confirmed');
  END IF;

  INSERT INTO partner_tasks (user_id, partner_id, task_type, external_task_id, product_id, status, points_awarded, confirmed_at)
  VALUES (_user_id, _partner_id, _task_type, _external_task_id, _product_id, 'confirmed', _points, now())
  RETURNING id INTO _task_id;

  UPDATE user_points SET balance = balance + _points, total_earned = total_earned + _points WHERE user_id = _user_id;

  INSERT INTO points_transactions (user_id, amount, type, description)
  VALUES (_user_id, _points, 'partner_task', 'Zadanie ' || _partner_name || ': ' || _task_type);

  RETURN jsonb_build_object('success', true, 'points_awarded', _points, 'task_id', _task_id);
END;
$function$;
