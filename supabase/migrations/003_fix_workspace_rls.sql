-- Fix workspace creation: owners could INSERT but not SELECT rows back
-- (insert().select() failed RLS before workspace_members row existed).

CREATE POLICY "Owners can view their workspaces" ON workspaces
  FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Admins can update workspaces" ON workspaces;
CREATE POLICY "Admins can update workspaces" ON workspaces
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspaces.id
        AND wm.user_id = auth.uid()
        AND wm.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION add_workspace_owner_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'admin')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_workspace_created ON workspaces;
CREATE TRIGGER on_workspace_created
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION add_workspace_owner_as_member();

-- Backfill owner memberships for any workspaces created before this fix
INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT w.id, w.owner_id, 'admin'
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM workspace_members wm
  WHERE wm.workspace_id = w.id AND wm.user_id = w.owner_id
);
