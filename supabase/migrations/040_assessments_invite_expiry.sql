-- ENG-30: invite tokens never expired and the lookup endpoint was
-- unauthenticated + unrate-limited. Tokens leaked from inbox backups,
-- mail-server logs, browser history, screen-share recordings then
-- continued to work indefinitely.
--
-- Add an expiry timestamp. Existing rows stay valid forever (NULL = no
-- expiry); new ATS-sourced invites get a 30-day TTL set at creation.
-- The application layer (api.py) populates this column when minting the
-- token; the lookup helper rejects expired rows.

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ;

-- Index on (invite_token, invite_expires_at) keeps the lookup cheap once
-- the helper filters by both. The existing index on invite_token alone
-- still helps for ATS-side reconciliation queries that don't care about
-- expiry.
CREATE INDEX IF NOT EXISTS idx_assessments_invite_token_expiry
  ON assessments(invite_token, invite_expires_at)
  WHERE invite_token IS NOT NULL;
