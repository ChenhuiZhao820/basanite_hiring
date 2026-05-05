import { NextResponse } from 'next/server'
import { pipelineFetch, requireUser } from '@/lib/orgs-proxy'

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; userId: string }> }) {
  const { id, userId } = await ctx.params
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const res = await pipelineFetch(`/orgs/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, user_id: user.id }),
  })
  const text = await res.text()
  return new Response(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; userId: string }> }) {
  const { id, userId } = await ctx.params
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(`/orgs/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`, 'http://x')
  url.searchParams.set('user_id', user.id)
  const res = await pipelineFetch(url.pathname + url.search, { method: 'DELETE' })
  const text = await res.text()
  return new Response(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
}
