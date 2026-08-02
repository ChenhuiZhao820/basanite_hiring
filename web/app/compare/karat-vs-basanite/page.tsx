// Comparison page — Karat vs Basanite.
//
// Karat sends a human engineer to conduct a structured interview on the
// customer's behalf. Basanite uses an AI interviewer plus an instrumented AI
// Collaboration round. This page is honest about the inherent trust premium
// human interviewers carry and explains the structural cost / scale tradeoff.

import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { SiteNav } from '@/components/SiteNav'
import { buildMetadata, faqPageJsonLd, breadcrumbJsonLd } from '@/lib/seo'
import { REGISTER_INTEREST_URL } from '@/lib/links'

export const metadata: Metadata = buildMetadata({
  title: 'Karat vs Basanite — human interviewers vs instrumented AI',
  description:
    'A fair comparison of Karat’s interview-as-a-service model and Basanite’s AI-native technical interview platform. Cost, scale, consistency, and what each format is genuinely good at.',
  path: '/compare/karat-vs-basanite',
  keywords: [
    'Karat vs Basanite',
    'Karat alternative',
    'interview as a service alternative',
    'AI technical interview',
  ],
})

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Why would you trust an AI interviewer over a human one?',
    a: 'You should not trust either blindly. The argument for Karat is that human interviewers carry inherent legitimacy and can read context the way a peer-engineer reading-room would. The argument for Basanite is consistency at scale: the same dimensional rubric applied identically across every candidate, every score backed by a verbatim quote, and a recording the hirer can audit any time. The trustworthy answer is to keep humans in the loop for the final decision — which is exactly how Basanite is designed.',
  },
  {
    q: 'Does Karat actually scale?',
    a: 'Karat scales as fast as it can recruit, train, and retain its panel of contract interviewers. That is real engineering throughput — and it is also real opex. For high-volume hiring programmes the per-interview cost stays roughly constant; for variable-volume hiring it bills per session even when you are not running an active funnel. Basanite is platform-priced, so the marginal cost of an extra interview is effectively zero inside your plan tier.',
  },
  {
    q: 'How does Basanite measure things a human interviewer naturally would?',
    a: 'The 22 named techniques inside Round 1 — narrative anchoring, boundary-condition probing, vagueness targeting, counterfactual pressure, tacit-knowledge consistency testing — are formalisations of what experienced human interviewers do intuitively. Round 2 then captures something even a senior human cannot easily see: the candidate’s judgment in real-time AI orchestration, instrumented across keystrokes, agent prompts, git state, and verification behaviour.',
  },
  {
    q: 'What is the cheating story for Karat?',
    a: 'Karat’s interviewers can observe a candidate in real time and notice when the answers are being read off-camera. That is a genuine cheating defence. Where the model strains is the AI era: even a vigilant human interviewer cannot easily tell whether the candidate has Claude open in the next monitor whispering follow-up questions. Basanite resolves this differently — by making the AI use mandatory and the orchestration legible, then scoring the judgment behind it.',
  },
  {
    q: 'How does pricing compare?',
    a: 'Karat publishes per-interview pricing in the range of US$300–600+ depending on seniority and pipeline volume; a 100-hire technical funnel can quickly run into six figures of interview-only spend. Basanite is platform-priced: £400/mo Starter, £1,500/mo Growth, £3,300+/mo Agency. For most teams running 30+ technical hires per year, switching to Basanite is a 60–90% reduction in unit interview cost.',
  },
]

type Row = { feature: string; karat: string; basanite: string }

