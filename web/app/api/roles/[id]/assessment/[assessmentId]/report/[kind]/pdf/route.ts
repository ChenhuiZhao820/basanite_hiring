import { NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'
const PIPELINE_SECRET = process.env.PIPELINE_API_SECRET ?? ''

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assessmentId: string; kind: string }> },
) {
  const { id, assessmentId, kind } = await params

  // Auth: the logged-in user must own the role the assessment belongs to.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  const service = createServiceClient()
  const { data: role } = await service
    .from('roles')
    .select('id, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!role) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
  }

  const { data: assessment } = await service
    .from('assessments')
    .select('id, role_id')
    .eq('id', assessmentId)
    .eq('role_id', id)
    .single()
  if (!assessment) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
  }

  const res = await fetch(`${PIPELINE_URL}/reports/${assessmentId}/${kind}/pdf`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${PIPELINE_SECRET}` },
  })

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    return new Response(text || JSON.stringify({ error: 'Failed to generate PDF' }), {
      status: res.status || 500,
      headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
    })
  }

  return new Response(res.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': res.headers.get('content-disposition') ?? `attachment; filename="basanite-${kind}.pdf"`,
    },
  })
}
