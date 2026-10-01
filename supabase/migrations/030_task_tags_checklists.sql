-- Task checklists (subtasks)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]';

-- Task tags (quick inline tags, different from labels)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Task estimated hours
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC;

-- Task completion tracking
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Automatically set completed_at when task moved to done column
CREATE OR REPLACE FUNCTION auto_complete_task() RETURNS TRIGGER AS $$
DECLARE
  v_col_name TEXT;
  v_old_col_name TEXT;
BEGIN
  SELECT LOWER(name) INTO v_col_name FROM columns WHERE id = NEW.column_id;
  
  -- Task moved to a "done" column
  IF (v_col_name LIKE '%fatto%' OR v_col_name LIKE '%done%' OR v_col_name LIKE '%complet%') THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
    NEW.completed_by := COALESCE(NEW.completed_by, auth.uid());
  END IF;

  -- Task moved OUT of a "done" column
  IF TG_OP = 'UPDATE' AND OLD.column_id != NEW.column_id THEN
    SELECT LOWER(name) INTO v_old_col_name FROM columns WHERE id = OLD.column_id;
    IF (v_old_col_name LIKE '%fatto%' OR v_old_col_name LIKE '%done%' OR v_old_col_name LIKE '%complet%') THEN
      IF NOT (v_col_name LIKE '%fatto%' OR v_col_name LIKE '%done%' OR v_col_name LIKE '%complet%') THEN
        NEW.completed_at := NULL;
        NEW.completed_by := NULL;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_complete_task ON tasks;
CREATE TRIGGER trg_auto_complete_task
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION auto_complete_task();

-- Board view preference (for multi-view boards)
ALTER TABLE boards ADD COLUMN IF NOT EXISTS default_view TEXT DEFAULT 'kanban';

-- Task count index for stats
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks (completed_at) WHERE completed_at IS NOT NULL;
