-- Basanite: Assessments table
-- An assessment represents a single candidate's evaluation for a specific role.

CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  candidate_user_id UUID REFERENCES auth.users(id),
  candidate_name TEXT,
  candidate_email TEXT,
  cv_url TEXT,
  cv_extracted JSONB,
  experience_path TEXT CHECK (experience_path IN ('path_a', 'path_b')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'cv_uploaded', 'in_progress', 'completed', 'abandoned')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

-- Role owners can see all assessments for their roles
CREATE POLICY "assessments_hirer_select" ON assessments FOR SELECT
  USING (EXISTS (SELECT 1 FROM roles WHERE roles.id = assessments.role_id AND roles.user_id = auth.uid()));

-- Candidates can see their own assessments
CREATE POLICY "assessments_candidate_select" ON assessments FOR SELECT
  USING (candidate_user_id = auth.uid());

-- Candidates can insert their own assessments
CREATE POLICY "assessments_candidate_insert" ON assessments FOR INSERT
  WITH CHECK (candidate_user_id = auth.uid());

-- Candidates can update their own assessments (e.g., upload CV)
CREATE POLICY "assessments_candidate_update" ON assessments FOR UPDATE
  USING (candidate_user_id = auth.uid());

CREATE INDEX idx_assessments_role_id ON assessments(role_id);
CREATE INDEX idx_assessments_candidate_user_id ON assessments(candidate_user_id);
CREATE INDEX idx_assessments_status ON assessments(status);
