-- Full-text search for tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION tasks_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasks_search_vector ON tasks;
CREATE TRIGGER trg_tasks_search_vector
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION tasks_search_update();

-- Backfill existing tasks
UPDATE tasks SET search_vector =
  setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(description, '')), 'B');

CREATE INDEX IF NOT EXISTS idx_tasks_search_vector ON tasks USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks (priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks (due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks (assignee_id);

-- Saved filters
CREATE TABLE IF NOT EXISTS saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filter_config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saved filters"
  ON saved_filters FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Labels
CREATE TABLE IF NOT EXISTS labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6b7280',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);

ALTER TABLE labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view labels"
  ON labels FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workspace_members m
    WHERE m.workspace_id = labels.workspace_id
    AND m.user_id = auth.uid()
  ));

CREATE POLICY "Workspace admins can manage labels"
  ON labels FOR ALL
  USING (is_workspace_admin(labels.workspace_id, auth.uid()))
  WITH CHECK (is_workspace_admin(labels.workspace_id, auth.uid()));

CREATE TABLE IF NOT EXISTS task_labels (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);

ALTER TABLE task_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage task labels"
  ON task_labels FOR ALL
  USING (EXISTS (
    SELECT 1 FROM tasks t
    JOIN columns c ON t.column_id = c.id
    JOIN boards b ON c.board_id = b.id
    JOIN workspace_members m ON m.workspace_id = b.workspace_id AND m.user_id = auth.uid()
    WHERE t.id = task_labels.task_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM tasks t
    JOIN columns c ON t.column_id = c.id
    JOIN boards b ON c.board_id = b.id
    JOIN workspace_members m ON m.workspace_id = b.workspace_id AND m.user_id = auth.uid()
    WHERE t.id = task_labels.task_id
  ));

-- Task reminders
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMPTZ;

-- Search RPC function (full-text search across tasks in a workspace)
CREATE OR REPLACE FUNCTION search_workspace_tasks(
  p_workspace_id UUID,
  p_query TEXT,
  p_priority TEXT DEFAULT NULL,
  p_assignee_id UUID DEFAULT NULL,
  p_due_before TIMESTAMPTZ DEFAULT NULL,
  p_due_after TIMESTAMPTZ DEFAULT NULL,
  p_limit INT DEFAULT 50
) RETURNS TABLE (
  task_id UUID,
  task_title TEXT,
  task_description TEXT,
  task_priority TEXT,
  task_due_date TIMESTAMPTZ,
  task_position INT,
  column_id UUID,
  column_name TEXT,
  board_id UUID,
  board_name TEXT,
  assignee_id UUID,
  assignee_name TEXT,
  rank REAL
) LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS task_id,
    t.title AS task_title,
    t.description AS task_description,
    t.priority::TEXT AS task_priority,
    t.due_date AS task_due_date,
    t.position AS task_position,
    c.id AS column_id,
    c.name AS column_name,
    b.id AS board_id,
    b.name AS board_name,
    t.assignee_id,
    p.full_name AS assignee_name,
    ts_rank(t.search_vector, to_tsquery('simple', p_query)) AS rank
  FROM tasks t
  JOIN columns c ON t.column_id = c.id
  JOIN boards b ON c.board_id = b.id
  LEFT JOIN profiles p ON t.assignee_id = p.id
  WHERE b.workspace_id = p_workspace_id
    AND (p_query IS NULL OR t.search_vector @@ to_tsquery('simple', p_query))
    AND (p_priority IS NULL OR t.priority::TEXT = p_priority)
    AND (p_assignee_id IS NULL OR t.assignee_id = p_assignee_id)
    AND (p_due_before IS NULL OR t.due_date <= p_due_before)
    AND (p_due_after IS NULL OR t.due_date >= p_due_after)
  ORDER BY
    CASE WHEN p_query IS NOT NULL THEN ts_rank(t.search_vector, to_tsquery('simple', p_query)) ELSE 0 END DESC,
    t.created_at DESC
  LIMIT p_limit;
END;
$$;
