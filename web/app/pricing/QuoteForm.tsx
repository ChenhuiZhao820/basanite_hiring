'use client'

import { useEffect, useRef, useState } from 'react'

const BOOK_A_CALL_URL = 'https://cal.eu/basanite/intro'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ROLES_OPTIONS = ['1–3', '4–10', '11–25', '25+']
const TIMELINE_OPTIONS = ['Hiring now', 'Next quarter', 'Just exploring']

const fieldClass =
  'w-full border border-basanite-400 px-3.5 py-2.5 text-basanite-900 bg-white ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-600 focus-visible:ring-offset-1 ' +
  'focus-visible:border-gold-600 transition-colors'

const focusRing =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-600 focus-visible:ring-offset-2'

export function QuoteForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [rolesPerYear, setRolesPerYear] = useState('')
  const [timeline, setTimeline] = useState('')
  const [state, setState] = useState<'idle' | 'submitting' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [invalid, setInvalid] = useState<'name' | 'email' | null>(null)

  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (state === 'done') headingRef.current?.focus()
  }, [state])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'submitting') return
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
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          company: company.trim() || undefined,
          rolesPerYear: rolesPerYear || undefined,
          timeline: timeline || undefined,
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
      <div className="border border-basanite-400 bg-white p-8 sm:p-10">
        <p className="text-gold-700 text-[11px] font-semibold uppercase tracking-[0.25em] mb-3">Request received</p>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-2xl sm:text-3xl text-basanite-900 mb-3 focus:outline-none"
        >
          Thanks, {name.split(' ')[0] || 'there'}. We&rsquo;ll put a quote together
        </h2>
        <p className="text-basanite-600 text-sm mb-6">
          We&rsquo;ll email you shortly with pricing for your volume and role mix. Want to talk it
          through sooner?
        </p>
        <a
          href={BOOK_A_CALL_URL}
          target="_blank"
          rel="noreferrer"
          className={`inline-block px-6 py-3 bg-basanite-900 text-earth-50 text-sm font-semibold hover:bg-gold-600 transition-colors ${focusRing}`}
        >
          Book a call now
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="border border-basanite-400 bg-white p-8 sm:p-10 space-y-5" noValidate>
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="q-name" className="block text-sm font-medium text-basanite-700 mb-1.5">Name</label>
          <input
            id="q-name"
            ref={nameRef}
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); if (invalid === 'name') { setInvalid(null); setError(null) } }}
            autoComplete="name"
            required
            aria-invalid={invalid === 'name'}
            aria-describedby={invalid === 'name' ? 'q-error' : undefined}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="q-email" className="block text-sm font-medium text-basanite-700 mb-1.5">Work email</label>
          <input
            id="q-email"
            ref={emailRef}
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); if (invalid === 'email') { setInvalid(null); setError(null) } }}
            autoComplete="email"
            required
            aria-invalid={invalid === 'email'}
            aria-describedby={invalid === 'email' ? 'q-error' : undefined}
            className={fieldClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor="q-company" className="block text-sm font-medium text-basanite-700 mb-1.5">Company</label>
        <input
          id="q-company"
          type="text"
          value={company}
          onChange={e => setCompany(e.target.value)}
          autoComplete="organization"
          className={fieldClass}
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="q-roles" className="block text-sm font-medium text-basanite-700 mb-1.5">
            Roles per year <span className="text-basanite-500 font-normal">(optional)</span>
          </label>
          <select
            id="q-roles"
            value={rolesPerYear}
            onChange={e => setRolesPerYear(e.target.value)}
            className={fieldClass}
          >
            <option value="">Select…</option>
            {ROLES_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="q-timeline" className="block text-sm font-medium text-basanite-700 mb-1.5">
            Timeline <span className="text-basanite-500 font-normal">(optional)</span>
          </label>
          <select
            id="q-timeline"
            value={timeline}
            onChange={e => setTimeline(e.target.value)}
            className={fieldClass}
          >
            <option value="">Select…</option>
            {TIMELINE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      <p id="q-error" role="alert" aria-live="assertive" className="min-h-[1.25rem] text-sm text-red-700">
        {error}
      </p>

      <button
        type="submit"
        disabled={state === 'submitting'}
        className={`w-full px-6 py-3 bg-basanite-900 hover:bg-gold-600 disabled:opacity-60 disabled:hover:bg-basanite-900 text-earth-50 font-semibold text-sm tracking-wide transition-colors duration-200 ${focusRing}`}
      >
        {state === 'submitting' ? 'Sending…' : 'Get a quote'}
      </button>
      <p className="text-sm text-basanite-500 text-center">
        Prefer to talk?{' '}
        <a
          href={BOOK_A_CALL_URL}
          target="_blank"
          rel="noreferrer"
          className="text-gold-700 hover:text-basanite-900 underline underline-offset-4"
        >
          Book a call directly
        </a>
      </p>
    </form>
  )
}
