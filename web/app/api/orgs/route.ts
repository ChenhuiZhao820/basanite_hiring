// GET /api/orgs — list every org the calling user is a member of.
// POST /api/orgs — create a new shared org (caller becomes owner).

import { NextResponse } from 'next/server'
import { pipelineFetch, requireUser } from '@/lib/orgs-proxy'

export async function GET() {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL('/orgs', 'http://x')
  url.searchParams.set('user_id', user.id)
  const res = await pipelineFetch(url.pathname + url.search)
  const text = await res.text()
  return new Response(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
}

export async function POST(req: Request) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const res = await pipelineFetch('/orgs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, user_id: user.id }),
  })
  const text = await res.text()
  return new Response(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
}
