// Persist a candidate-reported issue raised from inside the live interview
// ("Having issues?" button). Writes straight to issue_reports via the
// service-role client — same pattern as /api/consent/log — so it doesn't
// depend on the FastAPI tier being reachable (the candidate may be reporting
// that the very pipeline is down).

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { allow, getIP } from '@/lib/rate-limit'

// Keep in sync with the dropdown in components/IssueReporter.tsx. Anything
// not on the list is coerced to "other" rather than rejected — we never want
// to lose a genuine report over a label mismatch.
const CATEGORIES = new Set([
  'audio_mic',
  'cant_hear',
  'no_response',
  'frozen',
  'connection',
  'other',
])

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  // Generous per-IP cap: a frustrated candidate may file a few, but this
  // stops a script from flooding the table through a leaked token.
  const allowed = await allow(`report-issue:${getIP(request)}`, 20, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many reports. Please wait a moment.' }, { status: 429 })
  }

  let body: { category?: string; message?: string; assessment_id?: string; page?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const category = CATEGORIES.has(body.category ?? '') ? body.category! : 'other'
  const message = (body.message ?? '').toString().trim().slice(0, 2000)
  const page = (body.page ?? 'interview').toString().slice(0, 60)
  const userAgent = request.headers.get('user-agent')?.slice(0, 400) ?? null

  // A report with neither a meaningful category nor a message is noise.
  if (category === 'other' && !message) {
    return NextResponse.json({ error: 'Please describe the issue.' }, { status: 400 })
  }

  // Validate the assessment_id belongs to this token's role before storing it,
  // so a forged id can't attach a report to someone else's assessment. If it
  // doesn't resolve we still store the report (token-only) rather than drop it.
  const service = createServiceClient()
  let assessmentId: string | null = null
  if (body.assessment_id) {
    const { data: role } = await service
      .from('roles')
      .select('id')
      .eq('assessment_link_token', token)
      .single()
    if (role) {
      const { data: assessment } = await service
        .from('assessments')
        .select('id')
        .eq('id', body.assessment_id)
        .eq('role_id', role.id)
        .single()
      if (assessment) assessmentId = assessment.id
    }
  }

  const { error } = await service.from('issue_reports').insert({
    assessment_id: assessmentId,
    token,
    category,
    message,
    page,
    user_agent: userAgent,
  })
  if (error) {
    console.error('[report-issue] insert failed:', error.message)
    return NextResponse.json({ error: 'Could not submit report.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
