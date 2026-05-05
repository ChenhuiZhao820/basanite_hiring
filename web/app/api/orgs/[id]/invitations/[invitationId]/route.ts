import { NextResponse } from 'next/server'
import { pipelineFetch, requireUser } from '@/lib/orgs-proxy'

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; invitationId: string }> },
) {
  const { id, invitationId } = await ctx.params
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(`/orgs/${encodeURIComponent(id)}/invitations/${encodeURIComponent(invitationId)}`, 'http://x')
  url.searchParams.set('user_id', user.id)
  const res = await pipelineFetch(url.pathname + url.search, { method: 'DELETE' })
  const text = await res.text()
  return new Response(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
}
