import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { allow } from '@/lib/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const assessmentId = request.nextUrl.searchParams.get('assessment_id')

  if (!assessmentId) {
    return NextResponse.json({ error: 'Missing assessment_id' }, { status: 400 })
  }

  // ENG-37: this endpoint is the proof-of-concept for candidate-side
  // reads going through the user-bound Supabase client (the user's
  // JWT) instead of service-role. RLS does the work — the
  // reports_candidate_select policy (mig 021) gates on
  // candidate_user_id = auth.uid(), and assessments_candidate_select
  // (mig 019) does the same for the join. If the candidate's JWT
  // doesn't own the row, the SELECT returns no data and we 404 below.
  // Service-role is reserved for the role lookup, which has no
  // candidate-readable RLS policy on roles.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Frontend polls this endpoint until the report is ready. Cap to 60/hr
  // per candidate — generous for ~1 poll/min over an hour while still
  // blocking enumeration / scraping attempts.
  const allowed = await allow(`assess-report:${user.id}`, 60, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Roles are not candidate-SELECT-able under RLS, so the role lookup
  // (which only needs the role_id and expiry) stays on service-role.
  // We never expose role internals back to the candidate from here.
  const service = createServiceClient()
  const { data: role } = await service
    .from('roles')
    .select('id, assessment_link_token_expires_at')
    .eq('assessment_link_token', token)
    .single()
  if (!role) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  // ENG-20: optional token expiry. Treat expired the same as unknown.
  if (role.assessment_link_token_expires_at) {
    const exp = Date.parse(role.assessment_link_token_expires_at)
    if (Number.isNaN(exp) || exp <= Date.now()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  // ENG-37: from here on, every read is RLS-gated by the candidate's
  // own JWT. A forged assessment_id (or a leaked one for someone
  // else's row) returns no rows — no need for an explicit
  // candidate_user_id filter on the WHERE clause.
  const { data: assessment } = await supabase
    .from('assessments')
    .select('id, role_id')
    .eq('id', assessmentId)
    .single()
  if (!assessment || assessment.role_id !== role.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: report } = await supabase
    .from('reports')
    .select('*')
    .eq('assessment_id', assessmentId)
    .eq('report_type', 'candidate')
    .single()

  if (!report) {
    return NextResponse.json({ status: 'pending' }, { status: 202 })
  }

  return NextResponse.json(report)
}
