import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { SiteNav } from '@/components/SiteNav'
import { StoneTexture } from '@/components/StoneTexture'

export const metadata: Metadata = { title: 'Methodology' }

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-earth-50 text-basanite-900">
      <SiteNav />

      {/* Lean dark opener — the "What Basanite is built on" band that used
          to live on the homepage. pt clears the fixed nav; elements rise in
          on mount via the hiw-rise utility (CSS-only, so it works from this
          server component and respects prefers-reduced-motion). */}
      <section className="relative pt-32 pb-16 sm:pt-36 sm:pb-20 px-6 bg-basanite-900 overflow-hidden">
        <StoneTexture />
        <div className="relative z-10 w-full max-w-3xl mx-auto text-center">
          <p
            className="hiw-rise text-gold-500 text-[11px] font-semibold uppercase tracking-[0.22em] mb-4"
            style={{ ['--d' as string]: '0ms' }}
          >
            What Basanite is built on
          </p>
          <h1
            className="hiw-rise font-display text-earth-50 text-3xl sm:text-4xl md:text-5xl mb-6 leading-[1.15]"
            style={{ ['--d' as string]: '140ms' }}
          >
            We measure genuine capability, not{' '}
            <em className="text-gold-400">performed</em> competence.
          </h1>
          <p
            className="hiw-rise text-earth-300 text-base sm:text-lg leading-relaxed"
            style={{ ['--d' as string]: '300ms' }}
          >
            Most hiring tools reward the candidate who best approximates the
            idea of a good hire. Basanite is built to surface whether they
            actually are one. Real ability has blurry edges, performed ability
            doesn&rsquo;t. Every decision below exists to find that edge.
          </p>
        </div>
      </section>

      <FourDecisions />

      <main className="max-w-4xl mx-auto px-6 pt-4 pb-24">
        <section className="pt-12 text-center">
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

// ─── How we get a true signal · four decisions ───────────────────────────
// Redesigned from the reference layout in the homepage's own language:
// centered header, hairline-divided rows that alternate text and visual,
// white bordered cards, gold for the real signal and clay for the accent,
// and the same uppercase micro-label vocabulary used everywhere else.

// The right-hand visual for "01 · Two rounds": one desk photographed twice.
// convo.jpeg (mic, blank paper) crossfades to workbench.jpeg (keyboard, the
// same paper now written on) as the card scrolls past. The crossfade is
// scroll-driven and opacity-only (see .two-rounds rules in globals.css), so
// the shared paper/pen/desk stay registered; the label bar below carries the
// meaning, which is why both photographs get empty alt text.
function RoundsCard() {
  return (
    <div className="two-rounds border border-earth-200 bg-white p-8 sm:p-10">
      {/* Stage: both frames stacked, identical object-position, opacity only */}
      <div className="tr-stage relative w-full aspect-video overflow-hidden bg-earth-100">
        <img src="/convo.jpeg" alt="" className="tr-img" />
        <img src="/workbench.jpeg" alt="" className="tr-img tr-workbench" />
      </div>

      {/* Label bar: round one on the left, round two on the right, a brass
          progress rule filling between them as the crossfade runs. */}
      <div className="tr-labels mt-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-5">
        <div className="tr-label-a flex flex-col gap-1.5">
          <p className="text-basanite-400 text-[10px] font-semibold uppercase tracking-[0.2em]">
            Round one
          </p>
          <p className="font-display text-basanite-900 text-xl sm:text-2xl leading-none">
            Conversation
          </p>
          <p className="text-basanite-500 text-sm italic">what they think</p>
        </div>

        <div className="tr-progress relative hidden md:block md:flex-1 h-px bg-earth-300" aria-hidden="true">
          <span className="tr-progress-fill absolute inset-0 bg-gold-500" />
        </div>

        <div className="tr-label-b flex flex-col gap-1.5 md:text-right md:items-end">
          <p className="text-basanite-400 text-[10px] font-semibold uppercase tracking-[0.2em]">
            Round two
          </p>
          <p className="font-display text-clay-600 text-xl sm:text-2xl leading-none">
            Workbench
          </p>
          <p className="text-basanite-500 text-sm italic">what they do</p>
        </div>
      </div>
    </div>
  )
}

function OneBarCard() {
  return (
    <div className="border border-earth-200 bg-white p-6 sm:p-8">
      <svg viewBox="0 0 340 200" className="w-full h-auto" aria-hidden="true">
        {[
          { y: 40, label: 'CV A' },
          { y: 84, label: 'CV B' },
          { y: 128, label: 'CV C' },
          { y: 172, label: 'CV D' },
        ].map(cv => (
          <g key={cv.label}>
            <text x="34" y={cv.y - 9} fontSize="10" letterSpacing="1.5" fill="#a49a8c">
              {cv.label}
            </text>
            <circle cx="38" cy={cv.y} r="3.5" fill="#c49a2f" />
            <path
              d={`M42 ${cv.y} C 130 ${cv.y}, 180 106, 252 106`}
              stroke="#c49a2f"
              strokeWidth="1.5"
              opacity="0.65"
              fill="none"
            />
          </g>
        ))}
        <line x1="256" y1="72" x2="256" y2="140" stroke="#b03f28" strokeWidth="3.5" strokeLinecap="round" />
        <text x="268" y="101" fontSize="11" letterSpacing="1" fill="#b03f28" fontWeight="600">
          one
        </text>
        <text x="268" y="116" fontSize="11" letterSpacing="1" fill="#b03f28" fontWeight="600">
          bar
        </text>
      </svg>
    </div>
  )
}