const COMPARISON_TABLE: Row[] = [
  {
    feature: 'Interview format',
    karat: 'Human engineer conducts a structured coding interview on your behalf',
    basanite: 'AI interviewer (Round 1) + sandboxed AI coding workbench (Round 2)',
  },
  {
    feature: 'Question source',
    karat: 'Curated structured question bank, sometimes customised to the customer',
    basanite: 'Each interview built from the individual candidate’s CV',
  },
  {
    feature: 'Consistency between sessions',
    karat: 'Calibrated through interviewer training; some between-interviewer variance is unavoidable',
    basanite: 'Identical scoring rubric applied by the same model on every candidate',
  },
  {
    feature: 'Throughput per day',
    karat: 'Bounded by panel size and scheduling',
    basanite: 'Bounded only by candidates’ availability; effectively unbounded for the customer',
  },
  {
    feature: 'AI orchestration signal',
    karat: 'Not formally measured',
    basanite: '6 sub-dimensions instrumented across the Round 2 workbench session',
  },
  {
    feature: 'Quote-grounded evidence',
    karat: 'Interviewer notes attached to score; quality varies by interviewer',
    basanite: 'Every score above 3 must cite a verbatim candidate quote or trace event',
  },
  {
    feature: 'Adverse-impact / bias audit',
    karat: 'Possible through structured rubric and interviewer training',
    basanite: 'Auditable: same model, same rubric, every report timestamped and recoverable',
  },
  {
    feature: 'Cheating defence',
    karat: 'Live human observer notices off-camera coaching',
    basanite: 'CV-grounded unique questions; instrumented AI use; identity + biometric checks',
  },
  {
    feature: 'GDPR Article 22',
    karat: 'Mostly inapplicable — humans are the decision-makers',
    basanite: 'Built-in consent flow and self-serve form before any decision is acted on',
  },
  {
    feature: 'Candidate feedback',
    karat: 'Generally not provided to candidate',
    basanite: 'Every candidate gets a personal feedback report regardless of outcome',
  },
  {
    feature: 'Scheduling time',
    karat: 'Days to schedule against panel availability',
    basanite: 'Self-serve scheduling; most candidates interview within 48 hours',
  },
  {
    feature: 'Unit pricing',
    karat: 'Per-interview, $300–600+ typical',
    basanite: 'Subscription: £400 / £1,500 / £3,300+ per month with no per-interview uplift',
  },
]

