'use client'

// Public, self-serve GDPR data-rights page. A candidate (or any data
// subject) submits their email and a request type (export / erasure /
// objection / rectification / restriction). We mint a verification token
// and email it; only after the user clicks the link do we action the
// request. This stops third parties from triggering deletions for
// someone else's email.

import { useState } from 'react'
import Link from 'next/link'
import { LogoMark } from '@/components/Logo'
import { LegalFooter } from '@/components/LegalFooter'

type RequestType = 'export' | 'erasure' | 'objection' | 'rectification' | 'restriction'

const REQUEST_TYPES: Array<{ key: RequestType; title: string; description: string }> = [
  { key: 'export', title: 'Export my data', description: 'Receive a structured JSON file with everything we hold about you.' },
  { key: 'erasure', title: 'Erase my data', description: 'Delete your assessments, recordings, transcripts, and reports.' },
  { key: 'objection', title: 'Object to automated decisions', description: 'Flag any future or current assessment so the hirer must apply human review.' },
  { key: 'rectification', title: 'Correct my data', description: 'Update inaccurate personal information.' },
  { key: 'restriction', title: 'Restrict processing', description: 'Pause use of your data while a dispute is resolved.' },
]

export default function DataRightsPage() {
  const [type, setType] = useState<RequestType>('export')
  const [email, setEmail] = useState('')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/data-rights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, email, details }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Failed (${res.status})`)
      }
      setDone(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-earth-50 flex flex-col">
      <header className="border-b border-earth-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={24} dark />
            <span className="font-semibold text-basanite-900 text-sm">Basanite</span>
          </Link>
          <Link href="/dashboard" className="text-xs text-basanite-500 hover:text-basanite-900 transition-colors">
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-6 py-12 text-basanite-800 w-full">
        <p className="text-xs text-basanite-500 mb-2">
          <Link href="/privacy" className="hover:underline">← Privacy notice</Link>
        </p>
        <h1 className="font-display text-3xl text-basanite-900 mb-2">Your data rights</h1>
        <p className="text-sm text-basanite-500 mb-10">
          Under the UK GDPR you can ask us to access, delete, correct, or restrict the personal data we hold about you. We respond within 30 days.
        </p>

        {done ? (
          <div className="bg-white border border-emerald-300 p-8">
            <h2 className="font-display text-xl text-basanite-900 mb-2">Check your email</h2>
            <p className="text-sm text-basanite-700 leading-relaxed">
              We&apos;ve sent a verification link to <strong>{email}</strong>. Click the link to confirm the request.
              The link expires in 24 hours. If you didn&apos;t expect this email, you can safely ignore it — nothing happens until you verify.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-8">
            <div>
              <h2 className="font-display text-base text-basanite-900 mb-3">Choose a request</h2>
              <div className="space-y-2">
                {REQUEST_TYPES.map(t => (
                  <label
                    key={t.key}
                    className={
                      'flex items-start gap-3 p-4 border cursor-pointer transition-colors ' +
                      (type === t.key ? 'border-gold-500 bg-gold-500/5' : 'border-earth-200 bg-white hover:border-earth-300')
                    }
                  >
                    <input
                      type="radio"
                      name="type"
                      value={t.key}
                      checked={type === t.key}
                      onChange={() => setType(t.key)}
                      className="mt-1 accent-gold-600"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-basanite-900">{t.title}</p>
                      <p className="text-xs text-basanite-500 mt-0.5">{t.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-basanite-700 mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="The email tied to your assessments"
                className="w-full border border-earth-200 bg-white px-3 py-2.5 text-sm text-basanite-900 placeholder-basanite-400 focus:outline-none focus:border-gold-500 transition-colors"
              />
              <p className="text-xs text-basanite-500 mt-1.5">
                We&apos;ll send a verification link to this address. Only the matching email&apos;s data will be exported / deleted.
              </p>
            </div>

            {(type === 'rectification' || type === 'restriction' || type === 'objection') && (
              <div>
                <label className="block text-xs font-medium text-basanite-700 mb-1.5 uppercase tracking-wide">
                  Details {type === 'rectification' && <span className="text-red-600">*</span>}
                </label>
                <textarea
                  required={type === 'rectification'}
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  placeholder={
                    type === 'rectification'
                      ? 'What needs to be corrected and what should it say?'
                      : 'Optional context to help us action this faster.'
                  }
                  rows={4}
                  className="w-full border border-earth-200 bg-white px-3 py-2.5 text-sm text-basanite-900 placeholder-basanite-400 focus:outline-none focus:border-gold-500 transition-colors"
                />
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !email}
              className="bg-basanite-900 hover:bg-gold-600 text-white text-sm font-medium px-6 py-3 transition-colors disabled:opacity-40"
            >
              {submitting ? 'Submitting…' : 'Submit request'}
            </button>

            <p className="text-xs text-basanite-500">
              Prefer email? Send your request to{' '}
              <a href="mailto:privacy@basanite.co.uk" className="text-gold-600 underline">privacy@basanite.co.uk</a>.
            </p>
          </form>
        )}
      </main>

      <div className="max-w-3xl mx-auto w-full px-6">
        <LegalFooter />
      </div>
    </div>
  )
}
