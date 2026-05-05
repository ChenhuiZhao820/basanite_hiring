// Resolves an invitation token to a membership. Called by the
// /accept-invite page after the user is signed in.

import { NextResponse } from 'next/server'
import { pipelineFetch, requireUser } from '@/lib/orgs-proxy'

export async function POST(req: Request) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const res = await pipelineFetch('/accept-invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, user_id: user.id }),
  })
  const text = await res.text()
  return new Response(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
}
