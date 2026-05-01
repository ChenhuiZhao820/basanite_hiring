-- Basanite: orgs.feature_flags
--
-- Per-org feature flags as a JSONB blob — cheaper than a separate
-- key-value table for a handful of dark-launch toggles. The first one is
-- `ats_push_enabled`: when true, PR7's push_results actually writes to the
-- customer's ATS; when false, it logs a dry-run and stops. Lets us enable
-- outbound push for the first client only after watching one full
-- assessment cycle in production.
--
-- Default: all flags false / unset (push is off until explicitly enabled).

ALTER TABLE orgs ADD COLUMN IF NOT EXISTS feature_flags JSONB
  NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN orgs.feature_flags IS
  'Per-org flags. Known keys: ats_push_enabled (bool, default false).';
