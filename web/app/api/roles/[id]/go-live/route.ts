import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'
const PIPELINE_SECRET = process.env.PIPELINE_API_SECRET ?? ''

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: role } = await service
    .from('roles')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 })

  const res = await fetch(`${PIPELINE_URL}/roles/${id}/go-live`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PIPELINE_SECRET}` },
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
