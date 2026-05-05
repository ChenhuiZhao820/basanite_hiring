// Fired by /login after a successful signup. Best-effort — never blocks
// the signup flow. The FastAPI side decides whether to auto-join an org
// (based on email domain) or seed the user's personal org as active.

import { NextResponse } from 'next/server'
import { pipelineFetch, requireUser } from '@/lib/orgs-proxy'

export async function POST() {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const res = await pipelineFetch('/auth/post-signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: user.id, email: user.email ?? '' }),
  })
  const text = await res.text()
  return new Response(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
}
