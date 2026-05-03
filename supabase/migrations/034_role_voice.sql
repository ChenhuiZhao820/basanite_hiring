-- Per-role interviewer voice picker.
--
-- Stores the ElevenLabs voice_id chosen by the hiring manager for this
-- role. NULL means "use the agent's default voice" so existing rows
-- created before this column was added keep working without backfill.
--
-- Validation of which voice IDs are allowed lives in core/voices.py
-- (the catalogue) — we deliberately do NOT enforce a CHECK constraint
-- here because the catalogue is curated/swapped from the application
-- layer and a DB-level constraint would force a migration every time
-- we add or remove a voice option.

ALTER TABLE roles ADD COLUMN IF NOT EXISTS interviewer_voice_id TEXT;
