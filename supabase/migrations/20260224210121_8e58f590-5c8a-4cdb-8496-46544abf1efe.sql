
-- Drop both overloads
DROP FUNCTION IF EXISTS public.award_partner_task_points(uuid, text, text, text, uuid);
DROP FUNCTION IF EXISTS public.award_partner_task_points(uuid, text, text, text, uuid, integer);

-- Recreate with friendly descriptions
CREATE FUNCTION public.award_partner_task_points(
  _user_id UUID,
  _partner_id TEXT,
  _task_type TEXT,
  _external_task_id TEXT,
  _product_id UUID DEFAULT NULL,
  _override_points INTEGER DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _points INTEGER;
  _partner_name TEXT;
  _task_id UUID;
  _product_name TEXT;
  _description TEXT;
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

  -- Try to get product name if product_id provided
  IF _product_id IS NOT NULL THEN
    SELECT name INTO _product_name FROM financial_products WHERE id = _product_id;
  END IF;

  -- Build friendly description
  _description := CASE _task_type
    WHEN 'account_opened' THEN 'Założenie konta'
    WHEN 'account_open' THEN 'Założenie konta'
    WHEN 'loan_approved' THEN 'Zatwierdzenie kredytu'
    WHEN 'deposit_opened' THEN 'Założenie lokaty'
    WHEN 'card_issued' THEN 'Wydanie karty'
    WHEN 'insurance_signed' THEN 'Podpisanie ubezpieczenia'
    ELSE REPLACE(_task_type, '_', ' ')
  END;

  IF _product_name IS NOT NULL THEN
    _description := _description || ': ' || _product_name;
  END IF;

  INSERT INTO partner_tasks (user_id, partner_id, task_type, external_task_id, product_id, status, points_awarded, confirmed_at)
  VALUES (_user_id, _partner_id, _task_type, _external_task_id, _product_id, 'confirmed', _points, now())
  RETURNING id INTO _task_id;

  UPDATE user_points SET balance = balance + _points, total_earned = total_earned + _points WHERE user_id = _user_id;

  INSERT INTO points_transactions (user_id, amount, type, description)
  VALUES (_user_id, _points, 'partner_task', _description);

  RETURN jsonb_build_object('success', true, 'points_awarded', _points, 'task_id', _task_id);
END;
$$;
