-- Allow re-inviting: cancel stale pending invitation and issue a fresh token.

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

  UPDATE workspace_invitations
  SET status = 'cancelled', responded_at = NOW()
  WHERE workspace_id = p_workspace_id
    AND lower(email) = v_normalized_email
    AND status = 'pending';

  v_token := public.generate_invite_token();

  INSERT INTO workspace_invitations (
    workspace_id, email, user_id, invited_by, token
  )
  VALUES (
    p_workspace_id, v_normalized_email, v_user_id, v_caller, v_token
  )
  RETURNING id INTO v_invitation_id;

  RETURN json_build_object(
    'invitation_id', v_invitation_id,
    'token', v_token,
    'replaced_pending', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION invite_member_by_email(UUID, TEXT) TO authenticated;
