CREATE TABLE IF NOT EXISTS published_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  icon TEXT DEFAULT 'layout',
  board_config JSONB NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  downloads INT NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_published_templates_category ON published_templates (category);
CREATE INDEX IF NOT EXISTS idx_published_templates_author ON published_templates (author_id);
CREATE INDEX IF NOT EXISTS idx_published_templates_public ON published_templates (is_public) WHERE is_public = true;

ALTER TABLE published_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public templates"
  ON published_templates FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can create templates"
  ON published_templates FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authors can update own templates"
  ON published_templates FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors can delete own templates"
  ON published_templates FOR DELETE
  USING (author_id = auth.uid());

-- Increment download count
CREATE OR REPLACE FUNCTION increment_template_downloads(p_template_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE published_templates SET downloads = downloads + 1 WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: template seed data moved to seed.sql (admin user must exist first)
