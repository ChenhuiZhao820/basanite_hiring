import { NextRequest, NextResponse } from 'next/server'
import { assertOwnsCopilotSession, forwardToPipeline } from '@/lib/copilot-auth'
import { allow } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const sessionId = typeof body?.session_id === 'string' ? body.session_id : ''
  if (!sessionId) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })

  // Token minting is tied to a session the caller owns — a bare login isn't
  // enough to farm transcription tokens.
  const check = await assertOwnsCopilotSession(sessionId)
  if (check.error) return check.error

  // Tokens are single-use with a 15-min TTL; reconnects legitimately need a
  // fresh one, but not hundreds.
  const allowed = await allow(`copilot-scribe-token:${check.user.id}`, 30, 60 * 60 * 1000)
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  return forwardToPipeline('/copilot/scribe-token', { method: 'GET' })
}
