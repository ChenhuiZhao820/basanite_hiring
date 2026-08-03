import { NextRequest, NextResponse } from 'next/server'
import { assertCandidateSession, TEST_CANDIDATE_BYPASS } from '@/lib/assess-auth'
import { createServiceClient } from '@/lib/supabase/server'
import { allow } from '@/lib/rate-limit'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'
const PIPELINE_SECRET = process.env.PIPELINE_API_SECRET ?? ''

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const body = await request.json()

  const check = await assertCandidateSession(token)
  if (check.error) return check.error

  // Block anyone from starting an assessment as a different user.
  // Skipped under the DEV-ONLY bypass, where there is no real session user.
  if (!TEST_CANDIDATE_BYPASS && body?.candidate_user_id !== check.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // DEV-ONLY: candidate_user_id has a FK to auth.users, so a synthetic id
  // won't insert. Mint a real, confirmed throwaway user via the service
  // admin API and use its id (fresh per run avoids the one-active-per-
  // candidate 409). Never active in production.
  if (TEST_CANDIDATE_BYPASS) {
    const service = createServiceClient()
    const { data: created, error: createErr } = await service.auth.admin.createUser({
      email: `test+${crypto.randomUUID()}@local.test`,
      email_confirm: true,
      user_metadata: { is_candidate: true, full_name: body?.candidate_name || 'Test Candidate' },
    })
    if (createErr || !created?.user) {
      return NextResponse.json(
        { error: `Test user creation failed: ${createErr?.message ?? 'unknown'}` },
        { status: 500 },
      )
    }
    body.candidate_user_id = created.user.id
  }

  // CV extraction hits Haiku; cap per candidate to 5 starts/hour.
  const allowed = await allow(`start:${check.user.id}`, 5, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const res = await fetch(`${PIPELINE_URL}/assess/${token}/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PIPELINE_SECRET}`,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()

  // ENG-45: bind the assessment_id to the candidate via an httpOnly
  // cookie. sessionStorage was the previous source of truth and was
  // forge-able from DevTools — backend ownership checks already
  // protected against forged IDs, but the client-side trust path was
  // a smell. The cookie is scoped to /assess/{token} so cross-token
  // leakage is impossible.
  const response = NextResponse.json(data, { status: res.status })
  if (res.ok && data?.assessment_id) {
    response.cookies.set({
      name: `assessment_${token}`,
      value: String(data.assessment_id),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: `/assess/${token}`,
      maxAge: 60 * 60 * 8,  // 8 hours — long enough for the assessment
    })
  }
  return response
}
