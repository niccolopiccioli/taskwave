CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL CHECK (trigger_event IN (
    'task.created', 'task.updated', 'task.moved', 'task.assigned',
    'task.priority_changed', 'task.due_soon', 'task.overdue', 'task.completed'
  )),
  conditions JSONB NOT NULL DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '[]',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_workspace ON automation_rules (workspace_id);

ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace admins can manage automation rules"
  ON automation_rules FOR ALL
  USING (is_workspace_admin(automation_rules.workspace_id, auth.uid()))
  WITH CHECK (is_workspace_admin(automation_rules.workspace_id, auth.uid()));

CREATE POLICY "Workspace members can view automation rules"
  ON automation_rules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workspace_members m
    WHERE m.workspace_id = automation_rules.workspace_id
    AND m.user_id = auth.uid()
  ));

-- Function to execute automation rules for a trigger event
CREATE OR REPLACE FUNCTION execute_automation_rules(
  p_workspace_id UUID,
  p_trigger_event TEXT,
  p_task_id UUID,
  p_context JSONB DEFAULT '{}'
) RETURNS SETOF UUID AS $$
DECLARE
  v_rule RECORD;
  v_action JSONB;
  v_conditions_match BOOLEAN;
BEGIN
  FOR v_rule IN
    SELECT * FROM automation_rules
    WHERE workspace_id = p_workspace_id
      AND trigger_event = p_trigger_event
      AND enabled = true
  LOOP
    v_conditions_match := true;

    -- Check conditions (simple key-value matching in context)
    IF v_rule.conditions IS NOT NULL AND jsonb_typeof(v_rule.conditions) = 'object' THEN
      FOR v_action IN SELECT * FROM jsonb_each(v_rule.conditions)
      LOOP
        IF p_context->>v_action.key IS DISTINCT FROM v_action.value::TEXT THEN
          v_conditions_match := false;
          EXIT;
        END IF;
      END LOOP;
    END IF;

    IF v_conditions_match THEN
      -- Execute each action
      FOR v_action IN SELECT * FROM jsonb_array_elements(v_rule.actions)
      LOOP
        CASE v_action->>'type'
          WHEN 'assign' THEN
            UPDATE tasks SET assignee_id = (v_action->>'user_id')::UUID, updated_at = now()
            WHERE id = p_task_id;
          WHEN 'move' THEN
            UPDATE tasks SET column_id = (v_action->>'column_id')::UUID, updated_at = now()
            WHERE id = p_task_id;
          WHEN 'set_priority' THEN
            UPDATE tasks SET priority = (v_action->>'priority')::task_priority, updated_at = now()
            WHERE id = p_task_id;
          WHEN 'add_label' THEN
            INSERT INTO task_labels (task_id, label_id)
            VALUES (p_task_id, (v_action->>'label_id')::UUID)
            ON CONFLICT DO NOTHING;
          WHEN 'notify' THEN
            PERFORM create_notification(
              (v_action->>'user_id')::UUID,
              'assigned'::notification_type,
              v_rule.name,
              'Automazione: ' || p_trigger_event,
              p_task_id,
              p_workspace_id
            );
          WHEN 'set_due_date' THEN
            IF v_action->>'days_from_now' IS NOT NULL THEN
              UPDATE tasks SET
                due_date = now() + ((v_action->>'days_from_now')::INT || ' days')::INTERVAL,
                updated_at = now()
              WHERE id = p_task_id;
            END IF;
          ELSE
            NULL;
        END CASE;
      END LOOP;

      UPDATE automation_rules SET last_triggered_at = now() WHERE id = v_rule.id;
      RETURN NEXT v_rule.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-execute rules when tasks change
CREATE OR REPLACE FUNCTION auto_execute_automations() RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
  v_trigger_event TEXT;
  v_context JSONB;
BEGIN
  SELECT b.workspace_id INTO v_workspace_id
  FROM columns c JOIN boards b ON c.board_id = b.id
  WHERE c.id = NEW.column_id;

  IF TG_OP = 'INSERT' THEN
    v_trigger_event := 'task.created';
    v_context := jsonb_build_object('priority', NEW.priority::TEXT);
  ELSIF TG_OP = 'UPDATE' THEN
    v_trigger_event := 'task.updated';
    v_context := jsonb_build_object('priority', NEW.priority::TEXT);
    IF NEW.column_id != OLD.column_id THEN
      v_trigger_event := 'task.moved';
      -- Also get column names
      v_context := jsonb_build_object(
        'priority', NEW.priority::TEXT,
        'from_column', (SELECT name FROM columns WHERE id = OLD.column_id),
        'to_column', (SELECT name FROM columns WHERE id = NEW.column_id)
      );
    END IF;
    IF NEW.assignee_id != OLD.assignee_id THEN
      v_trigger_event := 'task.assigned';
    END IF;
    IF NEW.priority::TEXT != OLD.priority::TEXT THEN
      v_trigger_event := 'task.priority_changed';
    END IF;
  END IF;

  IF v_workspace_id IS NOT NULL AND v_trigger_event IS NOT NULL THEN
    PERFORM execute_automation_rules(v_workspace_id, v_trigger_event, NEW.id, v_context);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_execute_automations ON tasks;
CREATE TRIGGER trg_auto_execute_automations
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION auto_execute_automations();
