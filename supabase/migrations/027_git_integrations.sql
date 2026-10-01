CREATE TABLE IF NOT EXISTS git_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('github', 'gitlab', 'bitbucket')),
  repo_full_name TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  webhook_secret TEXT,
  webhook_id TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider, repo_full_name)
);

CREATE INDEX IF NOT EXISTS idx_git_connections_workspace ON git_connections (workspace_id);

ALTER TABLE git_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace admins can manage git connections"
  ON git_connections FOR ALL
  USING (is_workspace_admin(git_connections.workspace_id, auth.uid()))
  WITH CHECK (is_workspace_admin(git_connections.workspace_id, auth.uid()));

CREATE TABLE IF NOT EXISTS git_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES git_connections(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  branch_name TEXT,
  pr_number INT,
  pr_title TEXT,
  pr_status TEXT,
  commit_sha TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_git_events_connection ON git_events (connection_id);

ALTER TABLE git_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view git events"
  ON git_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM git_connections gc
    JOIN workspace_members m ON m.workspace_id = gc.workspace_id AND m.user_id = auth.uid()
    WHERE gc.id = git_events.connection_id
  ));

-- Table to link tasks to git branches
CREATE TABLE IF NOT EXISTS task_branch_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES git_connections(id) ON DELETE CASCADE,
  branch_name TEXT NOT NULL,
  pr_number INT,
  pr_status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, connection_id, branch_name)
);

ALTER TABLE task_branch_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage branch links"
  ON task_branch_links FOR ALL
  USING (EXISTS (
    SELECT 1 FROM tasks t
    JOIN columns c ON t.column_id = c.id
    JOIN boards b ON c.board_id = b.id
    JOIN workspace_members m ON m.workspace_id = b.workspace_id AND m.user_id = auth.uid()
    WHERE t.id = task_branch_links.task_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM tasks t
    JOIN columns c ON t.column_id = c.id
    JOIN boards b ON c.board_id = b.id
    JOIN workspace_members m ON m.workspace_id = b.workspace_id AND m.user_id = auth.uid()
    WHERE t.id = task_branch_links.task_id
  ));
