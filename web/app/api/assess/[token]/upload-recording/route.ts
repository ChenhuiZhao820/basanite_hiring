import { NextRequest } from 'next/server'
import { assertCandidateOwnsAssessment } from '@/lib/assess-auth'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const form = await request.formData()
  const assessmentId = form.get('assessment_id')

  const check = await assertCandidateOwnsAssessment(
    token,
    typeof assessmentId === 'string' ? assessmentId : null,
  )
  if (check.error) return check.error

  const res = await fetch(`${PIPELINE_URL}/assess/${token}/upload-recording`, {
    method: 'POST',
    body: form,
  })

  const text = await res.text()
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
  })
}
