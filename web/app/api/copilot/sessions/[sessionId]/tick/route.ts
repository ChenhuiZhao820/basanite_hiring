import { NextRequest } from 'next/server'
import { assertOwnsCopilotSession } from '@/lib/copilot-auth'
import { allow } from '@/lib/rate-limit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params
  const check = await assertOwnsCopilotSession(sessionId)
  if (check.error) return check.error

  // Each tick hits Haiku; a 60-min interview at one tick per ~15s is ~240
  // calls. Sliding 1h window with headroom; overflow degrades to skipped
  // ticks (the panel just doesn't refresh), never an error mid-interview.
  const allowed = await allow(`copilot-tick:${check.user.id}`, 400, 60 * 60 * 1000)
  if (!allowed) {
    return new Response(JSON.stringify({ skip: true, reason: 'rate_limited' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const body = await request.json().catch(() => ({}))

  // Short timeout — if Haiku is slow, skip this tick rather than hang the panel.
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  try {
    const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'
    const PIPELINE_SECRET = process.env.PIPELINE_API_SECRET ?? ''
    const res = await fetch(`${PIPELINE_URL}/copilot/sessions/${encodeURIComponent(sessionId)}/tick`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PIPELINE_SECRET}`,
      },
      body: JSON.stringify({ elapsed_seconds: body?.elapsed_seconds ?? 0 }),
      signal: controller.signal,
    })
    const text = await res.text()
    return new Response(text, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ skip: true, reason: e?.name === 'AbortError' ? 'timeout' : 'error' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } finally {
    clearTimeout(timeout)
  }
}
