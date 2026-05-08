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

  const { data: assessment } = await service
    .from('assessments')
    .select('id')
    .eq('id', assessmentId)
    .eq('role_id', role.id)
    .eq('candidate_user_id', user.id)
    .single()
  if (!assessment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: report } = await service
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
