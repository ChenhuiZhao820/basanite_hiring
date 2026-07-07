'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { LogoMark } from '@/components/Logo'
import { AuthFragmentHandler } from '@/components/AuthFragmentHandler'

const HERO_IMAGE = 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80'

// Single source of truth for the public booking link. Cal.com EU instance
// keeps the booking-PII transfer inside the EU jurisdiction.
const BOOK_A_CALL_URL = 'https://cal.eu/basanite/intro'

// ─── Scroll reveal hook ──────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); obs.disconnect() } },
      { threshold: 0.08 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

// ─── Decorative: Stone texture background ────────────────────────────────
function StoneTexture() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
      </filter>
      <rect width="100%" height="100%" filter="url(#noise)"/>
    </svg>
  )
}

// ─── Nav ─────────────────────────────────────────────────────────────────
function Nav() {
  const [banner, setBanner] = useState<{ kind: 'error' | 'info'; msg: string } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinks: { href: string; label: string }[] = [
    { href: '#how-it-works', label: 'How it works' },
    { href: '/methodology', label: 'Methodology' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/compare', label: 'Comparisons' },
    { href: '/about', label: 'About' },
    { href: '/blog', label: 'Blog' },
    { href: '/faq', label: 'FAQ' },
  ]

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const err = params.get('error')
    const info = params.get('info')
    if (err) setBanner({ kind: 'error', msg: err })
    else if (info) setBanner({ kind: 'info', msg: info })
  }, [])

  function dismiss() {
    setBanner(null)
    const url = new URL(window.location.href)
    url.searchParams.delete('error')
    url.searchParams.delete('info')
    window.history.replaceState({}, '', url.pathname + (url.searchParams.toString() ? '?' + url.searchParams : ''))
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-earth-50/85 backdrop-blur-md border-b border-earth-200/60">
      {banner && (
        <div
          className={
            banner.kind === 'error'
              ? 'bg-red-50 border-b border-red-200 text-red-800'
              : 'bg-amber-50 border-b border-amber-200 text-amber-900'
          }
        >
          <div className="max-w-6xl mx-auto px-6 py-2.5 flex items-center justify-between gap-4 text-sm">
            <span className="flex-1">{banner.msg}</span>
            <div className="flex items-center gap-4 shrink-0">
              <a href="/logout" className="underline font-medium hover:opacity-80">
                Sign out
              </a>
              <button onClick={dismiss} aria-label="Dismiss" className="text-lg leading-none hover:opacity-70">
                &times;
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5">
          <LogoMark size={26} dark />
          <span className="font-display text-basanite-900 text-lg">Basanite</span>
        </a>
        <div className="hidden sm:flex items-center gap-7 text-sm text-basanite-600">
          {navLinks.map(link => (
            <a key={link.href} href={link.href} className="hover:text-basanite-900 transition-colors">
              {link.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <a
            href={BOOK_A_CALL_URL}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-earth-50 bg-basanite-900 px-4 py-2 hover:bg-gold-600 transition-colors duration-200"
          >
            Book a call
          </a>
          <a
            href="/login"
            className="hidden sm:inline-flex text-sm font-medium text-basanite-600 hover:text-basanite-900 transition-colors duration-200"
          >
            Sign in
          </a>
          <button
            type="button"
            onClick={() => setMenuOpen(open => !open)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className="sm:hidden -mr-1 inline-flex items-center justify-center p-2 text-basanite-700 hover:text-basanite-900 transition-colors"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              aria-hidden="true"
            >
              {menuOpen ? (
                <>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="6" y1="18" x2="18" y2="6" />
                </>
              ) : (
                <>
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          id="mobile-menu"
          className="sm:hidden border-t border-earth-200/60 bg-earth-50/95 backdrop-blur-md"
        >
          <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col text-base text-basanite-700">
            {navLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="py-2.5 border-b border-earth-200/40 last:border-0 hover:text-basanite-900 transition-colors"
              >
                {link.label}
              </a>
            ))}
            <a
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="py-2.5 font-medium hover:text-basanite-900 transition-colors"
            >
              Sign in
            </a>
          </div>
        </div>
      )}
    </nav>
  )
}

// ─── Hero (original full-bleed) ─────────────────────────────────────────
function Hero() {
  return (
    <section className="pt-16 min-h-screen flex flex-col">
      <div className="relative w-full flex-1 overflow-hidden">
        <Image
          src={HERO_IMAGE}
          alt="Tactile surface evocative of a basanite touchstone"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-basanite-950/70" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <svg width="40" height="54" viewBox="0 0 40 54" fill="none" aria-hidden="true" className="mb-8">
            <path d="M20 0 L0 18 L20 18 Z" fill="#e8c555" />
            <path d="M20 0 L40 18 L20 18 Z" fill="#d4a843" />
            <path d="M0 18 L20 18 L20 54 Z" fill="#c49a2f" />
            <path d="M40 18 L20 18 L20 54 Z" fill="#a87f24" />
            <path d="M0 18 L40 18" stroke="#1a1a18" strokeOpacity="0.18" strokeWidth="0.5" />
          </svg>
          <p className="text-gold-400 text-[10px] sm:text-xs uppercase tracking-[0.28em] font-semibold mb-6">
            The technical layer of the interview, rebuilt for the AI era
          </p>
          <h1 className="font-display text-earth-50 text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.1] mb-8 max-w-4xl">
            Basanite is your new<br />
            <span className="text-gold-400">first interview round.</span>
          </h1>
          <p className="text-earth-200 text-lg md:text-xl max-w-2xl leading-relaxed mb-10">
            Your current screens can be{' '}
            <strong className="font-semibold text-earth-50">passed with an AI in the other tab</strong>, and none of them measures the thing you&rsquo;re actually hiring for. Basanite interviews your candidates live, adapting in real time, and hands your team an{' '}
            <strong className="font-semibold text-earth-50">evidence-backed briefing</strong>{' '}on each. Your team meet only the shortlist. You still decide.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <a
              href={BOOK_A_CALL_URL}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-8 py-4 bg-gold-500 hover:bg-gold-400 text-white font-semibold text-base tracking-wide transition-colors duration-200"
            >
              Book a call
            </a>
            <a
              href="#demo"
              className="w-full sm:w-auto px-8 py-4 border border-earth-200/50 text-earth-50 hover:border-earth-50 font-semibold text-base tracking-wide transition-colors duration-200"
            >
              Watch the demo
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Social proof: backed & recognised by ────────────────────────────────
const SOCIAL_PROOF: { src: string; alt: string; caption: string; logoClass: string }[] = [
  {
    src: '/logos/yc.svg',
    alt: 'Y Combinator',
    caption: 'Top 10% of S26 applicants',
    logoClass: 'h-9 sm:h-10',
  },
  {
    src: '/logos/redwood-founders.svg',
    alt: 'Redwood Founders',
    caption: 'Backed by Redwood Founders',
    logoClass: 'h-9 sm:h-10',
  },
  {
    src: '/logos/university-of-manchester.png',
    alt: 'The University of Manchester',
    caption: 'Masood Entrepreneurship Centre',
    logoClass: 'h-8 sm:h-9',
  },
  {
    src: '/logos/stripe.svg',
    alt: 'Stripe',
    caption: 'Partnered with Stripe VC',
    logoClass: 'h-7 sm:h-8',
  },
]

function SocialProof() {
  return (
    <section
      aria-label="Backed and recognised by Y Combinator, Redwood Founders, the University of Manchester Masood Entrepreneurship Centre, and Stripe"
      className="bg-white border-b border-earth-200/80 py-12"
    >
      <div className="max-w-6xl mx-auto px-6">
        <p className="text-center text-basanite-500 text-[11px] font-semibold uppercase tracking-[0.2em] mb-8">
          Backed &amp; recognised by
        </p>
        <div className="flex flex-wrap items-start justify-center gap-x-10 sm:gap-x-16 gap-y-8">
          {SOCIAL_PROOF.map(item => (
            <div key={item.alt} className="flex w-40 flex-col items-center gap-2.5 text-center">
              <div className="flex h-10 items-center">
                <img
                  src={item.src}
                  alt={item.alt}
                  className={`${item.logoClass} w-auto select-none`}
                  draggable={false}
                />
              </div>
              <span className="text-basanite-600 text-xs leading-snug">{item.caption}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Section 1 · Value proposition ──────────────────────────────────────
function ValueProp() {
  const ref = useReveal()
  return (
    <section className="relative py-32 sm:py-40 px-6 bg-basanite-900 overflow-hidden">
      <StoneTexture />
      <div ref={ref} className="reveal relative z-10 max-w-4xl mx-auto">
        <h2 className="font-display text-earth-50 text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.02] tracking-tight">
          Hire engineers 3&times; faster.<br />
          Cut mishires in half.<br />
          <span className="text-gold-400">Defend every decision.</span>
        </h2>
        <p className="text-earth-300/80 text-base sm:text-lg leading-relaxed mt-14 max-w-2xl">
          Basanite replaces 17 interview hours per hire with one signal-dense
          session that measures what coding tests can&rsquo;t: how candidates
          actually think with AI. Every hire comes with a defensible,
          evidence-backed report, and a process you can scale up, scale down,
          or reshape around any role.
        </p>
        <p className="text-earth-400 text-sm sm:text-base mt-5 max-w-2xl">
          For a team hiring 40 engineers a year, that&rsquo;s{' '}
          <span className="font-semibold text-gold-400">
            &pound;400k+ recovered annually.
          </span>
        </p>
        <div className="flex items-center gap-6 mt-12">
          <a
            href="#roi-calculator"
            className="px-6 py-3 bg-gold-500 hover:bg-gold-400 text-white text-sm font-semibold tracking-wide transition-colors duration-200"
          >
            See your savings &rarr;
          </a>
          <a
            href={BOOK_A_CALL_URL}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-earth-300 hover:text-earth-50 underline underline-offset-4 decoration-earth-500/50 font-medium transition-colors duration-200"
          >
            Book a 20-min call
          </a>
        </div>
      </div>
    </section>
  )
}

// ─── Section 2 · The numbers ─────────────────────────────────────────────
const NUMBERS = [
  {
    value: '17 hours',
    desc: 'of senior engineering time saved per hire.',
    caption: 'Replaces the screening + first technical round.',
  },
  {
    value: '30 days',
    desc: 'cut from time-to-hire.',
    caption: 'From 10 weeks to 6, on average.',
  },
  {
    value: '£10–15k',
    desc: 'in mishire risk avoided, per hire.',
    caption:
      "46% of new hires fail in 18 months. 89% of those failures are signals coding tests don't measure.",
  },
  {
    value: '1 report',
    desc: 'behind every hiring decision.',
    caption:
      'Eight dimensions, scored on the same rubric, every time. Defensible to your board, your team, and the candidate.',
  },
]

function NumbersSection() {
  const ref = useReveal()
  return (
    <section className="py-24 sm:py-32 px-6 bg-earth-50">
      <div ref={ref} className="reveal max-w-6xl mx-auto">
        <p className="text-gold-600 text-[11px] font-semibold uppercase tracking-[0.22em] mb-4">
          The impact
        </p>
        <h2 className="font-display text-basanite-900 text-3xl sm:text-4xl md:text-5xl mb-16 leading-[1.15]">
          What you get back
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 md:gap-8">
          {NUMBERS.map((n, i) => (
            <div key={n.value} className="relative pl-6 border-l-2 border-gold-500/50">
              <div className="text-gold-600 text-[10px] font-semibold uppercase tracking-[0.25em] mb-3">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="font-display text-basanite-900 text-3xl sm:text-4xl leading-[1.05] mb-3">
                {n.value}
              </div>
              <p className="text-basanite-700 text-base leading-relaxed">
                {n.desc}
              </p>
              <p className="italic text-basanite-500 text-sm leading-relaxed mt-3">
                {n.caption}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Section 3 · ROI calculator ──────────────────────────────────────────
// Editable value display: shows the formatted figure, turns into a free-type
// field on focus, and commits a clamped value on blur / Enter, so users can
// type a number in directly instead of only dragging the slider.
function ROIValueInput({
  value,
  min,
  max,
  onChange,
  prefix = '',
  ariaLabel,
}: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  prefix?: string
  ariaLabel: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const display = draft ?? value.toLocaleString('en-GB')

  const commit = () => {
    if (draft === null) return
    const digits = draft.replace(/[^0-9]/g, '')
    const next =
      digits === '' ? value : Math.min(max, Math.max(min, Number(digits)))
    onChange(next)
    setDraft(null)
  }

  return (
    <span className="font-display text-2xl text-gold-400 tabular-nums">
      {prefix}
      <input
        type="text"
        inputMode="numeric"
        aria-label={ariaLabel}
        value={display}
        onChange={e => setDraft(e.target.value)}
        onFocus={e => {
          setDraft(value.toString())
          const el = e.currentTarget
          requestAnimationFrame(() => el.select())
        }}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        className="bg-transparent text-right text-gold-400 tabular-nums outline-none border-b border-transparent focus:border-gold-500/50 transition-colors"
        style={{ width: `${Math.max(display.length, 2) + 1}ch` }}
      />
    </span>
  )
}

function ROICalculator() {
  const ref = useReveal()
  const [n, setN] = useState(40)
  const [s, setS] = useState(80000)

  const { recovered, inefficiency } = useMemo(() => {
    const perHire = 15 * 80 + 0.10 * s * 0.5 + 10 * 500
    const rec = n * perHire
    const ineff = rec * 1.5
    const round = (v: number) => Math.round(v / 1000) * 1000
    return { recovered: round(rec), inefficiency: round(ineff) }
  }, [n, s])

  const fmt = (v: number) => `£${v.toLocaleString('en-GB')}`

  return (
    <section
      id="roi-calculator"
      className="relative py-32 sm:py-40 px-6 bg-basanite-900 overflow-hidden scroll-mt-16"
    >
      <StoneTexture />
      <div ref={ref} className="reveal relative z-10 max-w-2xl mx-auto">
        <p className="text-gold-500 text-[11px] font-semibold uppercase tracking-[0.22em] mb-5">
          ROI calculator
        </p>
        <h2 className="font-display text-earth-50 text-4xl sm:text-5xl md:text-6xl mb-16 leading-[1.05]">
          See your number
        </h2>

        <div className="space-y-12">
          <div>
            <div className="flex items-baseline justify-between text-base text-earth-300 mb-4">
              <label htmlFor="roi-engineers">How many engineers do you hire a year?</label>
              <ROIValueInput
                value={n}
                min={1}
                max={200}
                onChange={setN}
                ariaLabel="Engineers hired per year"
              />
            </div>
            <input
              id="roi-engineers"
              type="range"
              min={1}
              max={200}
              step={1}
              value={n}
              onChange={e => setN(Number(e.target.value))}
              className="roi-slider w-full"
            />
            <div className="flex justify-between text-xs text-earth-500 mt-2">
              <span>1</span>
              <span>200</span>
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between text-base text-earth-300 mb-4">
              <label htmlFor="roi-salary">Average base salary (&pound;)?</label>
              <ROIValueInput
                value={s}
                min={25000}
                max={250000}
                onChange={setS}
                prefix="£"
                ariaLabel="Average base salary in pounds"
              />
            </div>
            <input
              id="roi-salary"
              type="range"
              min={25000}
              max={250000}
              step={5000}
              value={s}
              onChange={e => setS(Number(e.target.value))}
              className="roi-slider w-full"
            />
            <div className="flex justify-between text-xs text-earth-500 mt-2">
              <span>&pound;25,000</span>
              <span>&pound;250,000</span>
            </div>
          </div>
        </div>

        <div className="mt-16 p-10 bg-basanite-800/40 border border-earth-300/8">
          <div className="space-y-4 text-earth-200 text-lg sm:text-xl leading-relaxed">
            <p>
              &rarr; You&rsquo;re spending roughly{' '}
              <span className="font-display text-2xl sm:text-3xl text-earth-50">{fmt(inefficiency)}</span>{' '}
              on hiring inefficiency every year.
            </p>
            <p>
              &rarr; Basanite recovers{' '}
              <span className="font-display text-2xl sm:text-3xl text-gold-400">~{fmt(recovered)}</span>{' '}
              of that.
            </p>
          </div>
        </div>

        <p className="italic text-earth-500 text-sm mt-8">
          Math: Ashby 2026, Leadership IQ, SHRM 2025.{' '}
          <a
            href="/methodology#roi-assumptions"
            className="not-italic text-gold-500 hover:text-gold-400 underline underline-offset-4 decoration-gold-500/40 font-medium"
          >
            See the assumptions &rarr;
          </a>
        </p>

        <div className="mt-12">
          <a
            href={BOOK_A_CALL_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-block px-8 py-4 bg-gold-500 hover:bg-gold-400 text-white font-semibold text-base tracking-wide transition-colors duration-200"
          >
            Book a call to walk through your number
          </a>
        </div>
      </div>

      <style jsx>{`
        .roi-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 2px;
          background: #3d3a36;
          border-radius: 1px;
          outline: none;
          cursor: pointer;
        }
        .roi-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #c49a2f;
          border: 2px solid #1a1a18;
          box-shadow: 0 0 0 3px rgba(196, 154, 47, 0.15);
          cursor: grab;
          transition: box-shadow 0.15s ease;
        }
        .roi-slider::-webkit-slider-thumb:hover {
          box-shadow: 0 0 0 6px rgba(196, 154, 47, 0.2);
        }
        .roi-slider::-webkit-slider-thumb:active {
          cursor: grabbing;
          box-shadow: 0 0 0 8px rgba(196, 154, 47, 0.25);
        }
        .roi-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #c49a2f;
          border: 2px solid #1a1a18;
          box-shadow: 0 0 0 3px rgba(196, 154, 47, 0.15);
          cursor: grab;
        }
        .roi-slider::-moz-range-track {
          height: 2px;
          background: #3d3a36;
          border-radius: 1px;
        }
      `}</style>
    </section>
  )
}

// ─── Section 4 · The four levers ─────────────────────────────────────────
const LEVERS: { label: string; body: string }[] = [
  {
    label: 'Time',
    body:
      'One 30-minute session replaces resume screening, phone screen, and first technical interview. Recruiter and engineer hours collapse by 60–70%.',
  },
  {
    label: 'Speed',
    body:
      'Candidates flow through in days, not weeks. You stop losing offers to faster-moving competitors. Every vacancy day costs £500–1,000 in lost output.',
  },
  {
    label: 'Quality',
    body:
      '46% of new hires fail within 18 months (Leadership IQ, n=20,000). 89% of those failures come from attitude, coachability, and judgment — exactly what Basanite measures, and exactly what coding tests miss.',
  },
  {
    label: 'Defensibility',
    body:
      'Every candidate gets scored against the same eight-dimension rubric, with the evidence behind each score traceable to the actual interview. One report your hiring manager, your board, and the candidate can all read.',
  },
]

function FourLevers() {
  const ref = useReveal()
  return (
    <section className="py-24 sm:py-32 px-6 bg-white border-b border-earth-200/80">
      <div ref={ref} className="reveal max-w-3xl mx-auto">
        <p className="text-gold-600 text-[11px] font-semibold uppercase tracking-[0.22em] mb-4">
          The four levers
        </p>
        <h2 className="font-display text-basanite-900 text-3xl sm:text-4xl md:text-5xl mb-14 leading-[1.15]">
          Where the savings come from
        </h2>

        <div className="space-y-10">
          {LEVERS.map((l, i) => (
            <div key={l.label} className="flex gap-6 items-start">
              <span className="shrink-0 font-display text-gold-600 text-sm tracking-widest mt-1.5">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="text-basanite-700 text-base sm:text-lg leading-relaxed">
                <span className="font-semibold text-basanite-900">
                  {l.label}
                </span>{' '}
                &mdash; {l.body}
              </p>
            </div>
          ))}
        </div>

        <div className="border-t border-earth-200/40 mt-16 pt-10" />
        <p className="italic text-basanite-500 text-sm sm:text-base leading-relaxed pl-12">
          And it bends to your role, not the other way around. Custom
          dimensions, custom rubrics, custom workbench tasks &mdash; for
          engineering, data, ML, security, or wherever you take it next.
        </p>
      </div>
    </section>
  )
}

// ─── Section 5 · What we measure ─────────────────────────────────────────
const DIMENSION_ROWS: { name: string; question: string }[] = [
  {
    name: 'Problem framing',
    question: 'Can they turn a vague brief into a workable spec?',
  },
  {
    name: 'Context handling',
    question:
      'Do they give the model what it needs — or hope for the best?',
  },
  {
    name: 'Verification',
    question: "Do they check the model’s output, or ship it?",
  },
  {
    name: 'Iteration',
    question: 'When the first answer is wrong, what do they do next?',
  },
  {
    name: 'Tool fluency',
    question: 'Do they know which tool fits which subtask?',
  },
  {
    name: 'Judgment under uncertainty',
    question: 'When the model is confidently wrong, do they catch it?',
  },
  {
    name: 'Coachability',
    question: 'Can they take feedback mid-task and adjust?',
  },
  {
    name: 'Communication',
    question: 'Can they explain what they did and why?',
  },
]

function WhatWeMeasure() {
  const ref = useReveal()
  return (
    <section className="py-24 sm:py-32 px-6 bg-earth-50 border-b border-earth-200/80">
      <div ref={ref} className="reveal max-w-4xl mx-auto">
        <p className="text-gold-600 text-[11px] font-semibold uppercase tracking-[0.22em] mb-4">
          The dimensions
        </p>
        <h2 className="font-display text-basanite-900 text-3xl sm:text-4xl md:text-5xl mb-8 leading-[1.15]">
          We measure how engineers think with AI
        </h2>
        <p className="text-basanite-700 text-base sm:text-lg leading-relaxed mb-4 max-w-3xl">
          Coding tests assume the candidate works alone. That world is gone.{' '}
          <span className="font-semibold text-basanite-900">
            76% of technical candidates now use AI mid-interview.
          </span>{' '}
          The question that predicts on-the-job performance has shifted from
          &ldquo;can they code without it?&rdquo; to &ldquo;how well do they
          think with it?&rdquo;
        </p>
        <p className="text-basanite-700 text-base sm:text-lg mb-12">
          Eight dimensions. One rubric. Defensible scoring.
        </p>

        <div className="bg-basanite-900 text-earth-50 overflow-hidden shadow-[0_20px_60px_-15px_rgba(15,15,14,0.4)]">
          <table className="w-full border-collapse">
            <tbody>
              {DIMENSION_ROWS.map((row, i) => (
                <tr
                  key={row.name}
                  className={
                    i < DIMENSION_ROWS.length - 1
                      ? 'border-b border-basanite-800'
                      : ''
                  }
                >
                  <th
                    scope="row"
                    className="font-display text-gold-400 text-left align-top text-base sm:text-lg font-normal px-5 sm:px-8 py-5 sm:py-6 w-2/5 sm:w-1/3"
                  >
                    {row.name}
                  </th>
                  <td className="text-earth-200 text-sm sm:text-base leading-relaxed px-5 sm:px-8 py-5 sm:py-6">
                    {row.question}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-10">
          <a
            href="/methodology"
            className="text-gold-700 hover:text-gold-600 underline underline-offset-4 decoration-gold-500/60 font-medium text-base sm:text-lg"
          >
            Read the methodology &rarr;
          </a>
        </div>
      </div>
    </section>
  )
}

// ─── Product demo video ─────────────────────────────────────────────────
function DemoVideo() {
  const ref = useReveal()
  return (
    <section
      id="demo"
      ref={ref}
      className="reveal py-20 sm:py-28 px-6 bg-earth-50"
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-gold-600 font-semibold mb-3">
            Watch the demo
          </p>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-basanite-900 leading-[1.15]">
            Four and a half minutes inside Basanite.
          </h2>
        </div>
        <div className="relative aspect-video bg-basanite-950 ring-1 ring-basanite-200/40 shadow-[0_30px_80px_-20px_rgba(15,15,14,0.35)] overflow-hidden">
          {/* Native HTML5 video — same-origin, no third-party player chrome.
              `preload="none"` skips byte-zero fetching until the user clicks
              play; the poster carries first-paint. faststart MOOV atom in the
              MP4 means seek-anywhere playback once buffering begins. */}
          <video
            controls
            preload="none"
            poster="/demo-poster.jpg"
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="/demo.mp4" type="video/mp4" />
            Your browser doesn&apos;t support embedded video. Download the demo:&nbsp;
            <a href="/demo.mp4">demo.mp4</a>
          </video>
        </div>
      </div>
    </section>
  )
}

// ─── How It Works (interactive accordion) ────────────────────────────────
const STAGES = [
  {
    number: '01',
    title: 'Paste your job description',
    summary: 'No formatting needed',
    description: 'Basanite accepts the same JD you would post on LinkedIn or Greenhouse. Our extraction agent pulls out role shape, seniority, and required capability profile.',
    tags: ['Plain text', 'LinkedIn friendly', 'Any format'],
  },
  {
    number: '02',
    title: 'Configure evaluation dimensions',
    summary: 'Eight metacognitive dimensions',
    description: 'The system recommends which dimensions to weight for this role and seniority — calibrated against our Tech-Industry Map of verticals, roles, and bands. You can adjust, add, or remove before going live.',
    tags: ['Judgment', 'Tacit knowledge', 'Human–AI collaboration'],
  },
  {
    number: '03',
    title: 'Share the assessment link',
    summary: 'Candidates take the interview on their time',
    description: 'Candidates receive a link, upload their CV, and enter an adaptive 25–60 minute interview with Basanite. Length is signal-driven, not timer-driven. No scheduling overhead on your side.',
    tags: ['Asynchronous', 'CV upload', 'Mobile friendly'],
  },
  {
    number: '04',
    title: 'Round 1 — Structured Conversational Assessment',
    summary: 'Reveals what the candidate thinks',
    description: "Basanite asks questions grounded in the candidate's own CV, follows up on vagueness, tracks narrative consistency, and probes for genuine depth. This round generates signal across the cognitive, judgmental, and tacit-knowledge dimensions.",
    tags: ['Adaptive', 'Follow-up probes', '20–30 min'],
  },
  {
    number: '05',
    title: 'Round 2 — AI Collaboration Workbench',
    summary: 'Reveals what the candidate does',
    description: "A sandboxed VS Code environment with a role-matched codebase, a real ticket, and the candidate's choice of AI coding agent (Claude Code, Cursor, Copilot, Aider). We test engineers WITH AI rather than against it — the dimension no other interview measures.",
    tags: ['VS Code sandbox', 'Real codebase', 'Any AI agent'],
  },
  {
    number: '06',
    title: 'Review ranked candidates',
    summary: 'Two rounds, one composite report',
    description: 'Each candidate receives dimension scores grounded in specific quotes from Round 1 and observed work patterns from Round 2. You see a ranked queue with a briefing document for the final human interview.',
    tags: ['Ranked', 'Quote-grounded', 'Briefing report'],
  },
]

function HowItWorks() {
  const [active, setActive] = useState<number | null>(0)
  const ref = useReveal()

  return (
    <section id="how-it-works" className="py-24 sm:py-32 px-6 bg-white">
      <div ref={ref} className="reveal max-w-4xl mx-auto">
        <p className="text-gold-600 text-xs font-semibold uppercase tracking-[0.2em] mb-3">The process</p>
        <h2 className="font-display text-basanite-900 text-3xl sm:text-4xl mb-3">How Basanite works</h2>
        <p className="text-basanite-600 text-base mb-16 max-w-xl">
          A two-round assessment: a conversational round that reveals what a candidate thinks, and an AI Collaboration Workbench round that reveals what they actually do.
        </p>

        <div className="relative">
          <div className="absolute left-6 top-6 bottom-6 w-px bg-gold-500/40" aria-hidden="true" />

          <div className="flex flex-col gap-8">
            {STAGES.map((stage, i) => {
              const isOpen = active === i
              return (
                <div key={stage.number} className="relative flex gap-5 sm:gap-8 items-start">
                  <button
                    onClick={() => setActive(isOpen ? null : i)}
                    aria-label={`Toggle step ${stage.number}`}
                    className={`relative z-10 shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-display text-lg transition-all duration-300 ${isOpen ? 'bg-gold-500 text-white border-2 border-gold-500 shadow-[0_0_0_6px_rgba(196,154,47,0.15)]' : 'bg-white text-basanite-900 border-2 border-gold-500/60 hover:border-gold-500'}`}
                  >
                    {stage.number}
                  </button>

                  <button
                    onClick={() => setActive(isOpen ? null : i)}
                    className={`text-left flex-1 bg-white border overflow-hidden transition-shadow duration-200 ${isOpen ? 'border-gold-500/60 shadow-md' : 'border-earth-300/60 hover:border-gold-500/40 hover:shadow-sm'}`}
                  >
                    <div className={`flex items-center justify-between gap-4 px-5 sm:px-7 py-5 ${isOpen ? 'border-b border-earth-200' : ''}`}>
                      <div className="min-w-0">
                        <div className="font-display text-basanite-900 text-lg sm:text-xl">{stage.title}</div>
                        <div className="text-basanite-500 text-xs mt-0.5">{stage.summary}</div>
                      </div>
                      <svg
                        width="14" height="14" viewBox="0 0 12 12" fill="none"
                        className={`transition-transform duration-500 ease-in-out shrink-0 text-basanite-500 ${isOpen ? 'rotate-180' : ''}`}
                      >
                        <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div
                      className="overflow-hidden transition-[max-height,opacity] duration-500 ease-in-out"
                      style={{ maxHeight: isOpen ? '18rem' : '0', opacity: isOpen ? 1 : 0 }}
                    >
                      <div className="px-5 sm:px-7 py-5">
                        <p className="text-basanite-600 text-sm leading-relaxed mb-4">{stage.description}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {stage.tags.map(t => (
                            <span key={t} className="text-xs px-2 py-1 border border-earth-300 text-basanite-600">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-earth-200">
          <p className="text-basanite-600 text-sm mb-3">Want to see what comes out the other end?</p>
          <a
            href="/sample-reports"
            className="inline-flex items-center gap-2 font-display text-lg text-basanite-900 hover:text-gold-700 transition-colors"
          >
            See sample reports
            <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>
    </section>
  )
}

// ─── For Hirers / For Candidates ─────────────────────────────────────────
function ForBoth() {
  const ref = useReveal()
  return (
    <section className="py-24 sm:py-32 px-6 bg-earth-50">
      <div ref={ref} className="reveal max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          <div className="card-hover border border-earth-300/60 bg-white p-8 sm:p-10">
            <p className="text-gold-600 text-xs font-semibold uppercase tracking-[0.2em] mb-4">For hiring teams</p>
            <h3 className="font-display text-basanite-900 text-2xl mb-4">Replace the first three rounds</h3>
            <ul className="space-y-3 text-basanite-600 text-sm leading-relaxed">
              <li className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">&#9670;</span>
                One Basanite deployment replaces 1 to 3 full time recruiters doing screening and first round assessment
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">&#9670;</span>
                Every candidate receives identical assessment quality. The tenth candidate is evaluated as rigorously as the first
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">&#9670;</span>
                Dimension scores grounded in specific candidate quotes, not opaque numbers
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">&#9670;</span>
                Hirer report designed as a briefing document: what to probe further in the final human interview
              </li>
            </ul>
            <a
              href={BOOK_A_CALL_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-8 px-6 py-3 bg-basanite-900 text-earth-50 text-sm font-medium hover:bg-gold-600 transition-colors"
            >
              Book a call
            </a>
          </div>

          <div className="card-hover border border-earth-300/60 bg-white p-8 sm:p-10">
            <p className="text-gold-600 text-xs font-semibold uppercase tracking-[0.2em] mb-4">For candidates</p>
            <h3 className="font-display text-basanite-900 text-2xl mb-4">Be genuinely seen</h3>
            <ul className="space-y-3 text-basanite-600 text-sm leading-relaxed">
              <li className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">&#9670;</span>
                A conversation, not an interrogation. Questions grow organically from your own experience
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">&#9670;</span>
                No trick questions, no expected answers. We are looking for how you actually think, not how well you prepared
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">&#9670;</span>
                Saying &ldquo;I don&rsquo;t know&rdquo; with genuine awareness is treated differently from a confident but hollow answer
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">&#9670;</span>
                You receive a personal feedback report, regardless of outcome
              </li>
            </ul>
            <a href="#how-it-works" className="inline-block mt-8 px-6 py-3 border border-basanite-900 text-basanite-900 text-sm font-medium hover:bg-basanite-900 hover:text-earth-50 transition-colors">
              Learn more
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Team ────────────────────────────────────────────────────────────────
const TEAM = [
  {
    name: 'Aditya Shah',
    role: 'CEO',
    bullets: [
      'Data Analyst and Technology Modeller at Virgin Media O2 (13 month placement)',
      'Serial entrepreneur, previously funded startup in edtech',
      'Computer Science, University of Manchester',
    ],
    img: '/team/aditya.png',
    linkedin: 'https://www.linkedin.com/in/adityashah100/',
  },
  {
    name: 'Drew Robertson',
    role: 'CTO',
    bullets: [
      'SWE Intern at The Trade Desk, Rothschild and Co, Cisco',
      'ICHack26 1st place, Bloomberg Bpuzzled 1st place',
      'Computer Science, University of Manchester',
    ],
    img: '/team/drew.png',
    linkedin: 'https://www.linkedin.com/in/andrewrobertsonamr/',
    x: 'https://x.com/NeoDrewX',
  },
  {
    name: 'Lynn Zhao',
    role: 'CPO',
    bullets: [
      'BSc Artificial Intelligence, University of Manchester',
      'AI Safety Fellowship at BlueDot Impact, OpenAI, Cambridge',
      'UniHack 2025 Digital CleanUp 1st place',
    ],
    img: '/team/lynn.png',
    linkedin: 'https://www.linkedin.com/in/lynn-zhao-59a198292/',
  },
]

function Team() {
  const ref = useReveal()
  return (
    <section id="team" className="py-24 sm:py-32 px-6 bg-white">
      <div ref={ref} className="reveal max-w-6xl mx-auto">
        <div className="mb-14">
          <p className="text-gold-600 text-xs font-semibold uppercase tracking-[0.2em] mb-3">The team</p>
          <h2 className="font-display text-basanite-900 text-3xl sm:text-4xl mb-4">Built by people who have felt the problem</h2>
          <p className="text-basanite-600 max-w-xl leading-relaxed">
            Engineers and AI researchers from Manchester, building the hiring tool we wish existed.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {TEAM.map(member => (
            <div key={member.name} className="card-hover border border-earth-300/60 bg-white flex flex-col">
              <div className="p-7 flex flex-col flex-1">
                <div className="flex items-center gap-4 mb-5">
                  <div className="relative w-14 h-14 rounded-full overflow-hidden bg-earth-200 shrink-0">
                    <Image
                      src={member.img}
                      alt={member.name}
                      fill
                      className="object-cover object-top"
                    />
                  </div>
                  <div>
                    <h3 className="font-display text-basanite-900 text-lg leading-tight">{member.name}</h3>
                    <p className="text-gold-600 text-xs font-semibold uppercase tracking-widest mt-0.5">{member.role}</p>
                  </div>
                </div>
                <ul className="space-y-2 flex-1">
                  {member.bullets.map(b => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-basanite-600">
                      <span className="text-gold-500 shrink-0 mt-px text-xs font-bold">&#9670;</span>
                      {b}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex items-center gap-4">
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-basanite-500 hover:text-gold-600 transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    LinkedIn
                  </a>
                  {member.x && (
                    <a
                      href={member.x}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-basanite-500 hover:text-gold-600 transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      X
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Waitlist CTA (with inline stats recap) ──────────────────────────────
const CTA_STATS = [
  { value: '8', label: 'metacognitive dimensions' },
  { value: '2', label: 'rounds: think + do' },
  { value: '100%', label: 'quote-grounded scores' },
  { value: '3', label: 'screening rounds replaced' },
]

function WaitlistCTA() {
  const ref = useReveal()
  return (
    <section id="request-access" className="relative py-24 sm:py-32 px-6 bg-basanite-900 overflow-hidden">
      <StoneTexture />
      <div ref={ref} className="reveal relative z-10 max-w-3xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 border-y border-earth-300/20 py-8 mb-16">
          {CTA_STATS.map(s => (
            <div key={s.label} className="text-center">
              <div className="font-display text-2xl sm:text-3xl text-earth-50">{s.value}</div>
              <div className="text-earth-300/70 text-[10px] sm:text-xs mt-1 uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="max-w-xl mx-auto text-center">
          <h2 className="font-display text-earth-50 text-3xl sm:text-4xl md:text-5xl mb-6">
            Ready to test what matters?
          </h2>
          <p className="text-earth-300 text-lg mb-10 leading-relaxed">
            Get early access for your team. Book a 20-minute intro call and we&rsquo;ll walk you through the platform live.
          </p>

          <a
            href={BOOK_A_CALL_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-block px-10 py-4 bg-gold-500 hover:bg-gold-400 text-white font-semibold text-base tracking-wide transition-colors duration-200"
          >
            Book a call
          </a>

          <p className="text-xs text-earth-300/70 mt-8">
            Already have access? <a href="/login" className="text-gold-400 hover:text-gold-300 underline">Sign in</a>
            <span className="mx-2 text-earth-300/40">·</span>
            More questions first? <a href="/faq" className="text-gold-400 hover:text-gold-300 underline">See the FAQ</a>.
          </p>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ──────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="py-10 px-6 bg-basanite-950 border-t border-basanite-800">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <LogoMark size={22} />
            <span className="text-earth-300 text-sm font-display">Basanite</span>
          </div>
          <p className="text-basanite-500 text-xs text-center sm:text-right">
            Built in Manchester by Drew, Lynn and Aditya.
            <br className="sm:hidden" />
            <span className="hidden sm:inline"> &middot; </span>
            &copy; {new Date().getFullYear()} Basanite.
          </p>
        </div>
        <div className="border-t border-basanite-800 mt-6 pt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-basanite-500">
          <a href="/about" className="hover:text-earth-200">About</a>
          <span className="text-basanite-700">·</span>
          <a href="/contact" className="hover:text-earth-200">Contact</a>
          <span className="text-basanite-700">·</span>
          <a href="/pricing" className="hover:text-earth-200">Pricing</a>
          <span className="text-basanite-700">·</span>
          <a href="/blog" className="hover:text-earth-200">Blog</a>
          <span className="text-basanite-700">·</span>
          <a href="/faq" className="hover:text-earth-200">FAQ</a>
          <span className="text-basanite-700">·</span>
          <a href="/privacy" className="hover:text-earth-200">Privacy</a>
          <span className="text-basanite-700">·</span>
          <a href="/terms" className="hover:text-earth-200">Terms</a>
          <span className="text-basanite-700">·</span>
          <a href="/legal/subprocessors" className="hover:text-earth-200">Sub-processors</a>
          <span className="text-basanite-700">·</span>
          <a href="/data-rights" className="hover:text-earth-200">Your data rights</a>
        </div>
        <div className="border-t border-basanite-800 mt-4 pt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-basanite-600">
          <span className="text-basanite-500">Compare:</span>
          <a href="/compare/hackerrank-vs-basanite" className="hover:text-earth-200">vs HackerRank</a>
          <span className="text-basanite-700">·</span>
          <a href="/compare/hirevue-vs-basanite" className="hover:text-earth-200">vs HireVue</a>
          <span className="text-basanite-700">·</span>
          <a href="/compare/karat-vs-basanite" className="hover:text-earth-200">vs Karat</a>
          <span className="text-basanite-700">·</span>
          <a href="/compare/codesignal-vs-basanite" className="hover:text-earth-200">vs CodeSignal</a>
          <span className="text-basanite-700">·</span>
          <a href="/alternatives/hackerrank" className="hover:text-earth-200">HackerRank alternatives</a>
          <span className="text-basanite-700">·</span>
          <a href="/alternatives/hirevue" className="hover:text-earth-200">HireVue alternatives</a>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <>
      {/* Catches Supabase auth tokens left in the URL fragment by admin-
          generated magic / invite / recovery links (Supabase strips the
          intended redirect_to back to the bare Site URL, so they land
          here). Persists the session and routes the user onward. */}
      <AuthFragmentHandler />
      <Nav />
      <Hero />
      <SocialProof />
      <ValueProp />
      <NumbersSection />
      <ROICalculator />
      <FourLevers />
      <WhatWeMeasure />
      <DemoVideo />
      <HowItWorks />
      <ForBoth />
      <Team />
      <WaitlistCTA />
      <Footer />
    </>
  )
}
