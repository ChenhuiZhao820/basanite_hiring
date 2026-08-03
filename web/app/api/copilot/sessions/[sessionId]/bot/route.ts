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

  // Each bot costs real money at the vendor; keep creation modest.
  const allowed = await allow(`copilot-bot:${check.user.id}`, 10, 60 * 60 * 1000)
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const body = await request.json().catch(() => ({}))
  return forwardToPipeline(`/copilot/sessions/${encodeURIComponent(sessionId)}/bot`, {
    method: 'POST',
    body: { meeting_url: body?.meeting_url },
  })
}
