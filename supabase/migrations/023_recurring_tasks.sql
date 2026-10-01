ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_rule TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks (parent_task_id);

-- Generate next occurrence when a recurring task is completed
CREATE OR REPLACE FUNCTION generate_next_recurrence(
  p_task_id UUID
) RETURNS UUID AS $$
DECLARE
  v_task RECORD;
  v_next_date TIMESTAMPTZ;
  v_new_task_id UUID;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
  IF v_task.recurrence_rule IS NULL THEN
    RETURN NULL;
  END IF;

  -- Simple recurrence parsing: daily, weekly, biweekly, monthly
  v_next_date := CASE
    WHEN v_task.recurrence_rule = 'daily' THEN
      COALESCE(v_task.due_date, now()) + INTERVAL '1 day'
    WHEN v_task.recurrence_rule = 'weekly' THEN
      COALESCE(v_task.due_date, now()) + INTERVAL '7 days'
    WHEN v_task.recurrence_rule = 'biweekly' THEN
      COALESCE(v_task.due_date, now()) + INTERVAL '14 days'
    WHEN v_task.recurrence_rule = 'monthly' THEN
      COALESCE(v_task.due_date, now()) + INTERVAL '1 month'
    WHEN v_task.recurrence_rule = 'weekday' THEN
      COALESCE(v_task.due_date, now()) + INTERVAL '1 day'
    ELSE
      NULL
  END;

  IF v_next_date IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_task.recurrence_end_date IS NOT NULL AND v_next_date > v_task.recurrence_end_date THEN
    RETURN NULL;
  END IF;

  -- Create the next task
  INSERT INTO tasks (
    column_id, title, description, assignee_id, priority,
    position, due_date, created_by_id, recurrence_rule,
    recurrence_end_date, parent_task_id
  ) VALUES (
    v_task.column_id,
    v_task.title,
    v_task.description,
    v_task.assignee_id,
    v_task.priority,
    v_task.position,
    v_next_date,
    v_task.created_by_id,
    v_task.recurrence_rule,
    v_task.recurrence_end_date,
    v_task.parent_task_id
  ) RETURNING id INTO v_new_task_id;

  RETURN v_new_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
