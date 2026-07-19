'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { LogoMark } from '@/components/Logo'
import { AuthFragmentHandler } from '@/components/AuthFragmentHandler'
import { DimensionsRadar } from '@/components/DimensionsRadar'
import { HowItWorksSlider } from '@/components/HowItWorksSlider'
import { StoneTexture } from '@/components/StoneTexture'
import { SavingsFlow } from '@/components/SavingsFlow'

const HERO_IMAGE = '/hero-2.png'

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
          alt="Business professionals moving through a bright glass-walled office lobby"
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
          <h1 className="font-display text-earth-50 text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.1] mb-8 max-w-4xl">
            Hire with confidence.<br />
            <span className="text-gold-400">Know your candidates better.</span>
          </h1>
          <p className="text-earth-200 text-lg md:text-xl max-w-2xl leading-relaxed mb-10">
            AI-augmented interviews for more informed hiring, faster time to hire, and better candidate understanding.
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
    logoClass: 'h-6 sm:h-7',
  },
  {
    src: '/logos/redwood-founders.svg',
    alt: 'Redwood Founders',
    caption: 'Backed by Redwood Founders',
    logoClass: 'h-6 sm:h-7',
  },
  {
    src: '/logos/university-of-manchester.png',
    alt: 'The University of Manchester',
    caption: 'Masood Entrepreneurship Centre',
    logoClass: 'h-5 sm:h-6',
  },
  {
    src: '/logos/stripe.svg',
    alt: 'Stripe',
    caption: 'Partnered with Stripe VC',
    logoClass: 'h-5 sm:h-6',
  },
]

// ─── What is Basanite · animated process flow + social proof ─────────────
// The "Backed & recognised by" logos (SOCIAL_PROOF above) are rendered at
// the foot of this same section rather than in a standalone band.
// The visualization leads: today's typical process draws itself first,
// then the three early rounds are swapped out for a single gold Basanite
// interview node while the rest of the pipeline closes the gap. The copy
// comes after the chart.
const FLOW_CAPTION_RED_BROWN = '#c98a6b'

const EARLY_ROUNDS = [
  { label: 'Phone screen', caption: 'rehearsable', delay: 0 },
  { label: 'Coding test', caption: 'AI passes it', delay: 200 },
  { label: 'First tech interview', caption: 'wrong signal', delay: 400 },
]

function FlowArrow({ delay }: { delay: number }) {
  return (
    <span
      aria-hidden="true"
      className="flow-item text-basanite-300 text-2xl select-none rotate-90 py-1.5 min-[880px]:rotate-0 min-[880px]:py-0 min-[880px]:self-start min-[880px]:pt-4 min-[880px]:px-3"
      style={{ ['--d' as string]: `${delay}ms` }}
    >
      &rarr;
    </span>
  )
}

function FlowNode({ label, caption, dim, delay }: { label: string; caption?: string; dim?: boolean; delay: number }) {
  return (
    <div className="flow-item flex flex-col items-center gap-2" style={{ ['--d' as string]: `${delay}ms` }}>
      <div
        className={`border px-6 py-3.5 text-lg text-center leading-snug whitespace-nowrap ${
          dim ? 'border-earth-300 bg-white text-basanite-500' : 'border-basanite-200 bg-white text-basanite-800'
        }`}
      >
        {label}
      </div>
      {caption && (
        <span className="text-xs italic leading-snug" style={{ color: FLOW_CAPTION_RED_BROWN }}>
          {caption}
        </span>
      )}
    </div>
  )
}

