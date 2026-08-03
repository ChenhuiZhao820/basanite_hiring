import { NextRequest, NextResponse } from 'next/server'
import { assertOwnsCopilotSession, forwardToPipeline } from '@/lib/copilot-auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params
  const check = await assertOwnsCopilotSession(sessionId)
  if (check.error) return check.error
  return forwardToPipeline(`/copilot/sessions/${encodeURIComponent(sessionId)}`, { method: 'GET' })
}
