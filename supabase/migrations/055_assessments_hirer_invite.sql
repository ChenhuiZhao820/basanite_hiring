-- Basanite: hirer-initiated candidate invites
--
-- Hirers can now invite a candidate by email straight from the role
-- detail page. The invite reuses the ATS invite plumbing (invite_token,
-- invite_expires_at, the /assess/invite/{token} landing) but the row is
-- minted by the hirer, not a webhook, so it needs its own `source`
-- value for the dashboard queue and analytics.
--
-- The CHECK constraint from migration 029 only allowed
-- ('self_serve', 'ats'). Migration 052 (copilot) tried to add
-- source IN ('autonomous', 'copilot') via ADD COLUMN IF NOT EXISTS —
-- a silent no-op, since 029 already created the column — so 'copilot'
-- inserts actually violate the live constraint. Rebuild the constraint
-- once with every value in active use: 029's originals, 052's 'copilot',
-- and the new 'hirer_invite'.

ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_source_check;
ALTER TABLE assessments ADD CONSTRAINT assessments_source_check
  CHECK (source IN ('self_serve', 'ats', 'copilot', 'hirer_invite'));
