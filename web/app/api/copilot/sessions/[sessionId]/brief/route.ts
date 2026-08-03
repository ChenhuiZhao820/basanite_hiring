import { NextRequest, NextResponse } from 'next/server'
import { assertOwnsCopilotSession, forwardToPipeline } from '@/lib/copilot-auth'
import { allow } from '@/lib/rate-limit'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params
  const check = await assertOwnsCopilotSession(sessionId)
  if (check.error) return check.error

  const allowed = await allow(`copilot-brief:${check.user.id}`, 30, 60 * 60 * 1000)
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  return forwardToPipeline(`/copilot/sessions/${encodeURIComponent(sessionId)}/brief`, {
    method: 'POST',
  })
}
