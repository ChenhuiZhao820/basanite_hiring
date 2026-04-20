'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { LogoMark } from '@/components/Logo'

const HERO_IMAGE = 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80'
const BREAK_IMAGE = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80'

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
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-earth-50/85 backdrop-blur-md border-b border-earth-200/60">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5">
          <LogoMark size={26} dark />
          <span className="font-display text-basanite-900 text-lg">Basanite</span>
        </a>
        <div className="hidden sm:flex items-center gap-8 text-sm text-basanite-600">
          <a href="#how-it-works" className="hover:text-basanite-900 transition-colors">How it works</a>
          <a href="#philosophy" className="hover:text-basanite-900 transition-colors">Philosophy</a>
          <a href="#team" className="hover:text-basanite-900 transition-colors">Team</a>
        </div>
        <a
          href="/login"
          className="text-sm font-medium text-basanite-900 border border-basanite-900 px-4 py-2 hover:bg-basanite-900 hover:text-earth-50 transition-colors duration-200"
        >
          Sign in
        </a>
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
          <svg width="40" height="54" viewBox="0 0 40 54" fill="none" aria-hidden="true" className="mb-10">
            <path d="M20 0 L0 18 L20 18 Z" fill="#e8c555" />
            <path d="M20 0 L40 18 L20 18 Z" fill="#d4a843" />
            <path d="M0 18 L20 18 L20 54 Z" fill="#c49a2f" />
            <path d="M40 18 L20 18 L20 54 Z" fill="#a87f24" />
            <path d="M0 18 L40 18" stroke="#1a1a18" strokeOpacity="0.18" strokeWidth="0.5" />
          </svg>
          <h1 className="font-display text-earth-50 text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.1] mb-8 max-w-4xl">
            Test genuine capability,<br />
            <span className="text-gold-400">not performed competence.</span>
          </h1>
          <p className="text-earth-200 text-lg md:text-xl max-w-2xl leading-relaxed mb-10">
            Basanite conducts AI conversational interviews that go deeper than any standardised test. We find the signal that matters: judgment, intuition, and the knowledge that only real experience produces.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <a
              href="/login"
              className="w-full sm:w-auto px-8 py-3.5 bg-gold-500 hover:bg-gold-400 text-basanite-950 font-medium text-sm tracking-wide transition-colors duration-200"
            >
              Start hiring with Basanite
            </a>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto px-8 py-3.5 border border-earth-200/50 text-earth-50 hover:border-earth-50 font-medium text-sm tracking-wide transition-colors duration-200"
            >
              See how it works
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Stats bar ───────────────────────────────────────────────────────────
function StatsBar() {
  const stats = [
    { value: '8', label: 'capability dimensions assessed' },
    { value: '45 min', label: 'conversational AI interview' },
    { value: '100%', label: 'scores grounded in candidate quotes' },
    { value: '3', label: 'screening rounds replaced' },
  ]
  return (
    <div className="bg-white border-b border-earth-200/80">
      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:flex md:flex-nowrap items-center justify-center md:justify-between gap-6 md:gap-10">
        {stats.map(s => (
          <div key={s.label} className="text-center">
            <div className="font-display text-2xl sm:text-3xl text-basanite-900">{s.value}</div>
            <div className="text-basanite-600 text-xs mt-1 uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Manifesto Strip ─────────────────────────────────────────────────────
function ManifestoStrip() {
  const ref = useReveal()
  return (
    <section ref={ref} className="reveal relative py-20 px-6 bg-earth-50">
      <div className="max-w-3xl mx-auto text-center">
        <p className="font-display text-basanite-800 text-2xl sm:text-3xl md:text-4xl leading-snug">
          Most hiring tools measure how well someone can{' '}
          <span className="italic text-basanite-500">approximate</span> a good candidate.
          <br />
          Basanite measures whether they{' '}
          <span className="text-gold-600 italic">actually are one</span>.
        </p>
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
    summary: 'Eight capability dimensions',
    description: 'The system recommends which capability dimensions to weight for this role. You can adjust, add, or remove dimensions before going live.',
    tags: ['Judgment', 'Tacit knowledge', 'Ethical reasoning', 'Technical depth'],
  },
  {
    number: '03',
    title: 'Share the assessment link',
    summary: 'Candidates take the interview on their time',
    description: 'Candidates receive a link, upload their CV, and enter a 45 minute conversational interview with Basanite. No scheduling overhead on your side.',
    tags: ['Asynchronous', 'CV upload', 'Mobile friendly'],
  },
  {
    number: '04',
    title: 'AI conducts the interview',
    summary: 'Experience grounded, adaptive',
    description: 'Basanite asks questions grounded in the candidate\u2019s own CV, follows up on vagueness, tracks narrative consistency, and probes for genuine depth rather than memorised answers.',
    tags: ['CV adaptive', 'Follow up probes', 'Consistency checks'],
  },
  {
    number: '05',
    title: 'Review ranked candidates',
    summary: 'Dimension by dimension scoring',
    description: 'Each candidate receives dimension scores grounded in specific candidate quotes. You see a ranked queue with a briefing document for the final human interview.',
    tags: ['Ranked', 'Quote grounded', 'Briefing report'],
  },
]

function HowItWorks() {
  const [active, setActive] = useState<number | null>(0)
  const ref = useReveal()

  return (
    <section id="how-it-works" className="py-24 px-6 bg-earth-50">
      <div ref={ref} className="reveal max-w-4xl mx-auto">
        <p className="text-gold-600 text-xs font-semibold uppercase tracking-[0.2em] mb-3">The process</p>
        <h2 className="font-display text-basanite-900 text-3xl sm:text-4xl mb-3">How Basanite works</h2>
        <p className="text-basanite-600 text-base mb-12 max-w-xl">
          Five steps from job description to a ranked shortlist of technically verified candidates.
        </p>

        <div className="flex flex-col gap-3">
          {STAGES.map((stage, i) => {
            const isOpen = active === i
            return (
              <button
                key={stage.number}
                onClick={() => setActive(isOpen ? null : i)}
                className={`text-left bg-white border overflow-hidden transition-shadow duration-200 ${isOpen ? 'border-gold-500/60 shadow-md' : 'border-earth-300/60 hover:border-gold-500/40 hover:shadow-sm'}`}
              >
                <div className={`flex items-center justify-between gap-4 px-5 sm:px-7 py-5 ${isOpen ? 'border-b border-earth-200' : ''}`}>
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-xs font-semibold uppercase tracking-widest text-basanite-500 hidden sm:inline shrink-0">{stage.number}</span>
                    <span className="w-px h-4 bg-earth-300 hidden sm:inline-block shrink-0" />
                    <div className="min-w-0">
                      <div className="font-display text-basanite-900 text-lg sm:text-xl truncate">{stage.title}</div>
                      <div className="text-basanite-500 text-xs mt-0.5 truncate">{stage.summary}</div>
                    </div>
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
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Image Break ─────────────────────────────────────────────────────────
function ImageBreak() {
  return (
    <div className="relative w-full h-64 sm:h-80 overflow-hidden">
      <Image
        src={BREAK_IMAGE}
        alt="Light across a worn surface"
        fill
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-basanite-950/70" />
      <div className="absolute inset-0 flex items-center justify-center px-6">
        <p className="font-display text-2xl md:text-4xl text-earth-50 text-center max-w-3xl leading-snug">
          &ldquo;The edges of real ability are blurry. Performed ability has no edges.&rdquo;
        </p>
      </div>
    </div>
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
            <a href="/login" className="inline-block mt-8 px-6 py-3 bg-basanite-900 text-earth-50 text-sm font-medium hover:bg-gold-600 transition-colors">
              Start assessing
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

// ─── CTA ─────────────────────────────────────────────────────────────────
function CTA() {
  const ref = useReveal()
  return (
    <section className="relative py-24 sm:py-32 px-6 bg-basanite-900 overflow-hidden">
      <StoneTexture />
      <div ref={ref} className="reveal relative z-10 max-w-2xl mx-auto text-center">
        <h2 className="font-display text-earth-50 text-3xl sm:text-4xl md:text-5xl mb-6">
          Ready to test what matters?
        </h2>
        <p className="text-earth-300 text-lg mb-10 leading-relaxed">
          Stop selecting for interview preparedness. Start selecting for the qualities that actually drive performance in complex, adaptive, AI era work environments.
        </p>
        <a
          href="/login"
          className="inline-block px-10 py-4 bg-gold-500 hover:bg-gold-400 text-basanite-950 font-medium text-sm tracking-wide transition-colors duration-200"
        >
          Get started with Basanite
        </a>
      </div>
    </section>
  )
}

// ─── Footer ──────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="py-12 px-6 bg-basanite-950 border-t border-basanite-800">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
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
    </footer>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <>
      <Nav />
      <Hero />
      <StatsBar />
      <ManifestoStrip />
      <HowItWorks />
      <ImageBreak />
      <Philosophy />
      <ForBoth />
      <Team />
      <CTA />
      <Footer />
    </>
  )
}
