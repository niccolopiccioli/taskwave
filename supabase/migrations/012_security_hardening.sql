-- Security hardening: billing fields, storage RLS, RPC access control

-- 1. Block direct updates to billing columns on profiles
CREATE OR REPLACE FUNCTION protect_profile_billing_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('app.allow_plan_sync', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
     OR NEW.stripe_price_id IS DISTINCT FROM OLD.stripe_price_id THEN
    RAISE EXCEPTION 'I campi di fatturazione non possono essere modificati direttamente';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_billing ON profiles;
CREATE TRIGGER trg_protect_profile_billing
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_billing_columns();

-- 2. sync_profile_plan: only self or service_role (remove hardcoded webhook secret)
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
  IF auth.role() = 'service_role' THEN
    NULL;
  ELSIF auth.uid() = p_user_id THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  PERFORM set_config('app.allow_plan_sync', 'true', true);

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

  RETURN json_build_object('id', v_row.id, 'plan', v_row.plan);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_profile_plan(uuid, plan_tier, text, text, text, text) FROM anon;

-- 3. create_notification: service_role only (called from server-side task events)
REVOKE EXECUTE ON FUNCTION create_notification(UUID, notification_type, TEXT, TEXT, UUID, UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION create_notification(UUID, notification_type, TEXT, TEXT, UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION create_notification(UUID, notification_type, TEXT, TEXT, UUID, UUID) TO service_role;

-- 4. validate_api_key: service_role only (REST API server routes)
REVOKE EXECUTE ON FUNCTION validate_api_key(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION validate_api_key(TEXT) TO service_role;

-- 5. API keys: require workspace admin on insert
DROP POLICY IF EXISTS "Users can create api keys" ON api_keys;
CREATE POLICY "Workspace admins can create api keys" ON api_keys
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND workspace_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = workspace_id AND w.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = api_keys.workspace_id
          AND wm.user_id = auth.uid()
          AND wm.role = 'admin'
      )
    )
  );

-- 6. Storage: scope attachments to task workspace membership
CREATE OR REPLACE FUNCTION storage_attachment_task_id(object_name text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  parts text[];
  v_task_id uuid;
BEGIN
  parts := string_to_array(object_name, '/');
  IF parts IS NULL OR array_length(parts, 1) < 2 THEN
    RETURN NULL;
  END IF;
  BEGIN
    v_task_id := parts[2]::uuid;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
  RETURN v_task_id;
END;
$$;

DROP POLICY IF EXISTS "Members can read attachments" ON storage.objects;
DROP POLICY IF EXISTS "Members can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Uploaders can delete attachments" ON storage.objects;

CREATE POLICY "Members can read task attachments storage" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'task-attachments'
    AND auth.role() = 'authenticated'
    AND storage_attachment_task_id(name) IS NOT NULL
    AND is_workspace_member(task_workspace_id(storage_attachment_task_id(name)))
  );

CREATE POLICY "Members can upload task attachments storage" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'task-attachments'
    AND auth.role() = 'authenticated'
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
    AND storage_attachment_task_id(name) IS NOT NULL
    AND is_workspace_member(task_workspace_id(storage_attachment_task_id(name)))
  );

CREATE POLICY "Uploaders can delete task attachments storage" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'task-attachments'
    AND auth.role() = 'authenticated'
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
    AND storage_attachment_task_id(name) IS NOT NULL
    AND is_workspace_member(task_workspace_id(storage_attachment_task_id(name)))
  );

-- 7. Notifications: no direct client inserts
DROP POLICY IF EXISTS "Service creates notifications" ON notifications;
-- RLS default deny on INSERT without policy — ensure no permissive insert exists
