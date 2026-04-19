import { NextRequest } from 'next/server'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; kind: string }> },
) {
  const { token, kind } = await params
  const assessmentId = request.nextUrl.searchParams.get('assessment_id')
  if (!assessmentId) {
    return new Response(JSON.stringify({ error: 'Missing assessment_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const upstream = new URL(`${PIPELINE_URL}/assess/${token}/report/${kind}/pdf`)
  upstream.searchParams.set('assessment_id', assessmentId)
  const res = await fetch(upstream.toString(), { method: 'GET' })

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    return new Response(text || JSON.stringify({ error: 'Failed to generate PDF' }), {
      status: res.status || 500,
      headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
    })
  }

  return new Response(res.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': res.headers.get('content-disposition') ?? `attachment; filename="basanite-${kind}.pdf"`,
    },
  })
}
