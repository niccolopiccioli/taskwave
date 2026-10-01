-- Periodic step-up OTP (email verification every N hours while session is active)
CREATE TABLE IF NOT EXISTS step_up_otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_step_up_otp_user_created
  ON step_up_otp_challenges(user_id, created_at DESC);

ALTER TABLE step_up_otp_challenges ENABLE ROW LEVEL SECURITY;

-- No client access; API routes use service role
CREATE POLICY "No direct access to step_up_otp_challenges"
  ON step_up_otp_challenges FOR ALL
  USING (false);

-- Cleanup expired challenges (optional cron; delete on send is enough for MVP)
CREATE OR REPLACE FUNCTION cleanup_expired_step_up_otp()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM step_up_otp_challenges WHERE expires_at < NOW();
$$;
