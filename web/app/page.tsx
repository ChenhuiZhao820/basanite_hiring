'use client'

import { useEffect, useRef } from 'react'
import { LogoMark } from '@/components/Logo'

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

// ─── Decorative: Gold Streak SVG ─────────────────────────────────────────
function GoldStreak({ className = '' }: { className?: string }) {
  return (
    <svg className={`pointer-events-none select-none ${className}`} viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <path d="M0 60 Q100 20 200 40 T400 20" stroke="url(#goldGrad)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M0 65 Q120 30 220 48 T400 28" stroke="url(#goldGrad2)" strokeWidth="0.75" strokeLinecap="round" opacity="0.4" />
      <defs>
        <linearGradient id="goldGrad" x1="0" y1="0" x2="400" y2="0">
          <stop offset="0%" stopColor="#c49a2f" stopOpacity="0" />
          <stop offset="20%" stopColor="#c49a2f" stopOpacity="0.8" />
          <stop offset="80%" stopColor="#d4a843" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#e8c555" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="goldGrad2" x1="0" y1="0" x2="400" y2="0">
          <stop offset="0%" stopColor="#d4a843" stopOpacity="0" />
          <stop offset="30%" stopColor="#d4a843" stopOpacity="0.5" />
          <stop offset="70%" stopColor="#c49a2f" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#c49a2f" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// ─── Decorative: Stone texture background ────────────────────────────────
function StoneTexture() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
      </filter>
      <rect width="100%" height="100%" filter="url(#noise)"/>
    </svg>
  )
}

