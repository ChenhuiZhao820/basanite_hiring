import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { LogoMark } from '@/components/Logo'

export const metadata: Metadata = { title: 'Methodology' }

type Dimension = {
  name: string
  shortName: string
  summary: string
  provenance: ReactNode
}

const DIMENSIONS: Dimension[] = [
  {
    name: 'Judgment Under Ambiguity',
    shortName: 'Judgment',
    summary:
      'Committing to a defensible course of action when information is incomplete — without either paralysis or false confidence.',
    provenance: <>Knight, <em>Risk, Uncertainty and Profit</em>; Tetlock&apos;s superforecasting work.</>,
  },
  {
    name: 'Tacit-Knowledge Articulation',
    shortName: 'Tacit',
    summary:
      'Surfacing knowledge that lives in practice rather than in text — the things experienced engineers know but cannot easily say.',
    provenance: <>Polanyi, <em>The Tacit Dimension</em>; Nonaka &amp; Takeuchi; Collins.</>,
  },
  {
    name: 'Intuition Under Data Scarcity',
    shortName: 'Intuition',
    summary:
      'Recognition-primed judgment that distinguishes real expertise from vocabulary. The pattern-matching that fires before you can explain it.',
    provenance: <>Klein, <em>Sources of Power</em>; Dreyfus &amp; Dreyfus; Kahneman &amp; Klein.</>,
  },
  {
    name: 'Psychological Safety & Collective Learning',
    shortName: 'Safety',
    summary:
      'Creating conditions where errors surface early and dissent is voiced — the team-level capability that lets engineering organisations actually learn.',
    provenance: <>Edmondson, <em>The Fearless Organization</em>; Google&apos;s Project Aristotle.</>,
  },
  {
    name: 'Creative Problem Reframing',
    shortName: 'Reframing',
    summary:
      'Recognising when the team is solving the wrong problem — and reformulating it before more effort is poured into the wrong shape.',
    provenance: <>Schön, <em>The Reflective Practitioner</em>; Dorst, <em>Frame Innovation</em>.</>,
  },
  {
    name: 'Ethical Reasoning in Practice',
    shortName: 'Ethics',
    summary:
      'Feeling the weight of real tradeoffs and navigating them with integrity — the practical wisdom that abstract ethics training does not produce.',
    provenance: (
      <>
        Aristotle&apos;s <em>phronesis</em>; Rest&apos;s four-component model; the
        applied AI-ethics literature.
      </>
    ),
  },
  {
    name: 'Transformative Learning From Experience',
    shortName: 'Learning',
    summary:
      'Updating prior beliefs in proportion to disconfirming evidence. The capacity to be changed by experience, not merely accumulate it.',
    provenance: <>Flavell; Kolb; Mezirow; Argyris &amp; Schön.</>,
  },
  {
    name: 'Human–AI Collaboration Intelligence',
    shortName: 'Human–AI',
    summary:
      'Fluent, calibrated orchestration of AI tooling — the dimension no other interview measures. Where to delegate, where to verify, where to override.',
    provenance: (
      <>
        Mollick, <em>Co-Intelligence</em>; Dell&apos;Acqua et al., <em>Navigating the
        Jagged Technological Frontier</em>.
      </>
    ),
  },
]

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-earth-50 text-basanite-900">
      <MethodologyNav />

      <main className="max-w-4xl mx-auto px-6 pt-24 pb-32">
        <header className="mb-16">
          <p className="text-gold-700 text-[11px] font-semibold uppercase tracking-[0.25em] mb-4">
            The research
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[1.1] mb-6">
            How we measure capability.
          </h1>
          <p className="text-basanite-600 text-lg leading-relaxed max-w-2xl">
            Eight metacognitive dimensions drawn from cognitive science,
            philosophy of knowledge, and the emerging literature on human–AI
            collaboration. Each has a formal construct definition, intellectual
            provenance, and an empirical reference list.
          </p>
        </header>

        <section className="mb-20 border-l-2 border-gold-500/50 pl-6 sm:pl-8 py-2 max-w-3xl">
          <p className="text-gold-700 text-[11px] font-semibold uppercase tracking-[0.22em] mb-4">
            Methodology
          </p>
          <h2 className="font-display text-basanite-900 text-2xl sm:text-3xl leading-tight mb-5">
            Construct-Templated Adaptive Interviewing.
          </h2>
          <div className="space-y-4 text-basanite-600 text-base sm:text-lg leading-relaxed">
            <p>
              These are the qualities that distinguish high performers in
              complex, AI-era engineering work — and the ones that conventional
              technical-interview instruments cannot detect. They cannot be
              retrieved from a knowledge base. They are forged through real
              experience and legible only to evaluators who know what to look
              for.
            </p>
            <p>
              We call the methodology{' '}
              <span className="font-semibold text-basanite-900">
                Construct-Templated Adaptive Interviewing
              </span>
              , or CTAI. Every candidate is asked different questions, drawn
              from their own CV — but the underlying constructs and scoring
              rubrics are identical. A self-taught engineer is evaluated against
              the same evidence bar as a Cambridge graduate.
            </p>
            <p>
              No dimension may receive a high score without a specific verbatim
              statement from the candidate cited as evidence — drawn either from
              the Round 1 transcript or the Round 2 reflection conversation, or
              from observable patterns in the Round 2 trace. Scores are grounded
              in what was actually said and done, not overall impression.
            </p>
          </div>
        </section>

        <section className="mb-16">
          <p className="text-gold-700 text-[11px] font-semibold uppercase tracking-[0.22em] mb-3">
            The eight dimensions
          </p>
          <h2 className="font-display text-basanite-900 text-2xl sm:text-3xl leading-tight mb-10">
            Capability is a shape, not a number.
          </h2>

          <ol className="space-y-6">
            {DIMENSIONS.map((d, i) => (
              <li
                key={d.name}
                className="border border-earth-200 bg-white p-6 sm:p-8"
              >
                <div className="flex items-baseline gap-4 mb-3">
                  <span className="font-display text-gold-600 text-sm tracking-widest">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="font-display text-basanite-900 text-xl sm:text-2xl leading-tight">
                    {d.name}
                  </h3>
                </div>
                <p className="text-basanite-600 text-base leading-relaxed mb-3">
                  {d.summary}
                </p>
                <p className="text-basanite-500 text-sm leading-relaxed">
                  <span className="font-semibold text-basanite-700">
                    Provenance:
                  </span>{' '}
                  {d.provenance}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t border-earth-200 pt-12 text-center">
          <h2 className="font-display text-2xl text-basanite-900 mb-3">
            More questions?
          </h2>
          <p className="text-basanite-600 text-base mb-6 max-w-xl mx-auto">
            The FAQ has answers on rounds, scoring, calibration, integrations,
            and what we deliberately don&rsquo;t measure.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/faq"
              className="inline-block px-6 py-3 border border-basanite-900 text-basanite-900 text-sm font-medium hover:bg-basanite-900 hover:text-earth-50 transition-colors"
            >
              Read the FAQ
            </Link>
            <a
              href="https://cal.eu/basanite/intro"
              target="_blank"
              rel="noreferrer"
              className="inline-block px-6 py-3 bg-basanite-900 text-white text-sm font-medium hover:bg-gold-600 transition-colors"
            >
              Book a call
            </a>
          </div>
        </section>
      </main>

      <MethodologyFooter />
    </div>
  )
}

function MethodologyNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-earth-50/85 backdrop-blur-md border-b border-earth-200/60">
      <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark size={26} dark />
          <span className="font-display text-basanite-900 text-lg">Basanite</span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-5 text-sm text-basanite-600">
          <Link
            href="/#how-it-works"
            className="hidden sm:inline hover:text-basanite-900 transition-colors"
          >
            How it works
          </Link>
          <Link
            href="/faq"
            className="hidden sm:inline hover:text-basanite-900 transition-colors"
          >
            FAQ
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-basanite-900 border border-basanite-900 px-4 py-2 hover:bg-basanite-900 hover:text-earth-50 transition-colors duration-200"
          >
            Sign in
          </Link>
        </div>
      </div>
    </nav>
  )
}

function MethodologyFooter() {
  return (
    <footer className="border-t border-earth-200 bg-white">
      <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-basanite-500">
        <p>Built in Manchester by Drew, Lynn and Aditya.</p>
        <div className="flex items-center gap-5">
          <Link href="/" className="hover:text-basanite-900 transition-colors">
            Home
          </Link>
          <Link href="/faq" className="hover:text-basanite-900 transition-colors">
            FAQ
          </Link>
          <Link href="/login" className="hover:text-basanite-900 transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    </footer>
  )
}
