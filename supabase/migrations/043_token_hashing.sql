-- ENG-60: hash auth tokens at rest.
--
-- DSAR verification tokens and org invitation tokens used to be stored
-- in plaintext. A read-only DB breach (compromised backup, escalated
-- analyst account, leaked replica credentials) was enough to forge
-- erasure / export / org-join requests against any pending row — no
-- write access required.
--
-- We now store HMAC-SHA256(pepper, plaintext_token) in *_hash columns.
-- The user's email URL still contains the plaintext token; the
-- verifying endpoint hashes the incoming token and looks up by hash.
--
-- Both tables currently have 0 pending rows so the cutover is clean.
-- The old plaintext columns are kept (nullable) for one deploy cycle
-- so any partially-deployed worker doesn't crash on missing columns;
-- a follow-up migration will drop them.

ALTER TABLE dsar_requests
  ADD COLUMN IF NOT EXISTS verification_token_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsar_requests_verification_token_hash
  ON dsar_requests(verification_token_hash)
  WHERE verification_token_hash IS NOT NULL;

ALTER TABLE org_invitations
  ADD COLUMN IF NOT EXISTS token_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_org_invitations_token_hash
  ON org_invitations(token_hash)
  WHERE token_hash IS NOT NULL;

-- Drop the NOT NULL on the old org_invitations.token column so new
-- rows can leave it null (we now write only the hash). dsar_requests
-- .verification_token was already nullable.
ALTER TABLE org_invitations
  ALTER COLUMN token DROP NOT NULL;
