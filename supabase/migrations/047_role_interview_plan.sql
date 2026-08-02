-- Hirer-facing interview plan.
-- A structured, human-readable plan (JSONB) generated after role creation
-- describing how the agent intends to conduct and evaluate the interview.
-- Editable by the hirer while the role is in draft; locked once live.

alter table roles add column if not exists interview_plan jsonb;
alter table roles add column if not exists interview_plan_edited_at timestamptz;
