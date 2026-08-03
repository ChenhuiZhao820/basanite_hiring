import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { forwardToPipeline } from '@/lib/copilot-auth'
import { allow } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const roleId = typeof body?.role_id === 'string' ? body.role_id : ''
  if (!roleId) return NextResponse.json({ error: 'Missing role_id' }, { status: 400 })

  // Session creation runs CV extraction (Haiku) — keep it modest per user.
  const allowed = await allow(`copilot-create:${user.id}`, 20, 60 * 60 * 1000)
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const service = createServiceClient()
  const { data: role } = await service
    .from('roles')
    .select('id')
    .eq('id', roleId)
    .eq('user_id', user.id)
    .single()
  if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 })

  return forwardToPipeline('/copilot/sessions', {
    method: 'POST',
    body: {
      role_id: roleId,
      interviewer_user_id: user.id,
      candidate_name: body?.candidate_name,
      candidate_email: body?.candidate_email,
      cv_text: body?.cv_text || null,
    },
  })
}
