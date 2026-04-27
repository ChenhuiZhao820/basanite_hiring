import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

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

  const service = createServiceClient()

  const { data: role } = await service
    .from('roles')
    .select('id')
    .eq('assessment_link_token', token)
    .single()
  if (!role) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
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
