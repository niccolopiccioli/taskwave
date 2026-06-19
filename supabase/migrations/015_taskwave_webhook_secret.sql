-- Accept TaskWave webhook secret alias for sync_profile_plan

CREATE OR REPLACE FUNCTION public.sync_profile_plan(
  p_user_id uuid,
  p_plan plan_tier,
  p_stripe_customer_id text DEFAULT NULL,
  p_stripe_subscription_id text DEFAULT NULL,
  p_stripe_price_id text DEFAULT NULL,
  p_webhook_secret text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row profiles%ROWTYPE;
BEGIN
  IF p_webhook_secret IS NOT NULL AND p_webhook_secret IN ('taskflow_webhook_2026', 'taskwave_webhook_2026') THEN
    NULL;
  ELSIF auth.uid() = p_user_id THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE profiles
  SET
    plan = p_plan,
    stripe_customer_id = COALESCE(p_stripe_customer_id, stripe_customer_id),
    stripe_subscription_id = COALESCE(p_stripe_subscription_id, stripe_subscription_id),
    stripe_price_id = COALESCE(p_stripe_price_id, stripe_price_id),
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  RETURN row_to_json(v_row);
END;
$$;
