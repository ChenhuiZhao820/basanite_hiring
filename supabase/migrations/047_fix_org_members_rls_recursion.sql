-- Basanite: fix infinite recursion in org_members RLS (Postgres 42P17)
--
-- Migration 026 defined the org_members SELECT/INSERT/DELETE policies with
-- subqueries against org_members itself. Evaluating such a policy re-applies
-- the same policy to the inner reference, recursing forever. Any query that
-- touches org_members -- directly, or transitively via the roles / assessments
-- policies that do `EXISTS (SELECT 1 FROM org_members ...)` -- fails with:
--
--   42P17: infinite recursion detected in policy for relation "org_members"
--
-- The service_role key bypasses RLS, so the Python backend never hit this; it
-- only surfaces for anon/authenticated browser queries.
--
-- Fix: move the membership lookups into SECURITY DEFINER helper functions.
-- Because the function owner bypasses RLS, the inner read of org_members does
-- not re-trigger the policy, breaking the cycle. Policies then call the
-- helpers instead of embedding a self-referential subquery.

-- ─────────────────────────── 1. Helper functions ───────────────────────────

CREATE OR REPLACE FUNCTION public.is_org_member(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_members.org_id = _org_id
      AND org_members.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_owner(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_members.org_id = _org_id
      AND org_members.user_id = auth.uid()
      AND org_members.role = 'owner'
  );
$$;

-- Lock the helpers down: they run as owner, so only the app roles should call
-- them. (auth.uid() still scopes every result to the calling user.)
REVOKE ALL ON FUNCTION public.is_org_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_org_owner(UUID)  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_org_member(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_owner(UUID)  TO anon, authenticated;

-- ─────────────────────────── 2. Rewrite the recursive org_members policies ───────────────────────────

DROP POLICY IF EXISTS "org_members_self_or_teammate_select" ON org_members;
CREATE POLICY "org_members_self_or_teammate_select" ON org_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_org_member(org_id)
  );

DROP POLICY IF EXISTS "org_members_owner_insert" ON org_members;
CREATE POLICY "org_members_owner_insert" ON org_members FOR INSERT
  WITH CHECK ( public.is_org_owner(org_id) );

DROP POLICY IF EXISTS "org_members_owner_delete" ON org_members;
CREATE POLICY "org_members_owner_delete" ON org_members FOR DELETE
  USING ( public.is_org_owner(org_id) );

-- Note: the policies on orgs, roles, assessments, org_invitations, etc. that
-- read org_members via `EXISTS (...)` are now safe as-is -- they resolve
-- through the fixed, non-recursive org_members SELECT policy. They are left
-- unchanged here to keep this migration scoped to the recursion fix.
