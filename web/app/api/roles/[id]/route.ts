import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isSuspended, suspendedResponse } from '@/lib/suspension'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'
const PIPELINE_SECRET = process.env.PIPELINE_API_SECRET ?? ''

async function assertRoleOwner(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  // A suspended user with a stale session must not act via direct fetch;
  // the middleware only guards page navigation.
  if (isSuspended(user)) return { error: suspendedResponse() }

  const service = createServiceClient()
  const { data: role } = await service
    .from('roles')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!role) return { error: NextResponse.json({ error: 'Role not found' }, { status: 404 }) }
  return { user }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const check = await assertRoleOwner(id)
  if (check.error) return check.error

  const res = await fetch(`${PIPELINE_URL}/roles/${id}`, {
    headers: { 'Authorization': `Bearer ${PIPELINE_SECRET}` },
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const check = await assertRoleOwner(id)
  if (check.error) return check.error

  const body = await request.json()
  const res = await fetch(`${PIPELINE_URL}/roles/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PIPELINE_SECRET}`,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (isSuspended(user)) return suspendedResponse()

  const service = createServiceClient()

  const { data: role } = await service
    .from('roles')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 })

  const { data: assessments } = await service
    .from('assessments')
    .select('id')
    .eq('role_id', id)

  const recordingPaths = (assessments ?? []).map(
    (a) => `${a.id}/session.webm`,
  )
  if (recordingPaths.length > 0) {
    await service.storage
      .from('interview-recordings')
      .remove(recordingPaths)
      .catch(() => null)
  }

  const { error: deleteError } = await service
    .from('roles')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }
  return NextResponse.json({ status: 'deleted' })
}
