import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * Verify the caller is signed in and owns the assessment for this token.
 *
 * The four-way join token↔role↔assessment↔candidate_user_id is the only
 * thing separating one candidate's voice session, director tick, transcript,
 * or recording from another's. The backend only checks token↔role; this
 * helper adds the candidate binding the backend cannot see (no auth header).
 */
export async function assertCandidateOwnsAssessment(
  token: string,
  assessmentId: string | null | undefined,
): Promise<
  | { error: Response; user?: never; role?: never; assessment?: never }
  | { error?: never; user: { id: string }; role: { id: string }; assessment: { id: string } }
> {
  if (!assessmentId) {
    return {
      error: NextResponse.json({ error: 'Missing assessment_id' }, { status: 400 }),
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const service = createServiceClient()
  const { data: role } = await service
    .from('roles')
    .select('id')
    .eq('assessment_link_token', token)
    .single()
  if (!role) {
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  }

  const { data: assessment } = await service
    .from('assessments')
    .select('id')
    .eq('id', assessmentId)
    .eq('role_id', role.id)
    .eq('candidate_user_id', user.id)
    .single()
  if (!assessment) {
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  }

  return { user: { id: user.id }, role, assessment }
}

/**
 * Weaker guard for routes that run BEFORE an assessment exists (cv-upload,
 * start). Only requires a signed-in user and a valid token-linked role.
 */
export async function assertCandidateSession(
  token: string,
): Promise<
  | { error: Response; user?: never; role?: never }
  | { error?: never; user: { id: string }; role: { id: string } }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const service = createServiceClient()
  const { data: role } = await service
    .from('roles')
    .select('id')
    .eq('assessment_link_token', token)
    .single()
  if (!role) {
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  }

  return { user: { id: user.id }, role }
}
