'use client'

// "Having issues?" control shown during the live interview. A small, low-key
// pill sits at the bottom-left of the interview screen; clicking it opens a
// modal where the candidate picks a category and (optionally) describes the
// problem. Submitting POSTs to /api/assess/[token]/report-issue, which lands
// the report on the admin dashboard. Designed to overlay VoiceInterview's
// fixed full-screen UI without touching its internals.

import { useState } from 'react'

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'audio_mic', label: "My microphone isn't working" },
  { value: 'cant_hear', label: "I can't hear the interviewer" },
  { value: 'no_response', label: 'The interviewer is not responding' },
  { value: 'frozen', label: 'The page froze or crashed' },
  { value: 'connection', label: 'My connection keeps dropping' },
  { value: 'other', label: 'Something else' },
]

export default function IssueReporter({
  token,
  assessmentId,
}: {
  token: string
  assessmentId: string | null
}) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  function reset() {
    setCategory('')
    setMessage('')
    setError('')
    setDone(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!category) {
      setError('Please choose what went wrong.')
      return
    }
    if (category === 'other' && !message.trim()) {
      setError('Please describe the issue.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/assess/${token}/report-issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          message: message.trim(),
          assessment_id: assessmentId,
          page: 'interview',
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Could not submit report.')
      }
      setDone(true)
    } catch (err: any) {
      setError(err.message ?? 'Could not submit report.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Trigger pill, bottom-left so it clears the header's End button. */}
      <button
        type="button"
        onClick={() => { reset(); setOpen(true) }}
        className="fixed bottom-5 left-5 z-50 flex items-center gap-2 rounded-full bg-basanite-900/80 hover:bg-basanite-800 border border-earth-200/20 backdrop-blur px-4 py-2 text-xs font-medium text-earth-100 shadow-lg transition-colors"
        aria-label="Report a problem with the interview"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        Having issues?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Report a problem"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white text-basanite-900 border border-earth-200 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            {done ? (
              <div className="p-6 text-center">
                <div className="mx-auto mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-green-100">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <h2 className="font-display text-lg mb-1">Thanks, we&rsquo;ve logged it</h2>
                <p className="text-sm text-basanite-500 mb-5">
                  Our team can see your report. If the interview is still working, you can carry on.
                </p>
                <button
                  onClick={() => setOpen(false)}
                  className="bg-basanite-900 hover:bg-gold-600 text-white text-sm font-medium px-5 py-2 transition-colors"
                >
                  Back to interview
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="p-6">
                <div className="flex items-start justify-between mb-1">
                  <h2 className="font-display text-lg">Report a problem</h2>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-basanite-400 hover:text-basanite-700 text-sm"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-sm text-basanite-500 mb-4">
                  Tell us what&rsquo;s going wrong and we&rsquo;ll look into it. Your interview keeps running.
                </p>

                {error && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 mb-4">{error}</p>
                )}

                <label className="block text-xs font-medium text-basanite-600 uppercase tracking-wide mb-1.5">
                  What went wrong?
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full border border-earth-300 bg-white px-3 py-2.5 text-sm text-basanite-900 outline-none focus:border-gold-500 mb-4"
                >
                  <option value="">Select an option…</option>
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>

                <label className="block text-xs font-medium text-basanite-600 uppercase tracking-wide mb-1.5">
                  Details {category === 'other' ? '' : '(optional)'}
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Anything that helps us understand the problem…"
                  className="w-full border border-earth-300 bg-white px-3 py-2.5 text-sm text-basanite-900 placeholder-basanite-400 outline-none focus:border-gold-500 resize-y mb-5"
                />

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-basanite-500 hover:text-basanite-800 text-sm font-medium px-4 py-2 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-basanite-900 hover:bg-gold-600 text-white text-sm font-medium px-5 py-2 transition-colors disabled:opacity-60"
                  >
                    {submitting ? 'Sending…' : 'Send report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
