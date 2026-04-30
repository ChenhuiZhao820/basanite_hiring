-- Basanite: ats_connections
--
-- Per-org Merge.dev linked-account record. One row per (org × ATS provider)
-- in v1; the unique index on (org_id) below restricts orgs to a single ATS
-- connection for now since most hirers only run one. Lift the unique
-- constraint when multi-provider becomes a customer ask.
--
-- The `account_token_encrypted` column holds the Merge linked-account token
-- after AES-GCM encryption (see core/ats.py:encrypt_token). Plaintext tokens
-- never touch the database. The encryption key (`ATS_TOKEN_ENC_KEY`) lives
-- only on the FastAPI service, so even with a SUPABASE_SERVICE_KEY leak,
-- tokens are not directly usable.
--
-- RLS: org members can read their connection (UI shows status + provider);
-- only the service role writes (the FastAPI handlers do all DB mutations).

CREATE TABLE ats_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  -- The integration's slug as Merge reports it (e.g. 'greenhouse', 'lever',
  -- 'ashby'). Null in the brief window between mint and exchange.
  provider TEXT,
  -- AES-GCM-encrypted Merge account token. Never plaintext.
  account_token_encrypted TEXT NOT NULL,
  -- Mirror of what we sent Merge as `end_user_origin_id` (= org_id by
  -- convention). Useful for audit when reconciling against Merge's dashboard.
  end_user_origin_id TEXT,
  end_user_email TEXT,
  status TEXT NOT NULL DEFAULT 'connected'
    CHECK (status IN ('connected', 'disconnected', 'error')),
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One ATS connection per org for v1.
CREATE UNIQUE INDEX uq_ats_connections_one_per_org ON ats_connections(org_id)
  WHERE status = 'connected';

CREATE INDEX idx_ats_connections_org_id ON ats_connections(org_id);

ALTER TABLE ats_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ats_connections_org_members_select" ON ats_connections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = ats_connections.org_id
        AND org_members.user_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: service role only (no policy granted to authenticated
-- users), so all mutations go through the FastAPI backend which enforces the
-- pipeline-secret auth.
