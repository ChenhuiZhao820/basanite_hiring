-- Security events + tiered account suspension audit trail.
--
-- The JD-upload safety gate (POST /roles/jd-upload) records an event here
-- whenever an uploaded document is a corroborated prompt-injection attempt.
-- Policy is tiered rather than instant-suspend:
--   strike 1  -> upload blocked, severity='strike' row, admin notified
--   strike 2  -> (within the rolling window) account suspended, severity='suspension' row
-- Suspension itself lives in auth.users.app_metadata.suspended (set via the
-- service role), which clients cannot write — this table is the reviewable
-- audit trail behind it, surfaced on the admin security dashboard together
-- with the classifier's verbatim evidence quotes.
--
-- 'info' severity rows are non-punitive audit entries: 'suspicious'-grade
-- classifier findings that were allowed through, plus admin actions
-- (manual suspend / reinstate) so the account history reads end to end.

CREATE TABLE IF NOT EXISTS security_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id      UUID REFERENCES orgs(id) ON DELETE SET NULL,
  kind        TEXT NOT NULL,               -- 'jd_injection_attempt' | 'admin_suspend' | 'admin_reinstate' | ...
  severity    TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'strike', 'suspension')),
  detail      JSONB NOT NULL DEFAULT '{}'::jsonb,  -- evidence quotes, filename, classifier verdict
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Strike counting: "strikes for this user of this kind in the last N days".
CREATE INDEX IF NOT EXISTS idx_security_events_user_kind
  ON security_events(user_id, kind, created_at DESC);
-- Admin dashboard lists newest first.
CREATE INDEX IF NOT EXISTS idx_security_events_created_at
  ON security_events(created_at DESC);

-- Reads and writes go exclusively through the service-role client (the
-- FastAPI upload gate writes, the admin routes read). RLS on with no
-- anon/authenticated policies: a leaked anon key can neither read other
-- users' security history nor forge strikes.
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
