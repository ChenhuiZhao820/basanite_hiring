-- ENG-52, ENG-53: hirer-side RLS UPDATE policies on `roles` and `orgs`
-- gated WHICH rows could be touched (USING) but didn't constrain the
-- POST-UPDATE row (no WITH CHECK). A hirer authenticated via Supabase
-- could issue:
--
--   await supabase.from('roles').update({
--     org_id: '<another-org>',  -- transfer to another org
--     user_id: '<another-user>',
--   }).eq('id', '<my-role-id>')
--
-- and the new row would be unconstrained. Same shape as ENG-29 on
-- assessments — the audit there was candidate-focused and missed the
-- mirror policies on the hirer side.
--
-- Both replacements:
--   - Add WITH CHECK that mirrors USING so the new state must still
--     satisfy the same membership/ownership predicate.
--   - FORCE RLS on the table so a future code path that mistakenly
--     uses an authenticated client where it should use service-role
--     trips loud.

-- ── roles ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "roles_org_update" ON roles;
CREATE POLICY "roles_org_update" ON roles FOR UPDATE
  USING (
    (org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = roles.org_id
        AND org_members.user_id = auth.uid()
    ))
    OR (org_id IS NULL AND user_id = auth.uid())
  )
  WITH CHECK (
    -- Same predicate on the post-update row so a hirer can't transfer
    -- a role to an org they aren't a member of (or claim ownership in
    -- single-user mode by setting user_id to someone else).
    (org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = roles.org_id
        AND org_members.user_id = auth.uid()
    ))
    OR (org_id IS NULL AND user_id = auth.uid())
  );

ALTER TABLE roles FORCE ROW LEVEL SECURITY;

-- ── orgs ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "orgs_owners_update" ON orgs;
CREATE POLICY "orgs_owners_update" ON orgs FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM org_members
    WHERE org_members.org_id = orgs.id
      AND org_members.user_id = auth.uid()
      AND org_members.role = 'owner'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM org_members
    WHERE org_members.org_id = orgs.id
      AND org_members.user_id = auth.uid()
      AND org_members.role = 'owner'
  ));

ALTER TABLE orgs FORCE ROW LEVEL SECURITY;
