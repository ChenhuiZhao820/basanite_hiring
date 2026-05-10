import { NextResponse } from 'next/server'
import { pipelineFetch, requireUser } from '@/lib/orgs-proxy'
import { allow } from '@/lib/rate-limit'

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ENG-56: every invitation triggers a Resend send on Basanite's
  // domain. Without a cap, a compromised admin account could turn
  // the org-invite flow into a spam relay, or a single admin could
  // accidentally fire hundreds of sends through a UI loop. Cap to
  // 10/hr per inviting user, 30/hr per org — the per-org cap stops
  // a chain of compromised admins in the same org from amplifying.
  const userOk = await allow(`org-invite:user:${user.id}`, 10, 60 * 60 * 1000)
  const orgOk = await allow(`org-invite:org:${id}`, 30, 60 * 60 * 1000)
  if (!userOk || !orgOk) {
    return NextResponse.json({ error: 'Too many invitations' }, { status: 429 })
  }

  const body = await req.json().catch(() => ({}))
  const res = await pipelineFetch(`/orgs/${encodeURIComponent(id)}/invitations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, user_id: user.id }),
  })
  const text = await res.text()
  return new Response(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
}
