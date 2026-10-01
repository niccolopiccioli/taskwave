CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dep_type TEXT NOT NULL DEFAULT 'blocks' CHECK (dep_type IN ('blocks', 'relates_to', 'duplicates')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, depends_on_id),
  CONSTRAINT no_self_dependency CHECK (task_id != depends_on_id)
);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies (task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends ON task_dependencies (depends_on_id);

ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view dependencies"
  ON task_dependencies FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tasks t
    JOIN columns c ON t.column_id = c.id
    JOIN boards b ON c.board_id = b.id
    JOIN workspace_members m ON m.workspace_id = b.workspace_id AND m.user_id = auth.uid()
    WHERE t.id = task_dependencies.task_id
  ));

CREATE POLICY "Workspace members can insert dependencies"
  ON task_dependencies FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tasks t
    JOIN columns c ON t.column_id = c.id
    JOIN boards b ON c.board_id = b.id
    JOIN workspace_members m ON m.workspace_id = b.workspace_id AND m.user_id = auth.uid()
    WHERE t.id = task_dependencies.task_id
  ));

CREATE POLICY "Workspace members can delete dependencies"
  ON task_dependencies FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tasks t
    JOIN columns c ON t.column_id = c.id
    JOIN boards b ON c.board_id = b.id
    JOIN workspace_members m ON m.workspace_id = b.workspace_id AND m.user_id = auth.uid()
    WHERE t.id = task_dependencies.task_id
  ));

-- Prevent circular dependencies
CREATE OR REPLACE FUNCTION check_circular_dependency()
RETURNS TRIGGER AS $$
DECLARE
  found BOOLEAN;
BEGIN
  WITH RECURSIVE chain AS (
    SELECT NEW.depends_on_id AS tid
    UNION ALL
    SELECT td.depends_on_id
    FROM task_dependencies td
    JOIN chain c ON td.task_id = c.tid
  )
  SELECT EXISTS (
    SELECT 1 FROM chain WHERE tid = NEW.task_id
  ) INTO found;
  IF found THEN
    RAISE EXCEPTION 'Circular dependency detected for task %', NEW.task_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_circular_dependency ON task_dependencies;
CREATE TRIGGER trg_check_circular_dependency
  BEFORE INSERT OR UPDATE ON task_dependencies
  FOR EACH ROW EXECUTE FUNCTION check_circular_dependency();
