-- Extra signup context for the register-interest page, plus an approval
-- timestamp so admins can see when each entry was let in.
--
-- persona: who the person is in the hiring process
--   'hirer' | 'interviewer' | 'candidate'
-- referral_source: free-text "how did you hear about us" (picked from a
--   preset list client-side, but stored as text so the list can evolve
--   without schema changes).
ALTER TABLE waitlist
  ADD COLUMN phone            TEXT,
  ADD COLUMN referral_source  TEXT,
  ADD COLUMN persona          TEXT,
  ADD COLUMN approved_at      TIMESTAMPTZ;

-- Backfill: entries already approved get their approval time set to
-- created_at as the best available estimate (real approvals from now on
-- write the actual moment).
UPDATE waitlist SET approved_at = created_at WHERE status = 'approved';