function WhereBasaniteFits() {
  const ref = useRef<HTMLDivElement>(null)
  const [entered, setEntered] = useState(false)
  const [inView, setInView] = useState(false)
  const [swapped, setSwapped] = useState(false)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReduced(true)
      setEntered(true)
      setSwapped(true)
      return
    }
    const el = ref.current
    if (!el) return
    // Keep observing (no disconnect on first hit): the swap loop below
    // pauses whenever the chart scrolls off screen and resumes on return.
    const obs = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting)
        if (entry.isIntersecting) setEntered(true)
      },
      { threshold: 0.3 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Loop between today's process and the Basanite version for as long as
  // the chart is on the visitor's screen. Holding the swapped state longer
  // keeps the gold node the dominant impression.
  useEffect(() => {
    if (reduced || !entered || !inView) return
    const t = setTimeout(() => setSwapped(s => !s), swapped ? 4200 : 2600)
    return () => clearTimeout(t)
  }, [reduced, entered, inView, swapped])

  return (
    <section
      aria-label="What Basanite is and where it fits in your hiring process, and who backs and recognises Basanite"
      className="bg-gradient-to-b from-white to-earth-100 py-12 sm:py-16 px-6 border-b border-earth-200/80"
    >
      <div ref={ref} className={`reveal ${entered ? 'visible' : ''} max-w-5xl mx-auto text-center`}>
        <p className="text-gold-700 text-[11px] font-semibold uppercase tracking-[0.28em] mb-4">What is Basanite</p>
        <h2 className="font-display text-basanite-900 text-3xl sm:text-4xl leading-[1.05]">
          An AI interviewer for your early rounds.
        </h2>
        <div className="mt-5 mb-6 h-px w-14 bg-gold-600 mx-auto" />

        <div className={`flow mt-10 ${entered ? 'flow-in' : ''} ${swapped ? 'flow-swapped' : ''}`}>
          <div className="relative h-6 mb-6 text-xs font-semibold uppercase tracking-[0.18em]">
            <span className={`absolute inset-0 text-basanite-400 transition-opacity duration-500 ${swapped ? 'opacity-0' : 'opacity-100'}`}>
              Today&rsquo;s typical process
            </span>
            <span className={`absolute inset-0 text-gold-700 transition-opacity duration-500 ${swapped ? 'opacity-100' : 'opacity-0'}`}>
              With Basanite
            </span>
          </div>
          <div className="flex flex-col items-center min-[880px]:flex-row min-[880px]:items-start min-[880px]:justify-center">
            <div className="flow-early">
              <div className="flow-old flex flex-col items-center min-[880px]:flex-row min-[880px]:items-start">
                {EARLY_ROUNDS.map((r, i) => (
                  <Fragment key={r.label}>
                    {i > 0 && <FlowArrow delay={r.delay - 80} />}
                    <FlowNode label={r.label} caption={r.caption} dim delay={r.delay} />
                  </Fragment>
                ))}
              </div>
              <div className="flow-new justify-center" aria-hidden={!swapped}>
                <div className="flow-gold border border-gold-500 bg-gold-500 text-basanite-900 font-semibold px-7 py-3.5 text-lg leading-snug whitespace-nowrap shadow-md shadow-gold-600/25">
                  &#9670; Basanite interview
                </div>
              </div>
            </div>
            <FlowArrow delay={520} />
            <FlowNode label="Final rounds" delay={600} />
            <FlowArrow delay={720} />
            <FlowNode label="Offer" delay={800} />
          </div>
        </div>

        <p className="mt-8 text-basanite-600 text-lg leading-relaxed max-w-2xl mx-auto">
          Basanite interviews your applicants adaptively from their own CV and briefs your team with
          evidence on each one. Fewer interview rounds, better hiring accuracy.
        </p>

        <div className="mt-8 pt-6 border-t border-earth-200/70">
          <p className="text-basanite-500 text-[10px] font-semibold uppercase tracking-[0.2em] mb-4">
            Backed &amp; recognised by
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 sm:gap-x-12 gap-y-4">
            {SOCIAL_PROOF.map(item => (
              <div key={item.alt} className="flex w-32 flex-col items-center gap-1.5 text-center">
                <div className="flex h-7 items-center">
                  <img
                    src={item.src}
                    alt={item.alt}
                    className={`${item.logoClass} w-auto select-none`}
                    draggable={false}
                  />
                </div>
                <span className="text-basanite-500 text-[11px] leading-snug">{item.caption}</span>
              </div>
            ))}
          </div>
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

// ─── Section 2 + 3 · The impact & ROI calculator (merged) ────────────────
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

  const recovered = useMemo(() => {
    const perHire = 15 * 80 + 0.10 * s * 0.5 + 10 * 500
    const round = (v: number) => Math.round(v / 1000) * 1000
    return round(n * perHire)
  }, [n, s])

  const fmt = (v: number) => `£${v.toLocaleString('en-GB')}`

  return (
    <section
      id="roi-calculator"
      className="relative py-16 sm:py-20 px-6 bg-basanite-900 overflow-hidden scroll-mt-16"
    >
      <StoneTexture />
      <div ref={ref} className="reveal relative z-10 max-w-5xl mx-auto text-center">
        <p className="text-gold-500 text-[11px] font-semibold uppercase tracking-[0.22em] mb-3">
          The impact
        </p>
        <h2 className="font-display text-earth-50 text-3xl sm:text-4xl mb-10 leading-[1.15]">
          What you get back
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-left">
          {NUMBERS.map((num, i) => (
            <div key={num.value} className="relative pt-4 border-t-2 border-gold-500/50">
              <div className="text-gold-500 text-[10px] font-semibold uppercase tracking-[0.25em] mb-2">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="font-display text-earth-50 text-2xl sm:text-3xl leading-[1.05] mb-2">
                {num.value}
              </div>
              <p className="text-earth-200 text-sm leading-relaxed">
                {num.desc}
              </p>
              <p className="italic text-earth-400 text-xs leading-relaxed mt-2">
                {num.caption}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-10 border-t border-earth-300/10">
          <h3 className="font-display text-earth-50 text-2xl sm:text-3xl mb-8">
            See your number
          </h3>

          <div className="grid sm:grid-cols-2 gap-x-12 gap-y-8 max-w-3xl mx-auto text-left">
            <div>
              <div className="flex items-baseline justify-between text-sm text-earth-300 mb-3">
                <label htmlFor="roi-engineers">Engineers hired a year</label>
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
              <div className="flex items-baseline justify-between text-sm text-earth-300 mb-3">
                <label htmlFor="roi-salary">Average base salary (&pound;)</label>
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

          <p className="mt-10 text-earth-100 text-xl sm:text-2xl leading-relaxed">
            Basanite recovers{' '}
            <span className="font-display text-gold-400">~{fmt(recovered)}</span>{' '}
            of your hiring inefficiency.
          </p>

          <p className="italic text-earth-500 text-sm mt-4">
            Math: Ashby 2026, Leadership IQ, SHRM 2025.{' '}
            <a
              href="/methodology#roi-assumptions"
              className="not-italic text-gold-500 hover:text-gold-400 underline underline-offset-4 decoration-gold-500/40 font-medium"
            >
              See the assumptions &rarr;
            </a>
          </p>
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
function FourLevers() {
  const ref = useReveal()
  return (
    <section className="py-12 sm:py-16 px-6 bg-white border-b border-earth-200/80">
      <div ref={ref} className="reveal max-w-5xl mx-auto text-center">
        <p className="text-gold-600 text-[11px] font-semibold uppercase tracking-[0.22em] mb-4">
          The four levers
        </p>
        <h2 className="font-display text-basanite-900 text-3xl sm:text-4xl md:text-5xl mb-8 leading-[1.15]">
          Where the savings come from
        </h2>

        <SavingsFlow />

        <p className="text-basanite-700 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto text-left mt-6">
          And it bends to your role, not the other way around. Custom
          dimensions, custom rubrics, and custom workbench tasks for
          engineering, data, ML, security, or wherever you take it next.
        </p>
      </div>
    </section>
  )
}

// ─── Section 5 · What we measure ─────────────────────────────────────────
// The eight dimensions and their probing questions live in DimensionsRadar,
// which renders them around an animated spider chart (and carries the
// screen-reader-friendly list).
function WhatWeMeasure() {
  const ref = useReveal()
  return (
    <section className="py-12 sm:py-16 px-6 bg-earth-50 border-b border-earth-200/80">
      <div ref={ref} className="reveal max-w-6xl mx-auto text-center">
        <p className="text-gold-600 text-[11px] font-semibold uppercase tracking-[0.22em] mb-4">
          The dimensions
        </p>
        <h2 className="font-display text-basanite-900 text-3xl sm:text-4xl md:text-5xl mb-2 sm:mb-3 leading-[1.15]">
          We measure how engineers think with AI
        </h2>

        <DimensionsRadar />

        <div
          className="max-w-[41rem] mx-auto mt-8 sm:mt-10 mb-3 text-left"
        >
          <p className="text-basanite-900 text-lg sm:text-xl font-bold leading-snug mb-1">
            Coding tests assume the candidate works alone. That world is gone.
          </p>
          <p className="text-basanite-700 text-xs sm:text-sm leading-normal mb-2">
            <span className="font-semibold text-basanite-900">
              76% of technical candidates now use AI mid-interview.
            </span>{' '}
            The question that predicts on-the-job performance has shifted from
            &ldquo;can they code without it?&rdquo; to &ldquo;how well do they
            think with it?&rdquo;
          </p>
          <p className="text-basanite-700 text-xs sm:text-sm leading-normal">
            Eight dimensions. One rubric. Defensible scoring.
          </p>
        </div>

        <div className="max-w-[41rem] mx-auto text-left mt-4">
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

// ─── How It Works (animated slider) ──────────────────────────────────────
// The six steps, their mockups, and the slider mechanics live in
// HowItWorksSlider.
function HowItWorks() {
  const ref = useReveal()

  return (
    <section id="how-it-works" className="py-24 sm:py-32 px-6 bg-white">
      <div ref={ref} className="reveal max-w-4xl mx-auto text-center">
        <p className="text-gold-600 text-xs font-semibold uppercase tracking-[0.2em] mb-3">The process</p>
        <h2 className="font-display text-basanite-900 text-3xl sm:text-4xl mb-10">How Basanite works</h2>

        <HowItWorksSlider />

        <div className="mt-5 pt-8 border-t border-earth-200">
          <p className="text-basanite-600 text-sm mb-3">Want to see what comes out the other end?</p>
          <a
            href="/sample-reports"
            className="inline-flex items-center gap-2 font-display text-lg text-gold-700 hover:text-gold-600 transition-colors"
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
          <div className="card-hover border border-earth-300/60 bg-white p-8 sm:p-10 flex flex-col text-center">
            <p className="text-gold-600 text-xs font-semibold uppercase tracking-[0.2em] mb-4">For hiring teams</p>
            <h3 className="font-display text-basanite-900 text-2xl mb-4">Your hiring decision, with better evidence</h3>
            <ul className="space-y-3 text-basanite-600 text-sm leading-relaxed text-left flex-1">
              <li className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">&#9670;</span>
                An interview briefing that gives your team deeper insight into every candidate, enhancing the rest of your interview process rather than just adding another screen
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">&#9670;</span>
                Decision-validation that improves hiring confidence while shortening your time-to-hire: fewer rounds, and your engineers stay on the projects that need them
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
              className="inline-block mt-8 mx-auto px-6 py-3 bg-basanite-900 text-earth-50 text-sm font-medium hover:bg-gold-600 transition-colors"
            >
              Book a call
            </a>
          </div>

          <div className="card-hover border border-earth-300/60 bg-white p-8 sm:p-10 flex flex-col text-center">
            <p className="text-gold-600 text-xs font-semibold uppercase tracking-[0.2em] mb-4">For candidates</p>
            <h3 className="font-display text-basanite-900 text-2xl mb-4">Be genuinely seen</h3>
            <ul className="space-y-3 text-basanite-600 text-sm leading-relaxed text-left flex-1">
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
            <a href="#how-it-works" className="inline-block mt-8 mx-auto px-6 py-3 border border-basanite-900 text-basanite-900 text-sm font-medium hover:bg-basanite-900 hover:text-earth-50 transition-colors">
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
        <div className="mb-14 text-center">
          <p className="text-gold-600 text-xs font-semibold uppercase tracking-[0.2em] mb-3">The team</p>
          <h2 className="font-display text-basanite-900 text-3xl sm:text-4xl mb-4">Built by people who have felt the problem</h2>
          <p className="text-basanite-600 max-w-xl mx-auto leading-relaxed">
            Engineers and AI researchers from Manchester, building the hiring tool we wish existed.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {TEAM.map(member => (
            <div key={member.name} className="card-hover border border-earth-300/60 bg-white flex flex-col">
              <div className="p-7 flex flex-col flex-1">
                <div className="flex flex-col items-center text-center gap-3 mb-5">
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
                <div className="mt-5 flex items-center justify-center gap-4">
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
  { value: 'Fewer', label: 'rounds, better accuracy' },
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
            Ready to hire with confidence?
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
      <WhereBasaniteFits />
      <WhatWeMeasure />
      <ROICalculator />
      <FourLevers />
      <HowItWorks />
      <DemoVideo />
      <ForBoth />
      <Team />
      <WaitlistCTA />
      <Footer />
    </>
  )
}
