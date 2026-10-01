-- Fix invitation accept/decline: resolve email from JWT when profile.email is stale.
-- Improve cancelled/expired invitation responses for invite links.

CREATE OR REPLACE FUNCTION public.resolve_invitee_email(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text;
BEGIN
  v_email := nullif(trim(coalesce(auth.jwt()->>'email', '')), '');

  IF v_email IS NOT NULL THEN
    RETURN lower(v_email);
  END IF;

  SELECT lower(email) INTO v_email
  FROM profiles
  WHERE id = p_user_id;

  RETURN v_email;
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
  IF p_token IS NULL OR length(trim(p_token)) = 0 THEN
    RAISE EXCEPTION 'Invito non trovato';
  END IF;

  SELECT * INTO v_inv
  FROM workspace_invitations
  WHERE token = trim(p_token)
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invito non trovato';
  END IF;

  IF v_inv.status != 'pending' THEN
    RETURN json_build_object(
      'status', v_inv.status,
      'workspace_id', v_inv.workspace_id,
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

  v_caller_email := resolve_invitee_email(v_caller);

  IF v_caller_email IS NULL THEN
    RAISE EXCEPTION 'Email profilo non disponibile';
  END IF;

  SELECT * INTO v_inv
  FROM workspace_invitations
  WHERE token = trim(p_token) AND status = 'pending'
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

  v_caller_email := resolve_invitee_email(v_caller);

  SELECT * INTO v_inv
  FROM workspace_invitations
  WHERE token = trim(p_token) AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invito non valido o già gestito';
  END IF;

  IF v_caller_email IS NULL OR v_caller_email != lower(v_inv.email) THEN
    RAISE EXCEPTION 'Questo invito è per un altro account email';
  END IF;

  UPDATE workspace_invitations
  SET status = 'declined', responded_at = NOW(), user_id = v_caller
  WHERE id = v_inv.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_invitee_email(uuid) TO authenticated;
