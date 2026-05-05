-- Per-org cloned interviewer voices.
--
-- A row per voice the hirer's org has cloned via ElevenLabs Instant Voice
-- Cloning. eleven_voice_id is the canonical reference used everywhere
-- (overrides.tts.voiceId at session start, roles.interviewer_voice_id);
-- the rest of the columns are presentation + audit.
--
-- Soft-delete pattern: we keep the row for 30 days after the hirer "deletes"
-- the voice so any in-flight role still pointing at it can be reverted
-- gracefully. The retention sweep (core/retention.py) hard-deletes after
-- the grace window AND issues a DELETE to ElevenLabs to free the slot.

CREATE TABLE org_custom_voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  -- ElevenLabs voice ID returned from POST /v1/voices/add. UNIQUE because
  -- ElevenLabs assigns globally-unique IDs and we never want two rows
  -- pointing at the same voice (would confuse the soft-delete + reuse path).
  eleven_voice_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  -- Public path to a 5-second preview MP3 of the cloned voice. Generated
  -- once at clone time (TTS the standard preview line) and stored in the
  -- 'org-voice-samples' Supabase Storage bucket.
  sample_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- When non-null, hidden from the picker but kept for audit + the
  -- retention-sweep grace window. NULL by default (active).
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_org_custom_voices_org_id_active ON org_custom_voices(org_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_org_custom_voices_eleven_voice_id ON org_custom_voices(eleven_voice_id);

ALTER TABLE org_custom_voices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_custom_voices_member_select" ON org_custom_voices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = org_custom_voices.org_id
        AND org_members.user_id = auth.uid()
    )
  );

-- Mutations go through the FastAPI service role (same pattern as
-- ats_connections + ats_job_mappings).
