-- Basanite: orgs + org_members
--
-- Introduces a tenant model so a single company (with multiple recruiters,
-- and eventually a Merge.dev linked-account) can share roles and assessments
-- without each user being their own world.
--
-- Migration is non-destructive:
--   * adds new tables `orgs` and `org_members`,
--   * adds a nullable `roles.org_id`,
--   * backfills one personal org per existing role-owner (id = user_id),
--   * rewrites SELECT/INSERT/UPDATE/DELETE policies on `roles` and the
--     hirer SELECT policy on `assessments` to use org membership.
--
-- The new policies have a TRANSITIONAL fallback: rows where `org_id IS NULL`
-- still go through the old `user_id = auth.uid()` check. This keeps new role
-- inserts working between this migration and the follow-up that makes
-- `org_id` NOT NULL once app code unconditionally fills it. The fallback
-- lines are tagged `LEGACY:` and must be removed in that follow-up.

-- ─────────────────────────── 1. Tables ───────────────────────────

CREATE TABLE orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;

CREATE TABLE org_members (
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (org_id, user_id)
);

CREATE INDEX idx_org_members_user_id ON org_members(user_id);

ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────── 2. RLS for the new tables ───────────────────────────

-- A user can read their own membership row, plus rows of co-members in the
-- same org (so a settings page can list teammates).
CREATE POLICY "org_members_self_or_teammate_select" ON org_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM org_members AS me
      WHERE me.org_id = org_members.org_id
        AND me.user_id = auth.uid()
    )
  );

-- Owners can manage memberships (add/remove teammates) on their orgs.
CREATE POLICY "org_members_owner_insert" ON org_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members AS me
      WHERE me.org_id = org_members.org_id
        AND me.user_id = auth.uid()
        AND me.role = 'owner'
    )
  );

CREATE POLICY "org_members_owner_delete" ON org_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM org_members AS me
      WHERE me.org_id = org_members.org_id
        AND me.user_id = auth.uid()
        AND me.role = 'owner'
    )
  );

-- Members can read orgs they belong to.
CREATE POLICY "orgs_members_select" ON orgs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = orgs.id
        AND org_members.user_id = auth.uid()
    )
  );

-- Owners can update org metadata (name, etc).
CREATE POLICY "orgs_owners_update" ON orgs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = orgs.id
        AND org_members.user_id = auth.uid()
        AND org_members.role = 'owner'
    )
  );

-- Org INSERT and DELETE are gated to the service role by default (no policy
-- granting them to authenticated users). The app creates orgs server-side
-- when a hirer onboards or accepts an invite.

-- ─────────────────────────── 3. Schema bridge: roles.org_id ───────────────────────────

ALTER TABLE roles ADD COLUMN org_id UUID REFERENCES orgs(id) ON DELETE CASCADE;
CREATE INDEX idx_roles_org_id ON roles(org_id);

-- ─────────────────────────── 4. Backfill ───────────────────────────

-- One personal org per existing role-owning user. id = user_id makes this
-- idempotent and lets us write the membership row in the same shape.
INSERT INTO orgs (id, name)
SELECT u.id,
       COALESCE(NULLIF(u.raw_user_meta_data->>'full_name', ''), u.email, 'Personal')
         || '''s workspace'
FROM auth.users u
WHERE EXISTS (SELECT 1 FROM roles WHERE roles.user_id = u.id)
ON CONFLICT (id) DO NOTHING;

-- The user is the owner of their personal org.
INSERT INTO org_members (org_id, user_id, role)
SELECT u.id, u.id, 'owner'
FROM auth.users u
WHERE EXISTS (SELECT 1 FROM roles WHERE roles.user_id = u.id)
ON CONFLICT (org_id, user_id) DO NOTHING;

-- Point every existing role at its owner's personal org.
UPDATE roles SET org_id = user_id WHERE org_id IS NULL;

-- ─────────────────────────── 5. Rewrite roles RLS to use org membership ───────────────────────────

DROP POLICY IF EXISTS "roles_owner_select" ON roles;
DROP POLICY IF EXISTS "roles_owner_insert" ON roles;
DROP POLICY IF EXISTS "roles_owner_update" ON roles;
DROP POLICY IF EXISTS "roles_owner_delete" ON roles;

CREATE POLICY "roles_org_select" ON roles FOR SELECT
  USING (
    -- org-aware path
    (org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = roles.org_id
        AND org_members.user_id = auth.uid()
    ))
    -- LEGACY: rows whose org_id hasn't been set yet (new inserts before app
    -- code starts populating org_id). Drop this clause once org_id is NOT NULL.
    OR (org_id IS NULL AND user_id = auth.uid())
  );

CREATE POLICY "roles_org_insert" ON roles FOR INSERT
  WITH CHECK (
    (org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = roles.org_id
        AND org_members.user_id = auth.uid()
    ))
    -- LEGACY: see above
    OR (org_id IS NULL AND user_id = auth.uid())
  );

CREATE POLICY "roles_org_update" ON roles FOR UPDATE
  USING (
    (org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = roles.org_id
        AND org_members.user_id = auth.uid()
    ))
    -- LEGACY: see above
    OR (org_id IS NULL AND user_id = auth.uid())
  );

CREATE POLICY "roles_org_delete" ON roles FOR DELETE
  USING (
    (org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = roles.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role IN ('owner', 'admin')
    ))
    -- LEGACY: see above
    OR (org_id IS NULL AND user_id = auth.uid())
  );

-- ─────────────────────────── 6. Rewrite assessments hirer-select policy ───────────────────────────

-- Candidate policies are unchanged; only the hirer SELECT path moves to org membership.
DROP POLICY IF EXISTS "assessments_hirer_select" ON assessments;

CREATE POLICY "assessments_hirer_select" ON assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM roles
      WHERE roles.id = assessments.role_id
        AND (
          (roles.org_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM org_members
            WHERE org_members.org_id = roles.org_id
              AND org_members.user_id = auth.uid()
          ))
          -- LEGACY: see above
          OR (roles.org_id IS NULL AND roles.user_id = auth.uid())
        )
    )
  );
