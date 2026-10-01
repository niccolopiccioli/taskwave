CREATE TABLE IF NOT EXISTS ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  feature TEXT NOT NULL CHECK (feature IN ('chat', 'breakdown', 'summarize', 'smart_create', 'natural_language')),
  model TEXT NOT NULL DEFAULT 'deepseek-chat',
  prompt_tokens INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  latency_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_interactions_user ON ai_interactions (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_workspace ON ai_interactions (workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_date ON ai_interactions (created_at);

ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI interactions"
  ON ai_interactions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own AI interactions"
  ON ai_interactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Function to check AI usage limits
CREATE OR REPLACE FUNCTION check_ai_usage_limit(
  p_user_id UUID,
  p_limit INT DEFAULT 5,
  p_window INTERVAL DEFAULT '1 day'
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM ai_interactions
  WHERE user_id = p_user_id
    AND created_at > now() - p_window;
  RETURN v_count < p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Daily AI limits by plan
CREATE OR REPLACE FUNCTION get_ai_daily_limit(p_user_id UUID) RETURNS INT AS $$
DECLARE
  v_plan TEXT;
BEGIN
  SELECT plan::TEXT INTO v_plan FROM profiles WHERE id = p_user_id;
  RETURN CASE
    WHEN v_plan = 'business' THEN 999999
    WHEN v_plan = 'pro' THEN 50
    ELSE 5
  END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
