-- ENG-20: assessment_link_token hardening.
--
-- Two changes:
--
-- 1. Add an optional expiry column so a hirer can issue tokens that auto-
--    invalidate (e.g. close an open role without rotating the URL by hand).
--    NULL preserves current behaviour (never expires) so existing rows
--    are unaffected.
--
-- 2. Bump default entropy from 16 bytes (128 bits) to 32 bytes (256 bits).
--    The existing 128-bit tokens are still cryptographically sound; new
--    rows just get more headroom. Existing rows are NOT rotated by this
--    migration — that would invalidate live candidate links.

ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS assessment_link_token_expires_at TIMESTAMPTZ;

ALTER TABLE roles
  ALTER COLUMN assessment_link_token
  SET DEFAULT encode(gen_random_bytes(32), 'hex');

-- Lookups by token must now also check the expiry; index the combination so
-- the filter remains cheap even when the table grows.
CREATE INDEX IF NOT EXISTS idx_roles_token_expires
  ON roles(assessment_link_token, assessment_link_token_expires_at);
