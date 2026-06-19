-- Privacy compliance: preferences, requests, profile toggles

CREATE TYPE privacy_request_type AS ENUM ('opt_out', 'export', 'delete');
CREATE TYPE privacy_request_status AS ENUM ('pending', 'verified', 'completed', 'cancelled');

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS analytics_opt_out BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_opt_out BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ip_tracking_opt_out BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS privacy_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ip_hash TEXT,
  analytics_opt_out BOOLEAN NOT NULL DEFAULT true,
  marketing_opt_out BOOLEAN NOT NULL DEFAULT true,
  ip_tracking_opt_out BOOLEAN NOT NULL DEFAULT true,
  source TEXT NOT NULL DEFAULT 'user',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_privacy_prefs_user
  ON privacy_preferences(user_id) WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_privacy_prefs_ip_hash
  ON privacy_preferences(ip_hash) WHERE ip_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS privacy_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  request_type privacy_request_type NOT NULL,
  status privacy_request_status NOT NULL DEFAULT 'pending',
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  ip_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_privacy_requests_token ON privacy_requests(token);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_email ON privacy_requests(lower(email));

ALTER TABLE privacy_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own privacy prefs" ON privacy_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users update own privacy prefs" ON privacy_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users insert own privacy prefs" ON privacy_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own privacy requests" ON privacy_requests
  FOR SELECT USING (auth.uid() = user_id OR lower(email) = (SELECT lower(email) FROM profiles WHERE id = auth.uid()));

CREATE OR REPLACE FUNCTION upsert_privacy_preferences(
  p_user_id UUID,
  p_ip_hash TEXT DEFAULT NULL,
  p_analytics_opt_out BOOLEAN DEFAULT true,
  p_marketing_opt_out BOOLEAN DEFAULT true,
  p_ip_tracking_opt_out BOOLEAN DEFAULT true,
  p_source TEXT DEFAULT 'user'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE profiles
  SET
    analytics_opt_out = p_analytics_opt_out,
    marketing_opt_out = p_marketing_opt_out,
    ip_tracking_opt_out = p_ip_tracking_opt_out,
    updated_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO privacy_preferences (
    user_id, ip_hash, analytics_opt_out, marketing_opt_out, ip_tracking_opt_out, source, verified_at, updated_at
  )
  VALUES (
    p_user_id, p_ip_hash, p_analytics_opt_out, p_marketing_opt_out, p_ip_tracking_opt_out, p_source, NOW(), NOW()
  )
  ON CONFLICT (user_id) WHERE user_id IS NOT NULL
  DO UPDATE SET
    ip_hash = COALESCE(EXCLUDED.ip_hash, privacy_preferences.ip_hash),
    analytics_opt_out = EXCLUDED.analytics_opt_out,
    marketing_opt_out = EXCLUDED.marketing_opt_out,
    ip_tracking_opt_out = EXCLUDED.ip_tracking_opt_out,
    source = EXCLUDED.source,
    verified_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION upsert_privacy_by_ip_hash(
  p_ip_hash TEXT,
  p_analytics_opt_out BOOLEAN DEFAULT true,
  p_marketing_opt_out BOOLEAN DEFAULT true,
  p_ip_tracking_opt_out BOOLEAN DEFAULT true,
  p_source TEXT DEFAULT 'anonymous'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO privacy_preferences (
    ip_hash, analytics_opt_out, marketing_opt_out, ip_tracking_opt_out, source, verified_at, updated_at
  )
  VALUES (
    p_ip_hash, p_analytics_opt_out, p_marketing_opt_out, p_ip_tracking_opt_out, p_source, NOW(), NOW()
  )
  ON CONFLICT (ip_hash) WHERE ip_hash IS NOT NULL
  DO UPDATE SET
    analytics_opt_out = EXCLUDED.analytics_opt_out,
    marketing_opt_out = EXCLUDED.marketing_opt_out,
    ip_tracking_opt_out = EXCLUDED.ip_tracking_opt_out,
    source = EXCLUDED.source,
    verified_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION delete_user_account(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() <> p_user_id AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM profiles WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_privacy_preferences(UUID, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_privacy_by_ip_hash(TEXT, BOOLEAN, BOOLEAN, BOOLEAN, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;
