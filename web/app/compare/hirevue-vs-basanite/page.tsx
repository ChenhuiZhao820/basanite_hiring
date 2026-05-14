// Comparison page — HireVue vs Basanite.
//
// HireVue is an async one-way video platform with AI scoring of transcripts.
// Basanite is a live, voice-first conversation that adapts to the candidate.
// This page focuses on async/recorded vs live adaptive, transcript scoring vs
// behaviourally-anchored dimensions, and the missing AI-collaboration round.

import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { LogoMark } from '@/components/Logo'
import { buildMetadata, faqPageJsonLd, breadcrumbJsonLd } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'HireVue vs Basanite — async video interviews or live adaptive AI?',
  description:
    'Fair comparison of HireVue and Basanite. One-way video and transcript scoring versus a live voice conversation built from each candidate’s CV plus a hands-on AI Collaboration round.',
  path: '/compare/hirevue-vs-basanite',
  keywords: [
    'HireVue vs Basanite',
    'HireVue alternative',
    'async video interview replacement',
    'AI interview platform',
  ],
})

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Does HireVue still do facial analysis?',
    a: 'HireVue retired its facial-expression analysis in 2021 after independent audits raised concerns. Today the platform focuses on transcript-based AI scoring of recorded video answers. Basanite scores from transcript and behavioural traces but never analyses facial expression, voice prosody, or affect — those are not predictive enough of engineering judgment to justify the regulatory surface.',
  },
  {
    q: 'Why does live voice matter for technical interviews?',
    a: 'A recorded video answer locks the candidate into one shot at the question with no chance to be probed. Real interviews are adaptive — the interviewer pushes on vagueness, follows up on unsupported claims, and excavates the gap between a confident headline and the underlying reasoning. Basanite does that natively in a 20–30 minute live voice session with an AI interviewer trained on a documented inventory of probing techniques.',
  },
  {
    q: 'Can HireVue test actual coding ability?',
    a: 'HireVue Coding adds a coding workspace alongside the video questions, scored by test cases and code review. It does not, however, evaluate AI orchestration: the candidate is expected to code unaided, which is increasingly disconnected from how engineers actually ship work in 2026. Basanite’s Round 2 requires AI use and instruments the candidate’s judgment around delegation, prompts, and verification.',
  },
  {
    q: 'Is async still better for very large funnels?',
    a: 'Async has one durable advantage — candidates can complete the assessment in their own time across time zones. Basanite is live but very short (20–30 minutes for Round 1) and runs through a self-serve scheduler, so the operational cost is comparable for funnels under several thousand candidates a month. Above that scale, HireVue’s async-first model still has an edge on raw throughput.',
  },
  {
    q: 'How does pricing compare?',
    a: 'HireVue is quote-based and typically targets enterprise budgets — annual contracts in the tens to hundreds of thousands. Basanite is published: £400/mo Starter, £1,500/mo Growth, £3,300+/mo Agency, with no per-candidate uplift inside your plan tier. For mid-market teams running 20–200 technical hires/yr, Basanite is materially cheaper.',
  },
]

type Row = { feature: string; hirevue: string; basanite: string }

const COMPARISON_TABLE: Row[] = [
  {
    feature: 'Interview modality',
    hirevue: 'Async recorded video answers + optional coding workspace',
    basanite: 'Live voice conversation (Round 1) + sandboxed AI coding workbench (Round 2)',
  },
  {
    feature: 'Question source',
    hirevue: 'Customer-configured question bank, identical across candidates',
    basanite: 'Each interview built from the individual candidate’s CV',
  },
  {
    feature: 'Adaptive follow-ups',
    hirevue: 'Not native — questions are pre-recorded prompts',
    basanite: 'Yes — the interviewer probes vagueness, unsupported claims, and gaps in real time',
  },
  {
    feature: 'AI scoring approach',
    hirevue: 'Transcript scored against competency rubric',
    basanite: 'Transcript + observable Round 2 trace scored against 8 metacognitive dimensions',
  },
  {
    feature: 'Facial / affect analysis',
    hirevue: 'Removed in 2021; transcript-only today',
    basanite: 'Never used; not predictive of engineering judgment',
  },
  {
    feature: 'AI cheating resistance',
    hirevue: 'Static video prompts can be answered while reading an AI-generated script off-camera',
    basanite: 'Adaptive follow-ups expose memorised scripts; Round 2 requires and instruments AI use',
  },
  {
    feature: 'Hands-on engineering signal',
    hirevue: 'HireVue Coding (separate module) with test-case scoring',
    basanite: 'Round 2 workbench: real ticket, multi-thousand-line codebase, candidate’s AI agent',
  },
  {
    feature: 'AI orchestration signal',
    hirevue: 'Not measured',
    basanite: 'Six sub-dimensions: delegation, prompts, verification, override, taste, completeness',
  },
  {
    feature: 'Quote-grounded scoring',
    hirevue: 'Score categories with example highlights',
    basanite: 'Every dimension score above 3 must cite a verbatim candidate quote or trace event',
  },
  {
    feature: 'GDPR Article 22',
    hirevue: 'Available through compliance workflows',
    basanite: 'Built-in: consent screen tick-box + self-serve form before any decision is acted on',
  },
  {
    feature: 'Candidate experience',
    hirevue: 'One-way video to camera; can feel impersonal',
    basanite: 'Voice conversation that responds in real time; consistently rated more humane',
  },
  {
    feature: 'ATS integrations',
    hirevue: 'Direct enterprise integrations with major ATSs',
    basanite: '50+ ATSs via Merge.dev (Greenhouse, Lever, Ashby, Workable, BambooHR…)',
  },
  {
    feature: 'Pricing',
    hirevue: 'Quote-based; typically enterprise annual contracts',
    basanite: 'Published: £400 / £1,500 / £3,300+ per month',
  },
]

