CREATE TYPE goal_type AS ENUM ('objective', 'key_result');
CREATE TYPE goal_status AS ENUM ('active', 'completed', 'cancelled', 'archived');

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type goal_type NOT NULL DEFAULT 'objective',
  parent_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  target_value NUMERIC DEFAULT 100,
  current_value NUMERIC DEFAULT 0,
  unit TEXT DEFAULT '%',
  progress NUMERIC DEFAULT 0,
  status goal_status NOT NULL DEFAULT 'active',
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goals_workspace ON goals (workspace_id);
CREATE INDEX IF NOT EXISTS idx_goals_parent ON goals (parent_id);
CREATE INDEX IF NOT EXISTS idx_goals_owner ON goals (owner_id);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view goals"
  ON goals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workspace_members m
    WHERE m.workspace_id = goals.workspace_id
    AND m.user_id = auth.uid()
  ));

CREATE POLICY "Workspace admins can manage goals"
  ON goals FOR ALL
  USING (is_workspace_admin(goals.workspace_id, auth.uid()))
  WITH CHECK (is_workspace_admin(goals.workspace_id, auth.uid()));

CREATE TABLE IF NOT EXISTS task_goals (
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (goal_id, task_id)
);

ALTER TABLE task_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage task goals"
  ON task_goals FOR ALL
  USING (EXISTS (
    SELECT 1 FROM goals g
    JOIN workspace_members m ON m.workspace_id = g.workspace_id AND m.user_id = auth.uid()
    WHERE g.id = task_goals.goal_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM goals g
    JOIN workspace_members m ON m.workspace_id = g.workspace_id AND m.user_id = auth.uid()
    WHERE g.id = task_goals.goal_id
  ));

-- Auto-calculate goal progress from linked tasks
CREATE OR REPLACE FUNCTION update_goal_progress() RETURNS TRIGGER AS $$
DECLARE
  v_goal_id UUID;
  v_total INT;
  v_done INT;
  v_goal RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_goal_id := OLD.goal_id;
  ELSE
    v_goal_id := NEW.goal_id;
  END IF;

  SELECT * INTO v_goal FROM goals WHERE id = v_goal_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Count linked tasks and completed ones
  SELECT COUNT(*) INTO v_total FROM task_goals tg WHERE tg.goal_id = v_goal_id;
  
  IF v_total = 0 THEN
    UPDATE goals SET progress = 0, current_value = 0, updated_at = now() WHERE id = v_goal_id;
    RETURN NULL;
  END IF;

  -- Count done tasks (tasks in columns with 'done' or 'fatto' in name)
  SELECT COUNT(*) INTO v_done
  FROM task_goals tg
  JOIN tasks t ON tg.task_id = t.id
  JOIN columns c ON t.column_id = c.id
  WHERE tg.goal_id = v_goal_id
    AND (LOWER(c.name) LIKE '%fatto%' OR LOWER(c.name) LIKE '%done%');

  UPDATE goals SET
    progress = CASE WHEN v_total > 0 THEN ROUND((v_done::NUMERIC / v_total) * 100) ELSE 0 END,
    current_value = CASE WHEN v_total > 0 THEN ROUND((v_done::NUMERIC / v_total) * v_goal.target_value) ELSE 0 END,
    status = CASE WHEN v_total > 0 AND v_done = v_total THEN 'completed'::goal_status ELSE v_goal.status END,
    updated_at = now()
  WHERE id = v_goal_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_goal_progress ON task_goals;
CREATE TRIGGER trg_update_goal_progress
  AFTER INSERT OR UPDATE OR DELETE ON task_goals
  FOR EACH ROW EXECUTE FUNCTION update_goal_progress();
