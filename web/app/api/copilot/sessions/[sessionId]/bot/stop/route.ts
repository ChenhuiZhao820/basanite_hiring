import { NextRequest } from 'next/server'
import { assertOwnsCopilotSession, forwardToPipeline } from '@/lib/copilot-auth'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params
  const check = await assertOwnsCopilotSession(sessionId)
  if (check.error) return check.error

  return forwardToPipeline(`/copilot/sessions/${encodeURIComponent(sessionId)}/bot/stop`, {
    method: 'POST',
  })
}
