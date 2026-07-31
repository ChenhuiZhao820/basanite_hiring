'use client'

import { useState, type FormEvent } from 'react'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[+\d][\d\s().-]{4,24}$/

type Status = 'idle' | 'submitting' | 'success' | 'error'
type Persona = 'hirer' | 'interviewer' | 'candidate'

const PERSONAS: { value: Persona; label: string; hint: string }[] = [
  { value: 'hirer', label: 'I hire people', hint: 'Founder, hiring manager, recruiter' },
  { value: 'interviewer', label: 'I interview people', hint: 'Engineer running technical rounds' },
  { value: 'candidate', label: "I'm a candidate", hint: 'Looking for my next role' },
]

const REFERRAL_SOURCES = [
  'Search',
  'LinkedIn',
  'X / Twitter',
  'Word of mouth',
  'Event or meetup',
  'Blog or article',
  'Other',
]

// Register-interest form for the /register-interest page. Posts to the
// existing /api/waitlist endpoint (rate-limited, service-role insert into the
// waitlist table). Styled for the dark basanite-900 backdrop it sits on.
//
// Kept deliberately low-effort: only name, email and "who are you" are
// required, and both choice questions are one-tap pills rather than
// dropdowns. Everything else is optional and marked as such.
export function InterestForm() {
  const [persona, setPersona] = useState<Persona | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')
  const [referralSource, setReferralSource] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (status === 'submitting') return

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()
    if (!persona) {
      setStatus('error')
      setError('Please tell us which of the three best describes you.')
      return
    }
    if (!trimmedName) {
      setStatus('error')
      setError('Please tell us your name.')
      return
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      setStatus('error')
      setError('Please enter a valid email address.')
      return
    }
    if (trimmedPhone && !PHONE_RE.test(trimmedPhone)) {
      setStatus('error')
      setError('That phone number doesn\u2019t look right \u2014 or leave it blank.')
      return
    }

    setStatus('submitting')
    setError('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          company: company.trim(),
          phone: trimmedPhone,
          referral_source: referralSource,
          persona,
        }),
      })
      if (res.ok) {
        setStatus('success')
        return
      }
      const body = await res.json().catch(() => null)
      setStatus('error')
      setError(body?.error ?? 'Something went wrong. Please try again.')
    } catch {
      setStatus('error')
      setError('Something went wrong. Please check your connection and try again.')
    }
  }

  if (status === 'success') {
    return (
      <div role="status" className="border border-gold-500/40 bg-basanite-800/60 px-8 py-10 text-center">
        <p className="font-display text-earth-50 text-2xl mb-3">You&rsquo;re on the list</p>
        <p className="text-earth-300 text-sm leading-relaxed">
          Thanks for registering your interest. We&rsquo;ll be in touch at{' '}
          <span className="text-gold-400">{email.trim().toLowerCase()}</span> as access opens up.
        </p>
      </div>
    )
  }

  const inputClass =
    'w-full bg-basanite-800/70 border border-basanite-700 px-4 py-3 text-sm text-earth-50 placeholder:text-basanite-400 focus:outline-none focus:border-gold-500 transition-colors'

  return (
    <form onSubmit={handleSubmit} noValidate className="text-left">
      {/* 1 — who they are: one tap, drives everything else */}
      <fieldset className="mb-6">
        <legend className="text-earth-200 text-sm font-medium mb-3">
          Which best describes you?
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Which best describes you?">
          {PERSONAS.map(p => {
            const selected = persona === p.value
            return (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setPersona(p.value)}
                className={`px-4 py-3 border text-left transition-colors ${
                  selected
                    ? 'border-gold-500 bg-gold-500/10'
                    : 'border-basanite-700 bg-basanite-800/70 hover:border-basanite-500'
                }`}
              >
                <span className={`block text-sm font-semibold ${selected ? 'text-gold-400' : 'text-earth-50'}`}>
                  {p.label}
                </span>
                <span className="block text-xs text-basanite-400 mt-0.5">{p.hint}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* 2 — the two required fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <label className="block">
          <span className="sr-only">Name</span>
          <input
            type="text"
            name="name"
            autoComplete="name"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={200}
            required
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="sr-only">Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder={persona === 'candidate' ? 'Email' : 'Work email'}
            value={email}
            onChange={e => setEmail(e.target.value)}
            maxLength={320}
            required
            className={inputClass}
          />
        </label>
      </div>

      {/* 3 — optional extras, one row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <label className="block">
          <span className="sr-only">Phone (optional)</span>
          <input
            type="tel"
            name="phone"
            autoComplete="tel"
            placeholder="Phone (optional)"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            maxLength={25}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="sr-only">Company (optional)</span>
          <input
            type="text"
            name="company"
            autoComplete="organization"
            placeholder="Company (optional)"
            value={company}
            onChange={e => setCompany(e.target.value)}
            maxLength={200}
            className={inputClass}
          />
        </label>
      </div>

      {/* 4 — how they heard about us: optional, one tap, tap again to clear */}
      <fieldset className="mb-6">
        <legend className="text-earth-200 text-sm font-medium mb-3">
          How did you hear about us? <span className="text-basanite-400 font-normal">(optional)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {REFERRAL_SOURCES.map(source => {
            const selected = referralSource === source
            return (
              <button
                key={source}
                type="button"
                aria-pressed={selected}
                onClick={() => setReferralSource(selected ? '' : source)}
                className={`px-3.5 py-2 border text-xs font-medium transition-colors ${
                  selected
                    ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                    : 'border-basanite-700 bg-basanite-800/70 text-earth-200 hover:border-basanite-500'
                }`}
              >
                {source}
              </button>
            )
          })}
        </div>
      </fieldset>

      {status === 'error' && error && (
        <p role="alert" className="text-red-300 text-sm mb-4">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full px-10 py-4 bg-gold-500 hover:bg-gold-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-base tracking-wide transition-colors duration-200"
      >
        {status === 'submitting' ? 'Registering…' : 'Register interest'}
      </button>
      <p className="text-xs text-basanite-400 mt-3 text-center">
        Takes about 20 seconds. We only use this to get in touch about access.
      </p>
    </form>
  )
}
