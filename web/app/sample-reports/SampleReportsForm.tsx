'use client'

import { useEffect, useRef, useState } from 'react'

// When the real reports are ready, replace the two files at these public paths.
// No code change is needed, the portal already serves them from here.
const SAMPLE_REPORTS: { href: string; label: string; sub: string }[] = [
  {
    href: '/samples/sample-hirer-report.pdf',
    label: 'Sample hirer report',
    sub: 'Dimension-by-dimension scores grounded in candidate quotes.',
  },
  {
    href: '/samples/sample-candidate-report.pdf',
    label: 'Sample candidate report',
    sub: 'The honest, personalised feedback every candidate receives.',
  },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const inputClass =
  'w-full border border-basanite-400 px-3.5 py-2.5 text-basanite-900 bg-white ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-600 focus-visible:ring-offset-1 ' +
  'focus-visible:border-gold-600 transition-colors'

const focusRing =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-600 focus-visible:ring-offset-2'

export function SampleReportsForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [state, setState] = useState<'idle' | 'submitting' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [invalid, setInvalid] = useState<'name' | 'email' | null>(null)

  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Move focus to the success heading so keyboard / screen-reader users land on
  // the new content (the submit button they pressed no longer exists).
  useEffect(() => {
    if (state === 'done') headingRef.current?.focus()
  }, [state])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInvalid(null)
    if (!name.trim()) {
      setError('Please enter your name.')
      setInvalid('name')
      nameRef.current?.focus()
      return
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError('Please enter a valid work email.')
      setInvalid('email')
      emailRef.current?.focus()
      return
    }

    setState('submitting')
    try {
      const res = await fetch('/api/sample-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          company: company.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setState('idle')
        return setError(data?.error || 'Something went wrong. Please try again.')
      }
      setState('done')
    } catch {
      setState('idle')
      setError('Network error. Please try again.')
    }
  }

  if (state === 'done') {
    return (
      <div role="status" aria-live="polite" className="border border-basanite-400 bg-white p-8 sm:p-10">
        <p className="text-gold-700 text-[11px] font-semibold uppercase tracking-[0.25em] mb-3">
          You&rsquo;re in
        </p>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-2xl sm:text-3xl text-basanite-900 mb-3 focus:outline-none"
        >
          Thanks, {name.split(' ')[0] || 'there'} &mdash; here are your sample reports
        </h2>
        <p className="text-basanite-600 text-sm mb-8">
          Open the hirer and candidate reports below. We&rsquo;ve also noted your interest and
          will be in touch.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {SAMPLE_REPORTS.map(r => (
            <a
              key={r.href}
              href={r.href}
              target="_blank"
              rel="noreferrer"
              download
              className={`group block border border-basanite-400 p-5 hover:border-basanite-900 hover:bg-earth-50 transition-colors ${focusRing}`}
            >
              <span className="font-display text-lg text-basanite-900 group-hover:text-gold-700 transition-colors">
                {r.label} (PDF) &rarr;
                <span className="sr-only"> opens in a new tab</span>
              </span>
              <p className="text-basanite-600 text-sm mt-1">{r.sub}</p>
            </a>
          ))}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="border border-basanite-400 bg-white p-8 sm:p-10 space-y-5" noValidate>
      <div>
        <label htmlFor="sr-name" className="block text-sm font-medium text-basanite-700 mb-1.5">
          Name
        </label>
        <input
          id="sr-name"
          ref={nameRef}
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          autoComplete="name"
          required
          aria-invalid={invalid === 'name'}
          aria-describedby={invalid === 'name' ? 'sr-error' : undefined}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="sr-email" className="block text-sm font-medium text-basanite-700 mb-1.5">
          Work email
        </label>
        <input
          id="sr-email"
          ref={emailRef}
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          required
          aria-invalid={invalid === 'email'}
          aria-describedby={invalid === 'email' ? 'sr-error' : undefined}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="sr-company" className="block text-sm font-medium text-basanite-700 mb-1.5">
          Company <span className="text-basanite-500 font-normal">(optional)</span>
        </label>
        <input
          id="sr-company"
          type="text"
          value={company}
          onChange={e => setCompany(e.target.value)}
          autoComplete="organization"
          className={inputClass}
        />
      </div>

      {error && (
        <p id="sr-error" role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={state === 'submitting'}
        className={`w-full px-6 py-3 bg-basanite-900 hover:bg-gold-600 disabled:opacity-60 disabled:hover:bg-basanite-900 text-earth-50 font-semibold text-sm tracking-wide transition-colors duration-200 ${focusRing}`}
      >
        {state === 'submitting' ? 'Sending…' : 'Send me the sample reports'}
      </button>
      <p className="text-xs text-basanite-500">
        We&rsquo;ll only use your details to share the reports and follow up. No spam.
      </p>
    </form>
  )
}
