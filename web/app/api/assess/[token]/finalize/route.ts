import { NextRequest, NextResponse } from 'next/server'
import { assertCandidateOwnsAssessment } from '@/lib/assess-auth'
import { allow } from '@/lib/rate-limit'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const body = await request.json()

  const check = await assertCandidateOwnsAssessment(token, body?.assessment_id)
  if (check.error) return check.error

  // /finalize polls ElevenLabs for the transcript and triggers Sonnet
  // report generation. Cap to 5/hr per candidate; legitimate use is
  // exactly 1 per assessment.
  const allowed = await allow(`finalize:${check.user.id}`, 5, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const res = await fetch(`${PIPELINE_URL}/assess/${token}/finalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
  })
}
