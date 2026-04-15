import { NextRequest } from 'next/server'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const body = await request.json()

  // Proxy to Python backend SSE stream
  const res = await fetch(`${PIPELINE_URL}/assess/${token}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok || !res.body) {
    return new Response(JSON.stringify({ error: 'Failed to connect to interview service' }), {
      status: res.status || 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Forward the SSE stream
  return new Response(res.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
