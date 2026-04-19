-- Full-session webm recording for the ElevenLabs voice interview.
-- Path format: interview-recordings/{assessment_id}/session.webm
alter table assessments add column if not exists recording_path text;
