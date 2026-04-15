import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const assessmentId = request.nextUrl.searchParams.get('assessment_id')

  if (!assessmentId) {
    return NextResponse.json({ error: 'Missing assessment_id' }, { status: 400 })
  }

  const service = createServiceClient()

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
