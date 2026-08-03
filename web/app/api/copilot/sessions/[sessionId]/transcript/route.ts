import { NextRequest, NextResponse } from 'next/server'
import { assertOwnsCopilotSession, forwardToPipeline } from '@/lib/copilot-auth'
import { allow } from '@/lib/rate-limit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params
  const check = await assertOwnsCopilotSession(sessionId)
  if (check.error) return check.error

  // Committed STT segments arrive every few seconds during a live call.
  const allowed = await allow(`copilot-transcript:${check.user.id}`, 1200, 60 * 60 * 1000)
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const body = await request.json().catch(() => ({}))
  return forwardToPipeline(`/copilot/sessions/${encodeURIComponent(sessionId)}/transcript`, {
    method: 'POST',
    body: { segments: Array.isArray(body?.segments) ? body.segments : [] },
  })
}
