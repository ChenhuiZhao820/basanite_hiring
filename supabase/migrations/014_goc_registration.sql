-- Migration 014: GOC (General Optical Council) registration check fields
--
-- Stores the result of a GOC public register check per candidate.
-- Only populated for optical roles (role_vertical = 'healthcare_optical').
--
-- goc_registered:         true if found on register, false if not found, null if not checked
-- goc_confidence:         0.0–1.0 — how confident the match is (accounts for common names)
-- goc_registration_number: GOC PIN / registration number if found
-- goc_registration_type:  "Optometrist" | "Dispensing Optician" | null

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS goc_registered         BOOLEAN,
  ADD COLUMN IF NOT EXISTS goc_confidence         REAL,
  ADD COLUMN IF NOT EXISTS goc_registration_number TEXT,
  ADD COLUMN IF NOT EXISTS goc_registration_type   TEXT;

-- Index for dashboard filtering: "show only GOC-confirmed candidates"
CREATE INDEX IF NOT EXISTS candidates_goc_registered_idx
  ON candidates (goc_registered, goc_confidence DESC)
  WHERE goc_registered IS NOT NULL;
