import { NextRequest } from 'next/server'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const form = await request.formData()

  // Forward the multipart body to the Python backend as-is.
  const res = await fetch(`${PIPELINE_URL}/assess/${token}/transcribe`, {
    method: 'POST',
    body: form,
  })

  const text = await res.text()
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
  })
}
