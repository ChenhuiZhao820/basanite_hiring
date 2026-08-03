import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'
const PIPELINE_SECRET = process.env.PIPELINE_API_SECRET ?? ''

type OwnershipOk = { error: null; user: { id: string }; roleId: string }
type OwnershipErr = { error: NextResponse; user: null; roleId: null }

/**
 * Hirer-side ownership check for copilot session routes: the caller must be
 * authenticated AND own the role the session's assessment belongs to. The
 * FastAPI copilot endpoints are internal-only, so this gate (mirroring
 * assess-auth.ts on the candidate side) is what stands between a stolen
 * session id and someone else's live interview.
 */
export async function assertOwnsCopilotSession(
  sessionId: string,
): Promise<OwnershipOk | OwnershipErr> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
      roleId: null,
    }
  }

  const service = createServiceClient()
  const { data: session } = await service
    .from('copilot_sessions')
    .select('id, interviewer_user_id, assessments(role_id, roles(id, user_id))')
    .eq('id', sessionId)
    .single()

  const assessment: any = Array.isArray((session as any)?.assessments)
    ? (session as any)?.assessments?.[0]
    : (session as any)?.assessments
  const role: any = Array.isArray(assessment?.roles) ? assessment?.roles?.[0] : assessment?.roles

  if (!session || role?.user_id !== user.id) {
    // 404 (not 403) so a probing caller can't distinguish "exists but not
    // yours" from "doesn't exist".
    return {
      error: NextResponse.json({ error: 'Not found' }, { status: 404 }),
      user: null,
      roleId: null,
    }
  }
  return { error: null, user: { id: user.id }, roleId: role.id as string }
}

/** Forward a request to a FastAPI copilot endpoint with the internal secret. */
export async function forwardToPipeline(
  path: string,
  init: { method: string; body?: unknown },
): Promise<NextResponse> {
  const res = await fetch(`${PIPELINE_URL}${path}`, {
    method: init.method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PIPELINE_SECRET}`,
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  })
  const text = await res.text()
  try {
    return NextResponse.json(JSON.parse(text), { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  }
}
