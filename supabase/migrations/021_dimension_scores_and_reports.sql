-- Basanite: Dimension scores and reports tables

-- Per-dimension scores for an assessment
CREATE TABLE dimension_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  dimension_key TEXT NOT NULL,
  score INTEGER CHECK (score BETWEEN 1 AND 5),
  quotation_basis TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (assessment_id, dimension_key)
);

ALTER TABLE dimension_scores ENABLE ROW LEVEL SECURITY;

-- Hirers can see scores for their roles
CREATE POLICY "dimension_scores_hirer_select" ON dimension_scores FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM assessments
    JOIN roles ON roles.id = assessments.role_id
    WHERE assessments.id = dimension_scores.assessment_id
    AND roles.user_id = auth.uid()
  ));

CREATE INDEX idx_dimension_scores_assessment_id ON dimension_scores(assessment_id);

-- Generated reports (hirer report + candidate report)
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('hirer', 'candidate')),
  content JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (assessment_id, report_type)
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Hirers can see hirer reports for their roles
CREATE POLICY "reports_hirer_select" ON reports FOR SELECT
  USING (
    report_type = 'hirer'
    AND EXISTS (
      SELECT 1 FROM assessments
      JOIN roles ON roles.id = assessments.role_id
      WHERE assessments.id = reports.assessment_id
      AND roles.user_id = auth.uid()
    )
  );

-- Candidates can see their own candidate reports
CREATE POLICY "reports_candidate_select" ON reports FOR SELECT
  USING (
    report_type = 'candidate'
    AND EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = reports.assessment_id
      AND assessments.candidate_user_id = auth.uid()
    )
  );

CREATE INDEX idx_reports_assessment_id ON reports(assessment_id);
