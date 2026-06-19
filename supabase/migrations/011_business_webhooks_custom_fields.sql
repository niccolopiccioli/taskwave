-- Business webhooks and task custom fields

CREATE TABLE IF NOT EXISTS workspace_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL DEFAULT public.generate_invite_token(),
  events TEXT[] NOT NULL DEFAULT ARRAY['task.created', 'task.updated', 'task.moved'],
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text' CHECK (field_type IN ('text', 'number', 'select')),
  options JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_custom_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES task_custom_fields(id) ON DELETE CASCADE,
  value TEXT,
  UNIQUE (task_id, field_id)
);

ALTER TABLE workspace_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_custom_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage webhooks" ON workspace_webhooks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_webhooks.workspace_id
        AND wm.user_id = auth.uid() AND wm.role = 'admin'
    )
  );

CREATE POLICY "Members view custom fields" ON task_custom_fields
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = task_custom_fields.workspace_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins manage custom fields" ON task_custom_fields
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

CREATE POLICY "Members manage custom values" ON task_custom_values
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN columns c ON c.id = t.column_id
      JOIN boards b ON b.id = c.board_id
      JOIN workspace_members wm ON wm.workspace_id = b.workspace_id
      WHERE t.id = task_custom_values.task_id AND wm.user_id = auth.uid()
    )
  );
