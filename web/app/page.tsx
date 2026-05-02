'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { LogoMark } from '@/components/Logo'

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
        <div className="hidden sm:flex items-center gap-8 text-sm text-basanite-600">
          <a href="#how-it-works" className="hover:text-basanite-900 transition-colors">How it works</a>
          <a href="#research" className="hover:text-basanite-900 transition-colors">Research</a>
          <a href="#philosophy" className="hover:text-basanite-900 transition-colors">Philosophy</a>
          <a href="#team" className="hover:text-basanite-900 transition-colors">Team</a>
          <a href="/faq" className="hover:text-basanite-900 transition-colors">FAQ</a>
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
            className="text-sm font-medium text-basanite-600 hover:text-basanite-900 transition-colors duration-200"
          >
            Sign in
          </a>
        </div>
      </div>
    </nav>
  )
}

// ─── Hero ────────────────────────────────────────────────────────────────
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
            Test genuine capability,<br />
            <span className="text-gold-400">not performed competence.</span>
          </h1>
          <p className="text-earth-200 text-lg md:text-xl max-w-2xl leading-relaxed mb-10">
            The technical interview is broken. Coding tests have collapsed into a cheating arms race, and the capability that actually matters — engineering effectiveness in an AI-augmented workflow — is not measured anywhere. Basanite is the technical layer rebuilt for the AI era.
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

// ─── Company marquee ─────────────────────────────────────────────────────
// Per-logo visual height. All sit on the same baseline; widths vary naturally
// by aspect ratio. Heights are tuned so wordmarks look similarly weighted.
const COMPANIES = [
  { name: 'The Trade Desk',     src: '/logos/the-trade-desk.svg',    h: 28 },
  { name: 'Cisco',              src: '/logos/cisco.svg',             h: 34 },
  { name: 'Rothschild & Co',    src: '/logos/rothschild.png',        h: 24 },
  { name: 'Virgin Media O2',    src: '/logos/virgin-media-o2.svg',   h: 36 },
  { name: 'Exclusive Networks', src: '/logos/exclusive-networks.svg', h: 30 },
  { name: 'Data Annotations',   src: '/logos/dataannotation.svg',    h: 22 },
  { name: 'Outlier AI',         src: '/logos/outlier.svg',           h: 22 },
  { name: 'BlueDot Impact',     src: '/logos/bluedot.svg',           h: 18 },
]

