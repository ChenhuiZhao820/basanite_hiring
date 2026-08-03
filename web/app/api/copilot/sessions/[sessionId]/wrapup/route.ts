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

  // Wrap-up runs the full Sonnet pass; retries are legitimate but bounded.
  const allowed = await allow(`copilot-wrapup:${check.user.id}`, 20, 60 * 60 * 1000)
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  return forwardToPipeline(`/copilot/sessions/${encodeURIComponent(sessionId)}/wrapup`, {
    method: 'POST',
  })
}
