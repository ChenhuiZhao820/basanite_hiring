// Public proxy for resolving a candidate invite token to an assessment.
// No authentication — the invite_token IS the auth.

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'

export async function GET(
  _req: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params
  const res = await fetch(`${PIPELINE_URL}/assess/invite/${encodeURIComponent(token)}`, {
    cache: 'no-store',
  })
  const text = await res.text()
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
  })
}