function CompanyMarquee() {
  return (
    <section
      aria-label="Companies our team has worked at"
      className="bg-white border-b border-earth-200/80 py-10 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto px-6">
        <p className="text-center text-basanite-500 text-[10px] sm:text-xs uppercase tracking-[0.25em] mb-7">
          Team experience spans
        </p>
        <div
          className="relative overflow-hidden
            [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]
            [-webkit-mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
        >
          <div className="flex motion-safe:animate-marquee whitespace-nowrap items-center gap-16 sm:gap-20 will-change-transform">
            {COMPANIES.map(c => (
              <img
                key={`a-${c.name}`}
                src={c.src}
                alt={c.name}
                height={c.h}
                className="shrink-0 w-auto select-none opacity-80"
                style={{ height: `${c.h}px` }}
                draggable={false}
              />
            ))}
            {COMPANIES.map(c => (
              <img
                key={`b-${c.name}`}
                src={c.src}
                alt=""
                aria-hidden="true"
                height={c.h}
                className="shrink-0 w-auto select-none opacity-80"
                style={{ height: `${c.h}px` }}
                draggable={false}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Research ────────────────────────────────────────────────────────────
// Eight metacognitive dimensions, V2.1 §4. Listed in the order V2.1 lists
// them. We surface all eight on the page now that the V2.1 product overview
// formalises them with literature anchors — no longer just four pillars.
const RESEARCH_AREAS = [
  { name: 'Judgment Under Ambiguity', note: 'committing to a defensible course of action when information is incomplete' },
  { name: 'Tacit-Knowledge Articulation', note: 'surfacing knowledge that lives in practice rather than in text' },
  { name: 'Intuition Under Data Scarcity', note: 'recognition-primed judgment that distinguishes real expertise from vocabulary' },
  { name: 'Psychological Safety & Collective Learning', note: 'creating conditions where errors surface and dissent is voiced' },
  { name: 'Creative Problem Reframing', note: 'recognising when the team is solving the wrong problem' },
  { name: 'Ethical Reasoning in Practice', note: 'feeling the weight of real tradeoffs and navigating them with integrity' },
  { name: 'Transformative Learning From Experience', note: 'updating prior beliefs in proportion to disconfirming evidence' },
  { name: 'Human–AI Collaboration Intelligence', note: 'fluent, calibrated orchestration of AI tooling — the dimension no other interview measures' },
]

function Research() {
  const ref = useReveal()
  return (
    <section id="research" className="py-24 sm:py-32 px-6 bg-earth-50 border-b border-earth-200/80">
      <div ref={ref} className="reveal max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-12 md:gap-16 items-start">
        <div className="md:col-span-3">
          <div className="inline-flex items-center gap-2 text-gold-700 text-[11px] font-semibold uppercase tracking-[0.22em] mb-5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
            </svg>
            Backed by PhD research
          </div>
          <h2 className="font-display text-basanite-900 text-3xl sm:text-4xl leading-tight mb-6">
            Grounded in the academic study of tacit expertise.
          </h2>
          <p className="text-basanite-600 text-base sm:text-lg leading-relaxed mb-4">
            Basanite operationalises eight metacognitive dimensions drawn from cognitive science, philosophy of knowledge, and the emerging literature on human–AI collaboration. Each has a formal construct definition, intellectual provenance, and an empirical reference list.
          </p>
          <p className="text-basanite-600 text-base sm:text-lg leading-relaxed mb-4">
            These are the qualities that distinguish high performers in complex, AI-era engineering work — and the ones that conventional technical-interview instruments cannot detect. They cannot be retrieved from a knowledge base. They are forged through real experience and legible only to evaluators who know what to look for.
          </p>
          <p className="text-basanite-600 text-base sm:text-lg leading-relaxed">
            We call the methodology <span className="font-semibold text-basanite-900">Construct-Templated Adaptive Interviewing</span>, or CTAI. Every candidate is asked different questions, drawn from their own CV — but the underlying constructs and scoring rubrics are identical. A self-taught engineer is evaluated against the same evidence bar as a Cambridge graduate.
          </p>
        </div>

        <div className="md:col-span-2 border-l-2 border-gold-500/50 pl-6 sm:pl-8 py-2">
          <p className="text-gold-700 text-[11px] font-semibold uppercase tracking-[0.2em] mb-5">The eight dimensions</p>
          <ul className="space-y-4">
            {RESEARCH_AREAS.map(a => (
              <li key={a.name}>
                <div className="font-display text-basanite-900 text-base leading-snug">{a.name}</div>
                <div className="text-basanite-500 text-sm mt-0.5 leading-snug">{a.note}</div>
              </li>
            ))}
          </ul>
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
    description: 'Basanite asks questions grounded in the candidate’s own CV, follows up on vagueness, tracks narrative consistency, and probes for genuine depth. This round generates signal across the cognitive, judgmental, and tacit-knowledge dimensions.',
    tags: ['Adaptive', 'Follow-up probes', '20–30 min'],
  },
  {
    number: '05',
    title: 'Round 2 — AI Collaboration Workbench',
    summary: 'Reveals what the candidate does',
    description: 'A sandboxed VS Code environment with a role-matched codebase, a real ticket, and the candidate’s choice of AI coding agent (Claude Code, Cursor, Copilot, Aider). We test engineers WITH AI rather than against it — the dimension no other interview measures.',
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
      </div>
    </section>
  )
}

// ─── Philosophy ──────────────────────────────────────────────────────────
const PRINCIPLES = [
  {
    title: 'Depth over breadth',
    body: 'Each layer of the assessment exists to move one level deeper into signal quality. A candidate who answers fluently at the surface should encounter ground that shifts beneath them at the next layer. The edges of real ability are blurry. Performed ability has no edges.',
  },
  {
    title: 'Structure as a fairness mechanism',
    body: 'By anchoring every evaluation to consistent frameworks and explicit scoring criteria, a self taught engineer without institutional pedigree can be seen as clearly as one from a target university. Both are asked the same questions, in the same spirit, with the same depth of follow up.',
  },
  {
    title: 'Honest about what AI can and cannot do',
    body: 'Basanite flags where human expertise is required, produces quotable evidence rather than opaque scores, and positions itself as infrastructure that makes human judgment better, not the mechanism that replaces it.',
  },
  {
    title: 'Evaluation as a two way mirror',
    body: 'The best hiring processes leave candidates with a clearer understanding of themselves. Every assessment strategy deployed by Basanite can be honestly explained to the candidate it is applied to.',
  },
]

function PrincipleCard({ title, body }: { title: string; body: string }) {
  const ref = useReveal()
  return (
    <div ref={ref} className="reveal card-hover border border-earth-300/20 p-8 bg-basanite-800/40 backdrop-blur-sm">
      <h3 className="font-display text-gold-400 text-lg mb-3">{title}</h3>
      <p className="text-earth-300/80 text-sm leading-relaxed">{body}</p>
    </div>
  )
}

function Philosophy() {
  const ref = useReveal()
  return (
    <section id="philosophy" className="relative py-24 sm:py-32 px-6 bg-basanite-900 overflow-hidden">
      <StoneTexture />
      <div className="relative z-10 max-w-5xl mx-auto">
        <div ref={ref} className="reveal mb-14">
          <p className="font-display italic text-gold-400/80 text-xl sm:text-2xl md:text-3xl mb-10 leading-snug max-w-3xl">
            Most hiring tools measure how well someone can <span className="not-italic text-earth-200">approximate</span> a good candidate.
            <br />
            Basanite measures whether they <span className="not-italic text-gold-400">actually are one</span>.
          </p>
          <p className="text-gold-500 text-xs font-semibold uppercase tracking-[0.2em] mb-3">Design philosophy</p>
          <h2 className="font-display text-earth-50 text-3xl sm:text-4xl mb-4">Assess genuine capability, not performed competence</h2>
          <p className="text-earth-300 max-w-2xl leading-relaxed">
            The central conviction behind every design decision at Basanite: most hiring tools are optimised for the wrong signal. They measure how well someone can approximate the idea of a good candidate, rather than whether they actually are one.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PRINCIPLES.map(p => <PrincipleCard key={p.title} {...p} />)}
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
          <a href="/privacy" className="hover:text-earth-200">Privacy</a>
          <span className="text-basanite-700">·</span>
          <a href="/terms" className="hover:text-earth-200">Terms</a>
          <span className="text-basanite-700">·</span>
          <a href="/legal/subprocessors" className="hover:text-earth-200">Sub-processors</a>
          <span className="text-basanite-700">·</span>
          <a href="/data-rights" className="hover:text-earth-200">Your data rights</a>
          <span className="text-basanite-700">·</span>
          <a href="/faq" className="hover:text-earth-200">FAQ</a>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <>
      <Nav />
      <Hero />
      <CompanyMarquee />
      <DemoVideo />
      <Research />
      <HowItWorks />
      <Philosophy />
      <ForBoth />
      <Team />
      <WaitlistCTA />
      <Footer />
    </>
  )
}