export default async function HireVueVsBasanitePage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  const ldFaq = faqPageJsonLd(FAQ_ITEMS.map(i => ({ question: i.q, answer: i.a })))
  const ldCrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Compare', path: '/compare/hirevue-vs-basanite' },
    { name: 'HireVue vs Basanite', path: '/compare/hirevue-vs-basanite' },
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

      <SlimNav />

      <main className="max-w-4xl mx-auto px-6 pt-24 pb-32">
        <header className="mb-14">
          <p className="text-gold-700 text-[11px] font-semibold uppercase tracking-[0.25em] mb-4">
            Head-to-head comparison
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[1.05] mb-6">
            HireVue vs Basanite
          </h1>
          <p className="text-basanite-600 text-lg leading-relaxed max-w-2xl">
            HireVue pioneered the async video interview and has scaled it to most of the Fortune 500. Basanite takes a different bet: real interviews are conversations, and the technical layer needs to test how engineers actually ship work in 2026 — with an AI agent in the loop. Here is how they compare.
          </p>
        </header>

        {/* TL;DR */}
        <section className="mb-16 border border-earth-200 bg-white p-6 sm:p-8">
          <h2 className="font-display text-xl text-basanite-900 mb-3">TL;DR</h2>
          <ul className="space-y-3 text-basanite-700 text-base leading-relaxed">
            <li>
              <strong>Pick HireVue</strong> if you need to interview tens of thousands of candidates per year across non-technical roles, async fits your culture, and your assessment philosophy is structured-question-bank rather than adaptive conversation.
            </li>
            <li>
              <strong>Pick Basanite</strong> if you want a live conversation that probes the candidate the way a senior interviewer would, plus a second round that measures how the candidate works with AI agents in a real codebase.
            </li>
            <li>
              <strong>Use both</strong> if HireVue is your culture-fit and behavioural front door and you want a defensible technical layer underneath.
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
                  <th className="font-display font-normal text-basanite-900 px-4 py-3">HireVue</th>
                  <th className="font-display font-normal text-basanite-900 px-4 py-3">Basanite</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_TABLE.map((row, i) => (
                  <tr key={i} className="border-t border-earth-200 align-top">
                    <td className="px-4 py-3 font-medium text-basanite-900">{row.feature}</td>
                    <td className="px-4 py-3 text-basanite-600">{row.hirevue}</td>
                    <td className="px-4 py-3 text-basanite-600">{row.basanite}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* What HireVue is best at */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-4">What HireVue does well</h2>
          <div className="text-basanite-700 text-base leading-relaxed space-y-4 max-w-3xl">
            <p>
              HireVue has spent more than a decade industrialising async video at scale. The platform handles enormous candidate volumes — graduate intake at global banks, hourly hiring at retail chains, structured screens at logistics companies — with a level of operational maturity that smaller competitors simply do not have.
            </p>
            <p>
              Their question library is genuinely useful for behavioural and competency interviews, and the analytics surface adverse-impact concerns in a way that compliance teams trust. The async-first model also lets candidates complete assessments outside business hours and across time zones, which matters for global pipelines.
            </p>
            <p>
              HireVue also responded responsibly to criticism of their early facial-analysis features — they retired them in 2021 after independent audits, which is more than several of their imitators have done.
            </p>
          </div>
        </section>

        {/* Where Basanite differs */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-4">Where Basanite differs</h2>
          <div className="text-basanite-700 text-base leading-relaxed space-y-4 max-w-3xl">
            <p>
              Basanite is not trying to be a generalist enterprise platform. It is purpose-built for technical hiring, and the design choices reflect three convictions.
            </p>
            <p>
              <strong>Conversation beats monologue.</strong> When a candidate gives a confident headline and moves on, a recorded video has no way to ask the follow-up that exposes whether the headline is real or memorised. Basanite Round 1 is a live voice conversation with an AI interviewer trained to probe vagueness, surface unsupported claims, and trace what the candidate actually did from what they say they did.
            </p>
            <p>
              <strong>The actual job has changed.</strong> HireVue Coding still tests engineers as if they ship code unaided. The dominant engineering workflow in 2026 is orchestrating an AI agent — Claude Code, Cursor, Copilot, Aider — and the candidates who win interviews with this skill are not the ones who win on a traditional take-home. Basanite Round 2 is built around that reality.
            </p>
            <p>
              <strong>Every score must be backed by evidence.</strong> HireVue surfaces example clips alongside its scores. Basanite goes further: no dimension can be scored above 3 without a verbatim candidate quote or an observable Round 2 trace event cited as evidence. The report is designed as a briefing for the final human-led interview, not a substitute for it.
            </p>
          </div>
        </section>

        {/* Use case fit */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-6">Which one fits you?</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="border border-earth-200 bg-white p-6">
              <h3 className="font-display text-lg text-basanite-900 mb-3">Pick HireVue if…</h3>
              <ul className="space-y-2 text-basanite-600 text-sm leading-relaxed list-disc pl-5 marker:text-gold-600">
                <li>You hire across many non-technical functions and need one tool for all of them</li>
                <li>Async video matches your culture and global time-zone footprint</li>
                <li>Volume regularly exceeds several thousand candidates per month</li>
                <li>Your compliance team has approved HireVue’s existing audit posture</li>
              </ul>
            </div>
            <div className="border border-earth-200 bg-white p-6">
              <h3 className="font-display text-lg text-basanite-900 mb-3">Pick Basanite if…</h3>
              <ul className="space-y-2 text-basanite-600 text-sm leading-relaxed list-disc pl-5 marker:text-gold-600">
                <li>You hire engineers, ML researchers, security engineers, or applied-AI builders</li>
                <li>You want an adaptive live conversation, not a one-way video</li>
                <li>Measuring how candidates work with AI agents is core to the role</li>
                <li>You need defensible UK / EU GDPR documentation including Article 22</li>
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
              <span className="text-basanite-600">Static coding tests versus CV-grounded adaptive interviews.</span>
            </Link>
            <Link href="/compare/karat-vs-basanite" className="border border-earth-200 bg-white p-4 hover:border-gold-500 transition-colors">
              <span className="block font-display text-basanite-900 mb-1">Karat vs Basanite</span>
              <span className="text-basanite-600">Human interviewers-as-a-service versus instrumented AI interviewing.</span>
            </Link>
            <Link href="/alternatives/hirevue" className="border border-earth-200 bg-white p-4 hover:border-gold-500 transition-colors">
              <span className="block font-display text-basanite-900 mb-1">HireVue alternatives</span>
              <span className="text-basanite-600">A wider survey of HireVue alternatives in 2026.</span>
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
            Book a 20-minute call. We will run a real adaptive interview against a sample CV and walk you through the report side by side with a HireVue export if you bring one.
          </p>
          <a
            href="https://cal.eu/basanite/intro"
            target="_blank"
            rel="noreferrer"
            className="inline-block px-6 py-3 bg-basanite-900 text-white text-sm font-medium hover:bg-gold-600 transition-colors"
          >
            Book a call
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

function SlimNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-earth-50/85 backdrop-blur-md border-b border-earth-200/60">
      <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark size={26} dark />
          <span className="font-display text-basanite-900 text-lg">Basanite</span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-5 text-sm text-basanite-600">
          <Link href="/pricing" className="hidden sm:inline hover:text-basanite-900 transition-colors">Pricing</Link>
          <Link href="/faq" className="hidden sm:inline hover:text-basanite-900 transition-colors">FAQ</Link>
          <a
            href="https://cal.eu/basanite/intro"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-basanite-900 border border-basanite-900 px-4 py-2 hover:bg-basanite-900 hover:text-earth-50 transition-colors duration-200"
          >
            Book a call
          </a>
        </div>
      </div>
    </nav>
  )
}

function SlimFooter() {
  return (
    <footer className="border-t border-earth-200 bg-white">
      <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-basanite-500">
        <p>Built in Manchester by Drew, Lynn and Aditya.</p>
        <div className="flex items-center gap-5">
          <Link href="/" className="hover:text-basanite-900 transition-colors">Home</Link>
          <Link href="/pricing" className="hover:text-basanite-900 transition-colors">Pricing</Link>
          <Link href="/faq" className="hover:text-basanite-900 transition-colors">FAQ</Link>
          <Link href="/about" className="hover:text-basanite-900 transition-colors">About</Link>
          <Link href="/contact" className="hover:text-basanite-900 transition-colors">Contact</Link>
        </div>
      </div>
    </footer>
  )
}
