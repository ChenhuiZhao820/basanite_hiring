// Admin-only: list candidate-reported interview issues, and mark them
// resolved. Reads via the service-role client and embeds the assessment +
// role so the dashboard can show who reported it and for which role.

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.app_metadata?.is_admin) return null
  return user
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const service = createServiceClient()
  const { data, error } = await service
    .from('issue_reports')
    .select(
      'id, category, message, page, status, created_at, token, ' +
      'assessments(candidate_name, candidate_email, roles(title, company_name))',
    )
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[admin/issue-reports] load failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ reports: data ?? [] })
}

export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { id?: string; status?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  if (!body.id || !['new', 'resolved'].includes(body.status ?? '')) {
    return NextResponse.json({ error: 'id and a valid status are required.' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service
    .from('issue_reports')
    .update({ status: body.status })
    .eq('id', body.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
