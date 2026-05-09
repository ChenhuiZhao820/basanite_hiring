import { NextRequest, NextResponse } from 'next/server'
import { assertCandidateSession } from '@/lib/assess-auth'
import { allow } from '@/lib/rate-limit'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const body = await request.json()

  const check = await assertCandidateSession(token)
  if (check.error) return check.error

  // Block anyone from starting an assessment as a different user.
  if (body?.candidate_user_id !== check.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // CV extraction hits Haiku; cap per candidate to 5 starts/hour.
  const allowed = await allow(`start:${check.user.id}`, 5, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const res = await fetch(`${PIPELINE_URL}/assess/${token}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
