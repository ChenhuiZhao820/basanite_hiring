-- Basanite: Interview sessions table
-- Stores the full conversation state for an AI-conducted interview.

CREATE TABLE interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]',
  current_phase TEXT DEFAULT 'not_started'
    CHECK (current_phase IN (
      'not_started', 'narrative_foundation', 'dimension_assessment',
      'knowledge_reproduction', 'transfer_test', 'comprehensive_challenge',
      'stress_test', 'complete'
    )),
  internal_state JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;

-- Only service role writes to interview_sessions (backend manages state).
-- Candidates can read their own session (for resuming).
CREATE POLICY "interview_sessions_candidate_select" ON interview_sessions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM assessments
    WHERE assessments.id = interview_sessions.assessment_id
    AND assessments.candidate_user_id = auth.uid()
  ));

-- Hirers can read sessions for their roles (for transcript review)
CREATE POLICY "interview_sessions_hirer_select" ON interview_sessions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM assessments
    JOIN roles ON roles.id = assessments.role_id
    WHERE assessments.id = interview_sessions.assessment_id
    AND roles.user_id = auth.uid()
  ));

CREATE INDEX idx_interview_sessions_assessment_id ON interview_sessions(assessment_id);
