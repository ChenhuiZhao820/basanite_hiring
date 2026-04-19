-- Per-role interview configuration.
-- Duration (minutes) and free-form custom instructions from the hiring manager.

alter table roles add column if not exists interview_duration_minutes int not null default 15;
alter table roles add column if not exists custom_instructions text;
