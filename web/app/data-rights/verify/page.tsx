// Server component: handles the verification link clicked from email.
// Calls the FastAPI endpoint that resolves the token and actions the
// request, then renders a result page.

import Link from 'next/link'
import { LogoMark } from '@/components/Logo'
import { LegalFooter } from '@/components/LegalFooter'

export const metadata = { title: 'Basanite — Verify request' }

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'
const PIPELINE_SECRET = process.env.PIPELINE_API_SECRET ?? ''

type Result =
  | { status: 'completed'; request_type: string; download_url?: string }
  | { status: 'pending'; request_type: string }
  | { status: 'expired' }
  | { status: 'invalid' }
  | { status: 'error'; error: string }

async function verify(token: string): Promise<Result> {
  if (!token) return { status: 'invalid' }
  try {
    const res = await fetch(`${PIPELINE_URL}/data-rights/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PIPELINE_SECRET}`,
      },
      body: JSON.stringify({ token }),
      cache: 'no-store',
    })
    if (res.status === 410) return { status: 'expired' }
    if (res.status === 404) return { status: 'invalid' }
    if (!res.ok) return { status: 'error', error: `HTTP ${res.status}` }
    return await res.json()
  } catch (e) {
    return { status: 'error', error: e instanceof Error ? e.message : 'Network error' }
  }
}

export default async function VerifyDsarPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const result = await verify(token ?? '')

  return (
    <div className="min-h-screen bg-earth-50 flex flex-col">
      <header className="border-b border-earth-200 bg-white">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={24} dark />
            <span className="font-semibold text-basanite-900 text-sm">Basanite</span>
          </Link>
          <Link href="/dashboard" className="text-xs text-basanite-500 hover:text-basanite-900 transition-colors">
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-6 py-12 w-full">
        <ResultCard result={result} />
      </main>

      <div className="max-w-2xl mx-auto w-full px-6">
        <LegalFooter />
      </div>
    </div>
  )
}

function ResultCard({ result }: { result: Result }) {
  if (result.status === 'invalid') {
    return (
      <Card title="Link not recognised">
        <p>This verification link isn&apos;t valid. It may have already been used. If you believe this is an error, submit a new request from the <Link href="/data-rights" className="text-gold-600 underline">data-rights page</Link>.</p>
      </Card>
    )
  }
  if (result.status === 'expired') {
    return (
      <Card title="Link expired">
        <p>This link expired (24-hour limit). Submit a new request from the <Link href="/data-rights" className="text-gold-600 underline">data-rights page</Link>.</p>
      </Card>
    )
  }
  if (result.status === 'error') {
    return (
      <Card title="Something went wrong">
        <p>{result.error}. Please try the link again or email <a href="mailto:privacy@basanite.co.uk" className="text-gold-600 underline">privacy@basanite.co.uk</a>.</p>
      </Card>
    )
  }
  if (result.status === 'pending') {
    return (
      <Card title="Request received">
        <p>Your <strong>{prettyType(result.request_type)}</strong> request has been verified and is being processed by our team. We respond within 30 days.</p>
      </Card>
    )
  }
  // completed
  if (result.request_type === 'export' && result.download_url) {
    return (
      <Card title="Your data is ready">
        <p>Click below to download a JSON file containing the personal data we hold on you. The link is valid for 1 hour.</p>
        <a
          href={result.download_url}
          className="inline-block mt-4 bg-basanite-900 hover:bg-gold-600 text-white text-sm font-medium px-5 py-2.5 transition-colors"
        >
          Download my data
        </a>
      </Card>
    )
  }
  if (result.request_type === 'erasure') {
    return (
      <Card title="Your data has been deleted">
        <p>Your assessments, recordings, transcripts, scores, and reports have been queued for deletion. The cleanup completes within 30 days; consent records and the audit trail of this request are retained for legal defence as required by law.</p>
      </Card>
    )
  }
  if (result.request_type === 'objection') {
    return (
      <Card title="Objection registered">
        <p>Your future assessments will be flagged so the hirer must apply human review before relying on any automated score.</p>
      </Card>
    )
  }
  return (
    <Card title="Request actioned">
      <p>Your <strong>{prettyType(result.request_type)}</strong> request has been actioned.</p>
    </Card>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-earth-200 p-8">
      <h1 className="font-display text-2xl text-basanite-900 mb-3">{title}</h1>
      <div className="text-sm text-basanite-700 leading-relaxed">{children}</div>
    </div>
  )
}

function prettyType(t: string): string {
  return t.replace(/^./, c => c.toUpperCase())
}
