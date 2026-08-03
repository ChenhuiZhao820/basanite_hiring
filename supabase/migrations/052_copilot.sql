-- Basanite Copilot: human-led interviews assisted by the assessment engine.
--
-- A copilot session wraps an assessment (source='copilot') created ad-hoc by
-- the interviewer for a live role. The engine listens (STT transcript),
-- surfaces saturation / probes / flags during the call, proposes scores at
-- wrap-up, and the interviewer signs off — the human signature is the score
-- of record.

-- 1. Distinguish copilot-led assessments from autonomous ones.
ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'autonomous'
    CHECK (source IN ('autonomous', 'copilot'));

-- 2. Copilot sessions: one per copilot assessment.
CREATE TABLE copilot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  interviewer_user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'briefing'
    CHECK (status IN ('briefing', 'live', 'wrapup', 'review', 'submitted')),
  -- {"confirmed_by": uuid, "confirmed_at": iso, "statement": text}
  consent JSONB,
  -- Candidate-specific brief layer generated from the locked interview plan
  -- + the candidate's CV extract (the role-level plan lives on roles).
  brief_pack JSONB,
  -- Committed STT segments: [{"text": "...", "at": iso, "elapsed_seconds": int}]
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Latest tick output: saturation map, active probe, flags, pacing.
  live_state JSONB,
  -- Wrap-up output pending human review: proposed scores + synthesis draft.
  proposed_review JSONB,
  -- Meeting bot (Google Meet via Recall.ai): {"id", "meeting_url", "status"}.
  -- Null for in-person / browser-captured sessions.
  bot JSONB,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (assessment_id)
);

ALTER TABLE copilot_sessions ENABLE ROW LEVEL SECURITY;

-- The interviewer (session creator) can read their sessions; role owners can
-- read sessions on their roles. All writes go through the service role via
-- the FastAPI pipeline, so no INSERT/UPDATE policies for authenticated users.
CREATE POLICY "copilot_sessions_interviewer_select" ON copilot_sessions FOR SELECT
  USING (interviewer_user_id = auth.uid());

CREATE POLICY "copilot_sessions_role_owner_select" ON copilot_sessions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM assessments
    JOIN roles ON roles.id = assessments.role_id
    WHERE assessments.id = copilot_sessions.assessment_id
    AND roles.user_id = auth.uid()
  ));

CREATE INDEX idx_copilot_sessions_assessment_id ON copilot_sessions(assessment_id);
CREATE INDEX idx_copilot_sessions_interviewer ON copilot_sessions(interviewer_user_id);

-- 3. Probe suggestion lifecycle events — the uptake-rate success metric.
CREATE TABLE copilot_probe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES copilot_sessions(id) ON DELETE CASCADE,
  dimension_key TEXT,
  technique TEXT,
  probe_text TEXT,
  reason TEXT,
  action TEXT NOT NULL CHECK (action IN ('suggested', 'asked', 'adapted', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE copilot_probe_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "copilot_probe_events_interviewer_select" ON copilot_probe_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM copilot_sessions
    WHERE copilot_sessions.id = copilot_probe_events.session_id
    AND copilot_sessions.interviewer_user_id = auth.uid()
  ));

CREATE INDEX idx_copilot_probe_events_session_id ON copilot_probe_events(session_id);

-- 4. Human sign-off on dimension scores. For copilot assessments `score` is
-- the human-confirmed score of record; `proposed_score` preserves what the
-- engine suggested, and overrides carry a mandatory reason.
ALTER TABLE dimension_scores
  ADD COLUMN IF NOT EXISTS proposed_score INTEGER CHECK (proposed_score BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS override_reason TEXT,
  ADD COLUMN IF NOT EXISTS signed_off_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS signed_off_at TIMESTAMPTZ;
