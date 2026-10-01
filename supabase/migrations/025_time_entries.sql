CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  description TEXT DEFAULT '',
  is_running BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_task ON time_entries (task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries (user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_running ON time_entries (user_id) WHERE is_running = true;

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view entries for their workspace tasks"
  ON time_entries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tasks t
    JOIN columns c ON t.column_id = c.id
    JOIN boards b ON c.board_id = b.id
    JOIN workspace_members m ON m.workspace_id = b.workspace_id AND m.user_id = auth.uid()
    WHERE t.id = time_entries.task_id
  ));

CREATE POLICY "Users can insert own time entries"
  ON time_entries FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tasks t
      JOIN columns c ON t.column_id = c.id
      JOIN boards b ON c.board_id = b.id
      JOIN workspace_members m ON m.workspace_id = b.workspace_id AND m.user_id = auth.uid()
      WHERE t.id = time_entries.task_id
    )
  );

CREATE POLICY "Users can update own time entries"
  ON time_entries FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own time entries"
  ON time_entries FOR DELETE
  USING (user_id = auth.uid());

-- Prevent multiple running timers per user
CREATE OR REPLACE FUNCTION prevent_multiple_running_timers()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_running THEN
    IF EXISTS (
      SELECT 1 FROM time_entries
      WHERE user_id = NEW.user_id
        AND is_running = true
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    ) THEN
      RAISE EXCEPTION 'User already has a running timer';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_multiple_timers ON time_entries;
CREATE TRIGGER trg_prevent_multiple_timers
  BEFORE INSERT OR UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION prevent_multiple_running_timers();