// ─── Dimension Card ──────────────────────────────────────────────────────
function DimensionCard({ number, title, description }: { number: string; title: string; description: string }) {
  const ref = useReveal()
  return (
    <div ref={ref} className="reveal group relative">
      <div className="border border-earth-300/60 bg-white/60 backdrop-blur-sm p-6 sm:p-8 transition-all duration-300 hover:border-gold-500/50 hover:shadow-[0_0_40px_-12px_rgba(196,154,47,0.12)]">
        <span className="font-display text-gold-500 text-sm tracking-wide">{number}</span>
        <h3 className="font-display text-basanite-900 text-lg sm:text-xl mt-2 mb-3">{title}</h3>
        <p className="text-basanite-600 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

// ─── Step Card ───────────────────────────────────────────────────────────
function StepCard({ step, title, description }: { step: string; title: string; description: string }) {
  const ref = useReveal()
  return (
    <div ref={ref} className="reveal relative">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-basanite-900 flex items-center justify-center">
          <span className="text-gold-400 text-sm font-medium">{step}</span>
        </div>
        <div>
          <h3 className="font-display text-basanite-900 text-lg mb-1.5">{title}</h3>
          <p className="text-basanite-600 text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Nav ─────────────────────────────────────────────────────────────────
function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-earth-50/80 backdrop-blur-md border-b border-earth-200/60">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5">
          <LogoMark size={26} dark />
          <span className="font-display text-basanite-900 text-lg">Basanite</span>
        </a>
        <div className="hidden sm:flex items-center gap-8 text-sm text-basanite-600">
          <a href="#how-it-works" className="hover:text-basanite-900 transition-colors">How it works</a>
          <a href="#dimensions" className="hover:text-basanite-900 transition-colors">Dimensions</a>
          <a href="#philosophy" className="hover:text-basanite-900 transition-colors">Philosophy</a>
        </div>
        <a
          href="/login"
          className="text-sm font-medium text-basanite-900 border border-basanite-900 px-4 py-2 hover:bg-basanite-900 hover:text-earth-50 transition-all duration-200"
        >
          Sign in
        </a>
      </div>
    </nav>
  )
}

// ─── Hero ────────────────────────────────────────────────────────────────
function Hero() {
  const ref = useReveal()
  return (
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden bg-basanite-900">
      <StoneTexture />
      {/* Diagonal gold accent lines */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[20%] -left-20 w-[60%] h-px bg-gradient-to-r from-transparent via-gold-500/20 to-transparent rotate-[12deg]" />
        <div className="absolute top-[35%] -right-20 w-[45%] h-px bg-gradient-to-r from-transparent via-gold-500/15 to-transparent -rotate-[8deg]" />
        <div className="absolute bottom-[25%] -left-10 w-[50%] h-px bg-gradient-to-r from-transparent via-gold-500/10 to-transparent rotate-[5deg]" />
      </div>

      <div ref={ref} className="reveal relative z-10 max-w-4xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 border border-gold-500/30 px-4 py-1.5 mb-10">
          <div className="w-1.5 h-1.5 rounded-full bg-gold-500" />
          <span className="text-gold-400 text-xs font-medium tracking-[0.15em] uppercase">AI-Powered Technical Assessment</span>
        </div>

        <h1 className="font-display text-earth-50 text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.1] mb-8">
          Test genuine capability,<br />
          <span className="text-gold-400">not performed competence</span>
        </h1>

        <p className="text-earth-300 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-12">
          Basanite conducts AI-powered technical interviews that go deeper than any standardised test.
          We find the signal that matters — judgment, intuition, and the kind of knowledge
          that only real experience produces.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 bg-gold-500 hover:bg-gold-400 text-basanite-950 font-medium text-sm tracking-wide transition-colors duration-200"
          >
            Start hiring with Basanite
          </a>
          <a
            href="#how-it-works"
            className="w-full sm:w-auto px-8 py-3.5 border border-earth-300/20 text-earth-200 hover:border-earth-300/40 hover:text-earth-50 font-medium text-sm tracking-wide transition-all duration-200"
          >
            See how it works
          </a>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-earth-50 to-transparent" />
    </section>
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

// ─── How It Works ────────────────────────────────────────────────────────
function HowItWorks() {
  const ref = useReveal()
  const steps = [
    { step: '1', title: 'Paste your job description', description: 'No special formatting needed. Basanite accepts the same JD you would post on LinkedIn or Greenhouse.' },
    { step: '2', title: 'Configure evaluation dimensions', description: 'The system recommends which of eight capability dimensions to assess. You can adjust, add, or remove dimensions.' },
    { step: '3', title: 'Share the assessment link', description: 'Candidates receive a link. They upload their CV and enter a 45-minute conversational interview with Basanite.' },
    { step: '4', title: 'AI conducts the interview', description: 'Basanite asks experience-grounded questions, follows up on vagueness, tracks narrative consistency, and probes for genuine depth.' },
    { step: '5', title: 'Review ranked candidates', description: 'Each candidate receives dimension-by-dimension scores grounded in specific quotes. You see a ranked queue with full assessment reports.' },
  ]

  return (
    <section id="how-it-works" className="relative py-24 sm:py-32 px-6 bg-earth-50">
      <GoldStreak className="absolute top-12 left-0 w-full h-20 opacity-60" />
      <div ref={ref} className="reveal max-w-3xl mx-auto">
        <p className="text-gold-600 text-xs font-semibold uppercase tracking-[0.2em] mb-3">Process</p>
        <h2 className="font-display text-basanite-900 text-3xl sm:text-4xl mb-16">How Basanite works</h2>

        <div className="space-y-10">
          {steps.map(s => <StepCard key={s.step} {...s} />)}
        </div>

        {/* Connector line */}
        <div className="absolute left-[calc(50%-280px)] sm:left-[calc(50%-320px)] top-[180px] bottom-[120px] w-px bg-gradient-to-b from-earth-200 via-gold-500/20 to-earth-200 hidden lg:block" />
      </div>
    </section>
  )
}

// ─── Dimensions ──────────────────────────────────────────────────────────
function Dimensions() {
  const headerRef = useReveal()
  const dimensions = [
    { number: 'I', title: 'Judgment under ambiguity', description: 'The capacity to act decisively on incomplete information, without either paralysis or false confidence.' },
    { number: 'II', title: 'Tacit knowledge extraction', description: 'The irreducible gap between what experts know and what they can say. Practical intelligence that lives in experience, not text.' },
    { number: 'III', title: 'Intuition under data scarcity', description: 'Recognition-primed judgment that distinguishes genuine experts from those who merely know the vocabulary.' },
    { number: 'IV', title: 'Psychological safety & collective learning', description: 'The conditions under which teams correct their own errors before they compound. Can this person create that environment?' },
    { number: 'V', title: 'Creative problem reframing', description: 'The ability to recognise when the team is solving the wrong problem — a capacity actively suppressed by systems that reward convergence.' },
    { number: 'VI', title: 'Ethical reasoning', description: 'Not the ability to articulate ethical frameworks, but the capacity to feel the weight of real tradeoffs and navigate them with integrity.' },
    { number: 'VII', title: 'Capacity to be genuinely changed', description: 'The metacognitive self-awareness that separates those who accumulate experience from those who actually learn from it.' },
    { number: 'VIII', title: 'Technical judgment depth', description: 'Whether the candidate understands the boundaries of their technical decisions. Valid knowledge has edges; performed knowledge does not.' },
  ]

  return (
    <section id="dimensions" className="relative py-24 sm:py-32 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div ref={headerRef} className="reveal max-w-2xl mb-16">
          <p className="text-gold-600 text-xs font-semibold uppercase tracking-[0.2em] mb-3">What we measure</p>
          <h2 className="font-display text-basanite-900 text-3xl sm:text-4xl mb-4">Eight dimensions of genuine capability</h2>
          <p className="text-basanite-600 leading-relaxed">
            These qualities share a structural feature: they cannot be retrieved from a knowledge base. They are not facts to be recalled
            or algorithms to be executed. They are capabilities forged through real experience, expressed through real judgment.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {dimensions.map(d => <DimensionCard key={d.number} {...d} />)}
        </div>
      </div>
    </section>
  )
}

// ─── Philosophy ──────────────────────────────────────────────────────────
function Philosophy() {
  const ref = useReveal()
  const principles = [
    {
      title: 'Depth over breadth',
      body: 'Each layer of the assessment exists to move one level deeper into signal quality. A candidate who answers fluently at the surface should encounter ground that shifts beneath them at the next layer. The edges of real ability are blurry. Performed ability has no edges.',
    },
    {
      title: 'Structure as a fairness mechanism',
      body: 'By anchoring every evaluation to consistent frameworks and explicit scoring criteria, a self-taught engineer without institutional pedigree can be seen as clearly as one from a target university. Both are asked the same questions, in the same spirit, with the same depth of follow-up.',
    },
    {
      title: 'Honest about what AI can and cannot do',
      body: 'Basanite flags where human expertise is required, produces quotable evidence rather than opaque scores, and positions itself as infrastructure that makes human judgment better — not the mechanism that replaces it.',
    },
    {
      title: 'Evaluation as a two-way mirror',
      body: 'The best hiring processes leave candidates with a clearer understanding of themselves. Every assessment strategy deployed by Basanite can be honestly explained to the candidate it is applied to.',
    },
  ]

  return (
    <section id="philosophy" className="relative py-24 sm:py-32 px-6 bg-basanite-900 overflow-hidden">
      <StoneTexture />
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[30%] -right-20 w-[40%] h-px bg-gradient-to-r from-transparent via-gold-500/15 to-transparent -rotate-[6deg]" />
        <div className="absolute bottom-[20%] -left-20 w-[35%] h-px bg-gradient-to-r from-transparent via-gold-500/10 to-transparent rotate-[4deg]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">
        <div ref={ref} className="reveal mb-16">
          <p className="text-gold-500 text-xs font-semibold uppercase tracking-[0.2em] mb-3">Design philosophy</p>
          <h2 className="font-display text-earth-50 text-3xl sm:text-4xl mb-4">Assess genuine capability, not performed competence</h2>
          <p className="text-earth-300 max-w-2xl leading-relaxed">
            The central conviction behind every design decision at Basanite: most hiring tools are optimised for the wrong signal.
            They measure how well someone can approximate the idea of a good candidate, rather than whether they actually are one.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {principles.map((p, i) => {
            const pRef = useReveal()
            return (
              <div key={i} ref={pRef} className="reveal border border-earth-300/10 p-8 bg-basanite-800/30 backdrop-blur-sm">
                <h3 className="font-display text-gold-400 text-lg mb-3">{p.title}</h3>
                <p className="text-earth-300/80 text-sm leading-relaxed">{p.body}</p>
              </div>
            )
          })}
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
          {/* Hirers */}
          <div className="border border-earth-300/60 bg-white p-8 sm:p-10">
            <p className="text-gold-600 text-xs font-semibold uppercase tracking-[0.2em] mb-4">For hiring teams</p>
            <h3 className="font-display text-basanite-900 text-2xl mb-4">Replace the first three rounds</h3>
            <ul className="space-y-3 text-basanite-600 text-sm leading-relaxed">
              <li className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">&#9670;</span>
                One Basanite deployment replaces 1&ndash;3 full-time recruiters doing screening and first-round assessment
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">&#9670;</span>
                Every candidate receives identical assessment quality — the tenth candidate is evaluated as rigorously as the first
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">&#9670;</span>
                Dimension-by-dimension scores grounded in specific candidate quotes, not opaque numbers
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

          {/* Candidates */}
          <div className="border border-earth-300/60 bg-white p-8 sm:p-10">
            <p className="text-gold-600 text-xs font-semibold uppercase tracking-[0.2em] mb-4">For candidates</p>
            <h3 className="font-display text-basanite-900 text-2xl mb-4">Be genuinely seen</h3>
            <ul className="space-y-3 text-basanite-600 text-sm leading-relaxed">
              <li className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">&#9670;</span>
                A conversation, not an interrogation — questions grow organically from your own experience
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
                You receive a personal feedback report — regardless of outcome, you leave with something of value
              </li>
            </ul>
            <a href="#how-it-works" className="inline-block mt-8 px-6 py-3 border border-basanite-900 text-basanite-900 text-sm font-medium hover:bg-basanite-900 hover:text-earth-50 transition-all">
              Learn more
            </a>
          </div>
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
      <GoldStreak className="absolute bottom-8 left-0 w-full h-16 opacity-40" />

      <div ref={ref} className="reveal relative z-10 max-w-2xl mx-auto text-center">
        <h2 className="font-display text-earth-50 text-3xl sm:text-4xl md:text-5xl mb-6">
          Ready to test what matters?
        </h2>
        <p className="text-earth-300 text-lg mb-10 leading-relaxed">
          Stop selecting for interview preparedness. Start selecting for the qualities
          that actually drive performance in complex, adaptive, AI-era work environments.
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
          Built in Manchester by Drew, Lynn &amp; Aditya.
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
      <ManifestoStrip />
      <HowItWorks />
      <Dimensions />
      <Philosophy />
      <ForBoth />
      <CTA />
      <Footer />
    </>
  )
}
