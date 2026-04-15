-- linkedin_credentials: stores li_at + jsessionid per account slot.
-- Slot 1 = primary (tech/finance), Slot 2 = secondary (opticians/non-tech).
-- Pipeline reads from here first, falls back to env vars if missing.

CREATE TABLE IF NOT EXISTS linkedin_credentials (
  slot        SMALLINT PRIMARY KEY CHECK (slot IN (1, 2)),
  li_at       TEXT NOT NULL,
  jsessionid  TEXT NOT NULL,
  linkedin_name TEXT,          -- resolved from LinkedIn /me at save time
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only service role can access — no public or anon access.
ALTER TABLE linkedin_credentials ENABLE ROW LEVEL SECURITY;
