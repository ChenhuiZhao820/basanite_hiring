import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; assessmentId: string }> },
) {
  const { id, assessmentId } = await params
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

  const { data: assessment } = await service
    .from('assessments')
    .select('id, role_id')
    .eq('id', assessmentId)
    .eq('role_id', id)
    .single()
  if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })

  await service.storage
    .from('interview-recordings')
    .remove([`${assessmentId}/session.webm`])
    .catch(() => null)

  const { error: deleteError } = await service
    .from('assessments')
    .delete()
    .eq('id', assessmentId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }
  return NextResponse.json({ status: 'deleted' })
}
