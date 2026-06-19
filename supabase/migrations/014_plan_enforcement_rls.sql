-- Plan enforcement via RLS on board/member creation

CREATE OR REPLACE FUNCTION workspace_owner_plan(p_workspace_id UUID)
RETURNS plan_tier
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.plan
  FROM workspaces w
  JOIN profiles p ON p.id = w.owner_id
  WHERE w.id = p_workspace_id;
$$;

CREATE OR REPLACE FUNCTION workspace_board_limit(p_plan plan_tier)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_plan
    WHEN 'free' THEN 3
    ELSE 100000
  END;
$$;

CREATE OR REPLACE FUNCTION assert_can_create_board(p_workspace_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan plan_tier;
  v_count INTEGER;
  v_limit INTEGER;
BEGIN
  IF NOT is_workspace_member(p_workspace_id) THEN
    RAISE EXCEPTION 'Permesso negato';
  END IF;

  v_plan := workspace_owner_plan(p_workspace_id);
  v_limit := workspace_board_limit(v_plan);

  SELECT COUNT(*) INTO v_count FROM boards WHERE workspace_id = p_workspace_id;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Limite board raggiunto per il piano del workspace.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION create_board_with_limit(
  p_workspace_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT ''
)
RETURNS boards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_board boards;
BEGIN
  PERFORM assert_can_create_board(p_workspace_id);

  INSERT INTO boards (workspace_id, name, description)
  VALUES (p_workspace_id, p_name, COALESCE(p_description, ''))
  RETURNING * INTO v_board;

  RETURN v_board;
END;
$$;

GRANT EXECUTE ON FUNCTION create_board_with_limit(UUID, TEXT, TEXT) TO authenticated;

DROP POLICY IF EXISTS "Members can create boards" ON boards;
CREATE POLICY "Members can create boards within plan limit" ON boards
  FOR INSERT WITH CHECK (
    is_workspace_member(workspace_id)
    AND (
      SELECT COUNT(*) FROM boards b WHERE b.workspace_id = boards.workspace_id
    ) < workspace_board_limit(workspace_owner_plan(workspace_id))
  );
