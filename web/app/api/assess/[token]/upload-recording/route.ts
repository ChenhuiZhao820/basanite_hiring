import { NextRequest, NextResponse } from 'next/server'
import { assertCandidateOwnsAssessment } from '@/lib/assess-auth'
import { allow } from '@/lib/rate-limit'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const form = await request.formData()
  const assessmentId = form.get('assessment_id')

  const check = await assertCandidateOwnsAssessment(
    token,
    typeof assessmentId === 'string' ? assessmentId : null,
  )
  if (check.error) return check.error

  // Each upload streams up to 200MB to Supabase Storage; cap to 5/hr per
  // candidate (legitimate use is 1; headroom covers retry on transient
  // upload failure). Without this, a single user can drain bandwidth.
  const allowed = await allow(`upload-recording:${check.user.id}`, 5, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const res = await fetch(`${PIPELINE_URL}/assess/${token}/upload-recording`, {
    method: 'POST',
    body: form,
  })

  const text = await res.text()
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
  })
}
