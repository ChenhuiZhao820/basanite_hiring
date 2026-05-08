-- ENG-24: prevent duplicate interviews per candidate per role.
--
-- Each candidate gets at most ONE in-progress / completed assessment per
-- role. They can still have multiple `pending` / `cv_uploaded` /
-- `abandoned` rows (e.g. they uploaded a CV, walked away, came back) —
-- the bar is "you can't restart once you've actually entered the live
-- interview phase".
--
-- Partial unique index rather than a full table constraint so retries
-- before commitment to the live interview remain possible.

CREATE UNIQUE INDEX IF NOT EXISTS uniq_assessments_active_per_candidate
  ON assessments(role_id, candidate_user_id)
  WHERE status IN ('in_progress', 'completed') AND candidate_user_id IS NOT NULL;
