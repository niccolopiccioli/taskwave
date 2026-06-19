-- Pending workspace invitations: invitee must accept before joining.

CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'cancelled', 'expired');

CREATE TABLE workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status invitation_status NOT NULL DEFAULT 'pending',
  role member_role NOT NULL DEFAULT 'member',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_workspace_invitations_pending_email
  ON workspace_invitations (workspace_id, lower(email))
  WHERE status = 'pending';

CREATE INDEX idx_workspace_invitations_token ON workspace_invitations(token);
CREATE INDEX idx_workspace_invitations_user_pending
  ON workspace_invitations(user_id)
  WHERE status = 'pending';

ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view workspace invitations" ON workspace_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_invitations.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role = 'admin'
    )
  );

CREATE POLICY "Users view own invitations" ON workspace_invitations
  FOR SELECT USING (
    lower(email) = (SELECT lower(email) FROM profiles WHERE id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE OR REPLACE FUNCTION workspace_member_limit(p_plan plan_tier)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_plan
    WHEN 'free' THEN 5
    WHEN 'pro' THEN 100000
    WHEN 'business' THEN 100000
    ELSE 5
  END;
$$;

CREATE OR REPLACE FUNCTION assert_can_manage_workspace(p_workspace_id UUID, p_caller UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_caller IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = p_workspace_id AND w.owner_id = p_caller
  ) AND NOT EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = p_workspace_id
      AND wm.user_id = p_caller
      AND wm.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Permesso negato';
  END IF;
END;
$$;

-- Replaces direct member insert: creates a pending invitation.
DROP FUNCTION IF EXISTS invite_member_by_email(UUID, TEXT);

CREATE OR REPLACE FUNCTION invite_member_by_email(
  p_workspace_id UUID,
  p_email TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_user_id UUID;
  v_token TEXT;
  v_invitation_id UUID;
  v_normalized_email TEXT := lower(trim(p_email));
BEGIN
  PERFORM assert_can_manage_workspace(p_workspace_id, v_caller);

  IF v_normalized_email = '' THEN
    RAISE EXCEPTION 'Email obbligatoria';
  END IF;

  SELECT id INTO v_user_id
  FROM profiles
  WHERE lower(email) = v_normalized_email
  LIMIT 1;

  IF v_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Utente già membro del workspace.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM workspace_invitations
    WHERE workspace_id = p_workspace_id
      AND lower(email) = v_normalized_email
      AND status = 'pending'
      AND expires_at > NOW()
  ) THEN
    RAISE EXCEPTION 'Invito già inviato a questa email.';
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO workspace_invitations (
    workspace_id, email, user_id, invited_by, token
  )
  VALUES (
    p_workspace_id, v_normalized_email, v_user_id, v_caller, v_token
  )
  RETURNING id INTO v_invitation_id;

  RETURN json_build_object(
    'invitation_id', v_invitation_id,
    'token', v_token
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_invitation_by_token(p_token TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv workspace_invitations%ROWTYPE;
  v_workspace_name TEXT;
  v_inviter_name TEXT;
BEGIN
  SELECT * INTO v_inv
  FROM workspace_invitations
  WHERE token = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invito non trovato';
  END IF;

  IF v_inv.status != 'pending' THEN
    RETURN json_build_object(
      'status', v_inv.status,
      'workspace_name', NULL,
      'inviter_name', NULL,
      'email', v_inv.email,
      'expires_at', v_inv.expires_at
    );
  END IF;

  IF v_inv.expires_at < NOW() THEN
    UPDATE workspace_invitations
    SET status = 'expired', responded_at = NOW()
    WHERE id = v_inv.id;
    RAISE EXCEPTION 'Invito scaduto';
  END IF;

  SELECT w.name INTO v_workspace_name
  FROM workspaces w WHERE w.id = v_inv.workspace_id;

  SELECT COALESCE(p.full_name, p.email, 'Un membro del team') INTO v_inviter_name
  FROM profiles p WHERE p.id = v_inv.invited_by;

  RETURN json_build_object(
    'status', v_inv.status,
    'workspace_id', v_inv.workspace_id,
    'workspace_name', v_workspace_name,
    'inviter_name', v_inviter_name,
    'email', v_inv.email,
    'expires_at', v_inv.expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION accept_workspace_invitation(p_token TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_inv workspace_invitations%ROWTYPE;
  v_caller_email TEXT;
  v_owner_plan plan_tier;
  v_member_count INTEGER;
  v_limit INTEGER;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;

  SELECT lower(email) INTO v_caller_email FROM profiles WHERE id = v_caller;

  SELECT * INTO v_inv
  FROM workspace_invitations
  WHERE token = p_token AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invito non valido o già gestito';
  END IF;

  IF v_inv.expires_at < NOW() THEN
    UPDATE workspace_invitations SET status = 'expired', responded_at = NOW() WHERE id = v_inv.id;
    RAISE EXCEPTION 'Invito scaduto';
  END IF;

  IF v_caller_email != lower(v_inv.email) THEN
    RAISE EXCEPTION 'Questo invito è per un altro account email';
  END IF;

  IF EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = v_inv.workspace_id AND user_id = v_caller
  ) THEN
    UPDATE workspace_invitations
    SET status = 'accepted', responded_at = NOW(), user_id = v_caller
    WHERE id = v_inv.id;
    RETURN json_build_object('workspace_id', v_inv.workspace_id, 'already_member', true);
  END IF;

  SELECT p.plan INTO v_owner_plan
  FROM workspaces w
  JOIN profiles p ON p.id = w.owner_id
  WHERE w.id = v_inv.workspace_id;

  SELECT COUNT(*)::INTEGER INTO v_member_count
  FROM workspace_members WHERE workspace_id = v_inv.workspace_id;

  v_limit := workspace_member_limit(v_owner_plan);

  IF v_member_count >= v_limit THEN
    RAISE EXCEPTION 'Il workspace ha raggiunto il limite membri del piano';
  END IF;

  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (v_inv.workspace_id, v_caller, v_inv.role);

  UPDATE workspace_invitations
  SET status = 'accepted', responded_at = NOW(), user_id = v_caller
  WHERE id = v_inv.id;

  RETURN json_build_object('workspace_id', v_inv.workspace_id, 'already_member', false);
END;
$$;

CREATE OR REPLACE FUNCTION decline_workspace_invitation(p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_inv workspace_invitations%ROWTYPE;
  v_caller_email TEXT;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;

  SELECT lower(email) INTO v_caller_email FROM profiles WHERE id = v_caller;

  SELECT * INTO v_inv
  FROM workspace_invitations
  WHERE token = p_token AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invito non valido o già gestito';
  END IF;

  IF v_caller_email != lower(v_inv.email) THEN
    RAISE EXCEPTION 'Questo invito è per un altro account email';
  END IF;

  UPDATE workspace_invitations
  SET status = 'declined', responded_at = NOW(), user_id = v_caller
  WHERE id = v_inv.id;
END;
$$;

CREATE OR REPLACE FUNCTION cancel_workspace_invitation(p_invitation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_workspace_id UUID;
BEGIN
  SELECT workspace_id INTO v_workspace_id
  FROM workspace_invitations
  WHERE id = p_invitation_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invito non trovato';
  END IF;

  PERFORM assert_can_manage_workspace(v_workspace_id, v_caller);

  UPDATE workspace_invitations
  SET status = 'cancelled', responded_at = NOW()
  WHERE id = p_invitation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION invite_member_by_email(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_invitation_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION accept_workspace_invitation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION decline_workspace_invitation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_workspace_invitation(UUID) TO authenticated;