function EvidenceCard() {
  return (
    <div className="border border-earth-200 bg-white p-7 sm:p-8 text-left">
      <div className="flex items-center justify-between gap-4 mb-5">
        <p className="text-basanite-900 font-semibold text-sm">
          Judgment under ambiguity
        </p>
        <div className="flex items-center gap-1.5" aria-label="Scored four out of five">
          {[0, 1, 2, 3].map(i => (
            <span key={i} className="w-2 h-2 rounded-full bg-gold-500" />
          ))}
          <span className="w-2 h-2 rounded-full bg-earth-200" />
        </div>
      </div>
      <blockquote className="border-l-2 border-clay-500/70 pl-4">
        <p className="font-display italic text-basanite-800 text-base sm:text-lg leading-relaxed">
          &ldquo;I shipped the read path first and left writes behind a flag,
          we didn&rsquo;t have the load data to commit to the sharding scheme
          yet.&rdquo;
        </p>
      </blockquote>
      <p className="text-basanite-400 text-[10px] font-semibold uppercase tracking-[0.18em] mt-4">
        Verbatim &middot; Round 1 transcript
      </p>
    </div>
  )
}

// Semicircular gauge. `fraction` fills the arc clockwise from the left.
function Gauge({ fraction, color, value, label }: { fraction: number; color: string; value: string; label: string }) {
  const r = 56
  const len = Math.PI * r
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 140 78" className="w-32 sm:w-36 h-auto" aria-hidden="true">
        <path
          d={`M14 72 A ${r} ${r} 0 0 1 126 72`}
          stroke="#e8e3d8"
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d={`M14 72 A ${r} ${r} 0 0 1 126 72`}
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${len * fraction} ${len}`}
        />
        <text x="70" y="62" textAnchor="middle" fontSize="20" fill="#26241f" className="font-display">
          {value}
        </text>
      </svg>
      <p className="text-basanite-600 text-xs font-semibold mt-1">{label}</p>
    </div>
  )
}

function TwoReadingsCard() {
  return (
    <div className="border border-earth-200 bg-white p-8 sm:p-10">
      <div className="flex items-center justify-center gap-8 sm:gap-12">
        <Gauge fraction={0.82} color="#c49a2f" value="High" label="Capability" />
        <span className="self-stretch w-px border-l border-dashed border-earth-300" aria-hidden="true" />
        <Gauge fraction={0.5} color="#6b6558" value="Med" label="AI reliance" />
      </div>
      <p className="text-basanite-400 text-[10px] font-semibold uppercase tracking-[0.2em] text-center mt-6">
        Measured separately
      </p>
    </div>
  )
}

const DECISIONS: {
  kicker: string
  title: string
  body: string
  visual: ReactNode
}[] = [
  {
    kicker: '01 · Two rounds',
    title: 'What they think, and what they do.',
    body:
      'Round one is a conversation about their real work: how they reason, and the things experienced engineers know but rarely say out loud. Round two drops them into a sandbox that looks like the job: a real codebase, an AI coding agent, a ticket to ship. One reveals thinking. The other reveals doing. The gap between them is itself the signal.',
    visual: <RoundsCard />,
  },
  {
    kicker: '02 · AI use is a plus, not a red flag',
    title: 'We report "did they lean on AI" separately from "are they good."',
    body:
      "A candidate who used an agent and produced strong, verified work is not the same as one who used it to paper over a gap, and you shouldn't have to guess which. Basanite keeps the two readings apart and hands you both. You get the read, not a verdict.",
    visual: <TwoReadingsCard />,
  },
  {
    kicker: '03 · Evidence, not vibes',
    title: 'Every score is tied to something they said or did.',
    body:
      'Nothing scores high on impression. A strong rating has to be backed by a specific, quoted moment from the interview, surfaced in the report so the hirer sees the evidence, not just the number.',
    visual: <EvidenceCard />,
  },
  {
    kicker: '04 · Same bar, different questions',
    title: "Everyone's questions differ. The bar doesn't.",
    body:
      "No two candidates get the same questions. Each interview is built from their own CV, so it can't be leaked, rehearsed, or looked up. But the qualities being measured, and the standard they're held to, are identical. A self-taught engineer is measured against the same bar as a Cambridge graduate.",
    visual: <OneBarCard />,
  },
]

function FourDecisions() {
  return (
    <section className="py-16 sm:py-20 px-6 bg-earth-50 border-b border-earth-200/80">
      <div className="max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-gold-600 text-[11px] font-semibold uppercase tracking-[0.22em] mb-4">
            How we get a true signal
          </p>
          <h2 className="font-display text-basanite-900 text-3xl sm:text-4xl md:text-5xl leading-[1.15] mb-5">
            Four decisions do the work.
          </h2>
          <p className="text-basanite-600 text-base sm:text-lg leading-relaxed">
            Not a question bank. A method built so the signal survives contact
            with a prepared, AI-assisted candidate.
          </p>
        </div>

        <div className="mt-8 divide-y divide-earth-200">
          {DECISIONS.map((d, i) => (
            <div
              key={d.kicker}
              className="grid md:grid-cols-2 gap-8 md:gap-14 items-center py-12 sm:py-14"
            >
              <div className={i % 2 === 1 ? 'md:order-2' : undefined}>
                <p className="text-clay-600 text-[11px] font-semibold uppercase tracking-[0.22em] mb-3">
                  {d.kicker}
                </p>
                <h3 className="font-display text-basanite-900 text-2xl sm:text-3xl leading-tight mb-4">
                  {d.title}
                </h3>
                <p className="text-basanite-600 text-base leading-relaxed">
                  {d.body}
                </p>
              </div>
              <div className={i % 2 === 1 ? 'md:order-1' : undefined}>
                {d.visual}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
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