export default async function KaratVsBasanitePage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  const ldFaq = faqPageJsonLd(FAQ_ITEMS.map(i => ({ question: i.q, answer: i.a })))
  const ldCrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Compare', path: '/compare/karat-vs-basanite' },
    { name: 'Karat vs Basanite', path: '/compare/karat-vs-basanite' },
  ])

  return (
    <div className="min-h-screen bg-earth-50 text-basanite-900">
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldFaq) }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldCrumbs) }}
      />

      <SiteNav />

      <main className="max-w-4xl mx-auto px-6 pt-24 pb-32">
        <header className="mb-14">
          <p className="text-gold-700 text-[11px] font-semibold uppercase tracking-[0.25em] mb-4">
            Head-to-head comparison
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[1.05] mb-6">
            Karat vs Basanite
          </h1>
          <p className="text-basanite-600 text-lg leading-relaxed max-w-2xl">
            Karat sends a human engineer to interview your candidates. Basanite runs an AI interviewer and an instrumented AI Collaboration round. Both are answers to the same problem — engineering teams cannot afford to spend their best people on first-round screens — and the choice between them is largely about cost, scale, and how you want signal to be evidenced.
          </p>
        </header>

        {/* TL;DR */}
        <section className="mb-16 border border-earth-200 bg-white p-6 sm:p-8">
          <h2 className="font-display text-xl text-basanite-900 mb-3">TL;DR</h2>
          <ul className="space-y-3 text-basanite-700 text-base leading-relaxed">
            <li>
              <strong>Pick Karat</strong> if a human engineer in the interview chair is non-negotiable for your stakeholders, your hiring volume is steady and well-funded, and you do not need to measure AI-collaboration skill explicitly.
            </li>
            <li>
              <strong>Pick Basanite</strong> if you need consistency at scale, quote-grounded scoring, an AI-orchestration round, and unit economics that work for a Series-A through mid-market engineering team.
            </li>
            <li>
              <strong>Use both</strong> if Karat is your senior-band gold-standard and Basanite handles the mid-band funnel at scale.
            </li>
          </ul>
        </section>

        {/* Comparison table */}
        <section className="mb-20">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-6">Side-by-side</h2>
          <div className="overflow-x-auto border border-earth-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-earth-100 text-left">
                  <th className="font-display font-normal text-basanite-900 px-4 py-3 w-[28%]">Feature</th>
                  <th className="font-display font-normal text-basanite-900 px-4 py-3">Karat</th>
                  <th className="font-display font-normal text-basanite-900 px-4 py-3">Basanite</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_TABLE.map((row, i) => (
                  <tr key={i} className="border-t border-earth-200 align-top">
                    <td className="px-4 py-3 font-medium text-basanite-900">{row.feature}</td>
                    <td className="px-4 py-3 text-basanite-600">{row.karat}</td>
                    <td className="px-4 py-3 text-basanite-600">{row.basanite}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* What Karat is best at */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-4">What Karat is genuinely good at</h2>
          <div className="text-basanite-700 text-base leading-relaxed space-y-4 max-w-3xl">
            <p>
              Karat invented the category of interview-as-a-service and they are still the best-known operator in it. There is a real value in handing a structured interview to a vetted engineer who has personally conducted hundreds of them — they spot patterns that a less-experienced internal interviewer would miss, they can hold a consistent calibration across many candidates, and they can read context cues that come naturally to humans and not yet to AI.
            </p>
            <p>
              For organisations where the stakeholder commitment is a human in the chair — sometimes for legal-defensibility reasons, sometimes for cultural reasons, sometimes because the senior engineering audience needs to feel a peer interviewed the candidate — Karat is a genuinely good fit. Their interviewers are experienced, their rubric is calibrated, and they take operational interview load off your engineering team.
            </p>
            <p>
              The model is honest about its limits, too: Karat positions itself as a screening layer that should be followed by an internal final-round interview. We agree with that posture and design Basanite the same way.
            </p>
          </div>
        </section>

        {/* Where Basanite differs */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-4">Where Basanite is different</h2>
          <div className="text-basanite-700 text-base leading-relaxed space-y-4 max-w-3xl">
            <p>
              The Karat model and the Basanite model are answers to the same structural problem from different directions. Karat industrialises human labour to keep human interviewers in the chair. Basanite industrialises AI to keep cost and scale linear.
            </p>
            <p>
              <strong>Consistency.</strong> However well Karat trains its panel, two interviewers are never quite the same instrument. Basanite is one instrument applied to every candidate. That is a quality limit in some respects and a quality floor in others — it means the bar is identical regardless of which interviewer the candidate happened to draw.
            </p>
            <p>
              <strong>AI collaboration signal.</strong> A human interviewer can ask whether the candidate uses Cursor or Copilot, but they cannot watch the candidate orchestrate one in real time across a real codebase. Basanite Round 2 does exactly that: a sandboxed VS Code environment, a multi-thousand-line role-matched codebase, a real ticket, and the candidate’s own AI agent — instrumented across delegation calibration, prompt quality, verification rigor, override judgment, engineering taste, and solution completeness.
            </p>
            <p>
              <strong>Evidence on every score.</strong> Karat interviewers attach detailed notes. Basanite goes further — no dimension can be scored above 3 without a verbatim candidate quote or an observable trace event. The report is built as a briefing document for your final human interview, not as a substitute for it.
            </p>
            <p>
              <strong>Unit economics.</strong> Karat is per-interview. Basanite is per-plan. For most teams hiring 30+ technical roles per year, the spend gap is large.
            </p>
          </div>
        </section>

        {/* Use case fit */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-6">Which one fits you?</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="border border-earth-200 bg-white p-6">
              <h3 className="font-display text-lg text-basanite-900 mb-3">Pick Karat if…</h3>
              <ul className="space-y-2 text-basanite-600 text-sm leading-relaxed list-disc pl-5 marker:text-gold-600">
                <li>A human engineer in the chair is mandatory for your stakeholders</li>
                <li>You can absorb $300–600+ per interview at your funnel volume</li>
                <li>Senior-band executive hiring where a peer-engineer signal is essential</li>
                <li>You do not need to measure AI-collaboration skill explicitly yet</li>
              </ul>
            </div>
            <div className="border border-earth-200 bg-white p-6">
              <h3 className="font-display text-lg text-basanite-900 mb-3">Pick Basanite if…</h3>
              <ul className="space-y-2 text-basanite-600 text-sm leading-relaxed list-disc pl-5 marker:text-gold-600">
                <li>You hire engineers across mid- and senior-bands at meaningful volume</li>
                <li>Consistency between interviewers matters more than human chair-time</li>
                <li>You want a Round 2 that captures AI-collaboration judgment</li>
                <li>You need fast scheduling and predictable platform pricing</li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-6">FAQ</h2>
          <div className="border-t border-earth-200">
            {FAQ_ITEMS.map((item, i) => (
              <details key={i} className="group border-b border-earth-200 [&_summary::-webkit-details-marker]:hidden">
                <summary className="cursor-pointer list-none py-5 flex items-start justify-between gap-6 hover:bg-earth-100/40 transition-colors -mx-3 px-3">
                  <span className="font-display text-basanite-900 text-base sm:text-lg leading-snug">{item.q}</span>
                  <span aria-hidden="true" className="shrink-0 mt-1 text-gold-600 transition-transform duration-200 group-open:rotate-45 text-2xl leading-none">+</span>
                </summary>
                <div className="text-basanite-600 text-base leading-relaxed pb-6 pr-10 max-w-3xl">{item.a}</div>
              </details>
            ))}
          </div>
        </section>

        {/* Related comparisons */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-4">Other comparisons</h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <Link href="/compare/hackerrank-vs-basanite" className="border border-earth-200 bg-white p-4 hover:border-gold-500 transition-colors">
              <span className="block font-display text-basanite-900 mb-1">HackerRank vs Basanite</span>
              <span className="text-basanite-600">Static coding tests vs CV-grounded interviewing.</span>
            </Link>
            <Link href="/compare/codesignal-vs-basanite" className="border border-earth-200 bg-white p-4 hover:border-gold-500 transition-colors">
              <span className="block font-display text-basanite-900 mb-1">CodeSignal vs Basanite</span>
              <span className="text-basanite-600">Coding library platform vs AI-instrumented evaluation.</span>
            </Link>
            <Link href="/alternatives/karat" className="border border-earth-200 bg-white p-4 hover:border-gold-500 transition-colors">
              <span className="block font-display text-basanite-900 mb-1">Karat alternatives</span>
              <span className="text-basanite-600">A wider survey of Karat alternatives in 2026.</span>
            </Link>
            <Link href="/alternatives/mercor" className="border border-earth-200 bg-white p-4 hover:border-gold-500 transition-colors">
              <span className="block font-display text-basanite-900 mb-1">Mercor alternatives</span>
              <span className="text-basanite-600">The newer wave of AI-conversational interviewers.</span>
            </Link>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-16 border-t border-earth-200 pt-12 text-center">
          <h2 className="font-display text-2xl text-basanite-900 mb-3">See Basanite live</h2>
          <p className="text-basanite-600 text-base mb-6 max-w-xl mx-auto">
            Register your interest and we&rsquo;ll be in touch. We will run a real CV-grounded interview against a sample candidate and walk you through the report.
          </p>
          <a
            href={REGISTER_INTEREST_URL}
            className="inline-block px-6 py-3 bg-basanite-900 text-white text-sm font-medium hover:bg-gold-600 transition-colors"
          >
            Register interest
          </a>
          <p className="mt-4 text-sm text-basanite-500">
            Or <Link href="/contact" className="underline hover:text-basanite-900">send us a note</Link>.
          </p>
        </section>
      </main>

      <SlimFooter />
    </div>
  )
}

function SlimFooter() {
  return (
    <footer className="border-t border-earth-200 bg-white">
      <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-basanite-500">
        <p>&copy; {new Date().getFullYear()} Basanite.</p>
        <div className="flex items-center gap-5">
          <Link href="/" className="hover:text-basanite-900 transition-colors">Home</Link>
          <Link href="/faq" className="hover:text-basanite-900 transition-colors">FAQ</Link>
          <Link href="/about" className="hover:text-basanite-900 transition-colors">About</Link>
          <Link href="/contact" className="hover:text-basanite-900 transition-colors">Contact</Link>
        </div>
      </div>
    </footer>
  )
}
