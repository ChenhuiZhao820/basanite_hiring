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
  return NextResponse.json(data, { status: res.status })
}
