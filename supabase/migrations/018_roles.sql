-- Basanite: Roles table
-- A role represents a hiring position that candidates are assessed against.

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company_name TEXT,
  job_description TEXT NOT NULL,
  dimensions JSONB NOT NULL DEFAULT '[]',
  technical_depth TEXT CHECK (technical_depth IN ('application', 'research_architecture')),
  eligibility_constraints JSONB DEFAULT '{}',
  interview_agent_prompt TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'paused', 'closed')),
  assessment_link_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles_owner_select" ON roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "roles_owner_insert" ON roles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "roles_owner_update" ON roles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "roles_owner_delete" ON roles FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_roles_user_id ON roles(user_id);
CREATE INDEX idx_roles_assessment_link_token ON roles(assessment_link_token);
CREATE INDEX idx_roles_status ON roles(status);
