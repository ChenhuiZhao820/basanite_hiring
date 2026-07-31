// Comparison page — HackerRank vs Basanite.
//
// Targets head-to-head search intent. Static questions vs CV-grounded
// adaptive conversation; standardised coding test vs AI Collaboration
// Workbench; large brand familiarity vs purpose-built for the AI era.

import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { SiteNav } from '@/components/SiteNav'
import { buildMetadata, faqPageJsonLd, breadcrumbJsonLd } from '@/lib/seo'
import { REGISTER_INTEREST_URL } from '@/lib/links'

export const metadata: Metadata = buildMetadata({
  title: 'HackerRank vs Basanite — which is right for your technical hiring?',
  description:
    'A fair, detailed comparison of HackerRank and Basanite. Static coding tests vs CV-grounded conversational interviews with an AI Collaboration round. See where each platform fits in 2026.',
  path: '/compare/hackerrank-vs-basanite',
  keywords: [
    'HackerRank vs Basanite',
    'HackerRank alternative',
    'AI-resistant coding interview',
    'technical interview platform comparison',
  ],
})

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Is HackerRank still useful in 2026?',
    a: 'For roles where you genuinely need a screening filter on basic syntactic competence, HackerRank still works. Where it falls down is mid- and senior-level hiring, because the same AI agents that candidates use at work will solve the take-home in seconds. The signal collapses, but the cost of the test does not.',
  },
  {
    q: 'Does Basanite have a coding round at all?',
    a: 'Yes. Round 2 is the AI Collaboration Workbench — a sandboxed VS Code environment with a multi-thousand-line role-matched codebase and a real ticket. The candidate uses their own AI agent (Claude Code, Cursor, Copilot, or Aider) and we score how judiciously they orchestrate it. The point is not whether they can solve LeetCode without AI; it is whether they ship calibrated, complete work with AI in the loop.',
  },
  {
    q: 'How does Basanite stop candidates cheating?',
    a: 'In Round 1, every question is built from the candidate’s own CV, so leaked answer banks do not help. In Round 2, we invert the standard posture: instead of trying to ban AI we require it, instrument it, and score the judgment behind its use. Identity verification, behavioural biometrics against a Round 1 baseline, and a mid-session check-in handle substitution risk.',
  },
  {
    q: 'Can I use Basanite alongside HackerRank?',
    a: 'Yes. Some teams keep HackerRank for very-high-volume top-of-funnel filtering, then route candidates who pass into Basanite for the deeper Round 1 conversation and Round 2 workbench. We integrate with Greenhouse, Lever, Ashby and 50+ other ATSs via Merge.dev, so the handoff is automated.',
  },
  {
    q: 'How does pricing compare?',
    a: 'HackerRank quotes vary by seat count and feature tier but typically start in the low four figures per month for serious deployments and scale into the tens of thousands annually. Basanite is published: Starter is £400/mo for small teams, Growth £1,500/mo, Agency £3,300+/mo. For most teams running 30+ technical hires per year, Basanite is materially cheaper than HackerRank plus the recruiter time HackerRank still requires.',
  },
]

type Row = { feature: string; hackerrank: string; basanite: string }

const COMPARISON_TABLE: Row[] = [
  {
    feature: 'Primary interview format',
    hackerrank: 'Timed coding tests, take-homes, optional live pair-coding',
    basanite: 'Conversational voice interview (Round 1) + AI Collaboration workbench (Round 2)',
  },
  {
    feature: 'Question generation',
    hackerrank: 'Curated library + custom challenges shared across candidates',
    basanite: 'Every interview built from the individual candidate’s CV — no two candidates see the same questions',
  },
  {
    feature: 'Resistance to AI cheating',
    hackerrank: 'Static questions are trivially solvable by Claude / GPT / Cursor in seconds',
    basanite: 'Unique CV-grounded questions in Round 1; AI is required and instrumented in Round 2',
  },
  {
    feature: 'AI orchestration signal',
    hackerrank: 'Not measured',
    basanite: 'Six observable sub-dimensions: delegation calibration, prompt quality, verification rigor, override judgment, engineering taste, solution completeness',
  },
  {
    feature: 'Voice / conversational round',
    hackerrank: 'CodePair lets a human conduct a session; no AI interviewer',
    basanite: 'Native 20–30 minute voice conversation with an adaptive AI interviewer',
  },
  {
    feature: 'Scoring rubric',
    hackerrank: 'Test cases pass/fail; plagiarism flags',
    basanite: '8 metacognitive dimensions from cognitive-science literature, each behaviourally anchored',
  },
  {
    feature: 'Evidence in the report',
    hackerrank: 'Code submission + score + plagiarism delta',
    basanite: 'Every score above 3 must cite a verbatim candidate quote or Round 2 trace observation',
  },
  {
    feature: 'GDPR Article 22 (right to human review)',
    hackerrank: 'Available on request',
    basanite: 'Built-in consent flow and self-serve form before any decision is acted on',
  },
  {
    feature: 'Candidate feedback report',
    hackerrank: 'Score visibility varies by employer setting',
    basanite: 'Every candidate gets a personal feedback report regardless of outcome',
  },
  {
    feature: 'ATS integrations',
    hackerrank: 'Direct integrations with 30+ ATSs',
    basanite: '50+ ATSs via Merge.dev (Greenhouse, Lever, Ashby, Workable, BambooHR…)',
  },
  {
    feature: 'Time-to-result',
    hackerrank: 'Tests can be auto-scored; engineer-led reviews bottleneck longer assessments',
    basanite: 'Round 1 report within minutes of session end; Round 2 report within an hour',
  },
  {
    feature: 'Best-fit company size',
    hackerrank: 'Enterprise with established coding-test cadence',
    basanite: 'Series A through mid-market, plus recruitment agencies running 30+ technical roles/yr',
  },
  {
    feature: 'Pricing transparency',
    hackerrank: 'Quote-based, seat tiers',
    basanite: 'Published: £400 / £1,500 / £3,300+ per month',
  },
]

export default async function HackerRankVsBasanitePage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  const ldFaq = faqPageJsonLd(FAQ_ITEMS.map(i => ({ question: i.q, answer: i.a })))
  const ldCrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Compare', path: '/compare/hackerrank-vs-basanite' },
    { name: 'HackerRank vs Basanite', path: '/compare/hackerrank-vs-basanite' },
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
            HackerRank vs Basanite
          </h1>
          <p className="text-basanite-600 text-lg leading-relaxed max-w-2xl">
            HackerRank is the brand most engineering leaders reach for when they need a coding assessment. Basanite is purpose-built for an era in which every candidate has Claude or Cursor open in the next tab. Here is how the two compare, what each is best at, and how to decide.
          </p>
        </header>

        {/* TL;DR */}
        <section className="mb-16 border border-earth-200 bg-white p-6 sm:p-8">
          <h2 className="font-display text-xl text-basanite-900 mb-3">TL;DR</h2>
          <ul className="space-y-3 text-basanite-700 text-base leading-relaxed">
            <li>
              <strong>Pick HackerRank</strong> if you run very-high-volume early-stage screening of fundamentals, your team is already trained on it, and your roles tolerate static coding tests in the AI era.
            </li>
            <li>
              <strong>Pick Basanite</strong> if you want to test how candidates actually work — judgment in conversation, plus calibrated AI-augmented engineering in a real codebase — and you want every score backed by a quote.
            </li>
            <li>
              <strong>Use both</strong> if your funnel needs a syntax filter before the deeper interview. They integrate cleanly via the same ATS.
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
                  <th className="font-display font-normal text-basanite-900 px-4 py-3">HackerRank</th>
                  <th className="font-display font-normal text-basanite-900 px-4 py-3">Basanite</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_TABLE.map((row, i) => (
                  <tr key={i} className="border-t border-earth-200 align-top">
                    <td className="px-4 py-3 font-medium text-basanite-900">{row.feature}</td>
                    <td className="px-4 py-3 text-basanite-600">{row.hackerrank}</td>
                    <td className="px-4 py-3 text-basanite-600">{row.basanite}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* What HackerRank is best at */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-4">What HackerRank is genuinely good at</h2>
          <div className="text-basanite-700 text-base leading-relaxed space-y-4 max-w-3xl">
            <p>
              HackerRank earned its place in the technical hiring stack. The library of questions is enormous, the certification rails are mature, and the brand recognition means candidates often arrive already familiar with how to take the test. For a team hiring volumes of junior engineers from a wide funnel — typically internships, new-grad pipelines, large outsourcing arrangements — HackerRank still delivers a defensible competence filter.
            </p>
            <p>
              Its CodePair offering also genuinely helps engineering managers who want to conduct live pair-programming with a candidate inside a shared editor. Test cases give a fast, structured signal on whether the candidate can write code that compiles and passes basic correctness checks. None of that is going away just because AI exists.
            </p>
            <p>
              And for organisations that have spent years building structured rubrics around HackerRank results, the cost of ripping it out is real. We do not pretend otherwise.
            </p>
          </div>
        </section>

        {/* Where Basanite differs */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-4">Where Basanite is different</h2>
          <div className="text-basanite-700 text-base leading-relaxed space-y-4 max-w-3xl">
            <p>
              The premise behind Basanite is that the technical interview has two unsolved problems in 2026, and HackerRank addresses neither directly.
            </p>
            <p>
              <strong>The first problem is AI cheating.</strong> Any static coding test — a HackerRank challenge, a take-home, a LeetCode-style problem — can be solved by Claude Code or Cursor faster than the candidate can read the brief. Plagiarism detection catches verbatim copy-paste but not a rewritten solution. Basanite’s Round 1 sidesteps this by building every conversation from the candidate’s own CV: leaked answer banks do not help when no two candidates are asked the same question.
            </p>
            <p>
              <strong>The second problem is that the actual job has changed.</strong> Senior engineers do not write code in a vacuum anymore — they orchestrate AI agents to do most of the typing while they hold judgment over the architecture, edge cases, and verification. That skill is invisible to any test that bans AI. Basanite’s Round 2 inverts the posture: the candidate must use an AI agent in a real codebase, and we instrument their delegation, prompts, verification, override decisions, and final ship quality.
            </p>
            <p>
              Scoring is also different in kind. HackerRank gives you a pass/fail and a plagiarism delta. Basanite gives you a dimension-by-dimension report with verbatim candidate quotes pinned to every score above 3 — designed as a briefing for the final human-led interview, not as a substitute for it.
            </p>
          </div>
        </section>

        {/* Use case fit */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-6">Which one fits you?</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="border border-earth-200 bg-white p-6">
              <h3 className="font-display text-lg text-basanite-900 mb-3">Pick HackerRank if…</h3>
              <ul className="space-y-2 text-basanite-600 text-sm leading-relaxed list-disc pl-5 marker:text-gold-600">
                <li>You hire hundreds of junior or new-grad engineers per quarter</li>
                <li>You need a brand-name credential the candidate population already recognises</li>
                <li>Existing rubrics are scaffolded around HackerRank scores and you cannot easily migrate</li>
                <li>You are comfortable that AI cheating will keep eroding your signal over time</li>
              </ul>
            </div>
            <div className="border border-earth-200 bg-white p-6">
              <h3 className="font-display text-lg text-basanite-900 mb-3">Pick Basanite if…</h3>
              <ul className="space-y-2 text-basanite-600 text-sm leading-relaxed list-disc pl-5 marker:text-gold-600">
                <li>You hire mid-to-senior engineers where judgment and AI orchestration matter</li>
                <li>You want every dimension score backed by a verbatim candidate quote</li>
                <li>You need defensible GDPR-grade documentation, including right to human review</li>
                <li>Your recruiters are spending hours on screening that could move to a managed interview</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-4">Pricing</h2>
          <div className="text-basanite-700 text-base leading-relaxed space-y-3 max-w-3xl">
            <p>
              HackerRank prices privately by seat and feature tier; mid-market deployments commonly sit in the £15k–£60k annual range, plus the engineering time required to set up and review challenges.
            </p>
            <p>
              Basanite is published and predictable: <strong>Starter £400/mo</strong> for small teams (~10 technical hires/year), <strong>Growth £1,500/mo</strong> for typical Series-B engineering orgs, <strong>Agency £3,300+/mo</strong> for recruitment firms and high-volume teams. There is no per-candidate uplift inside your plan tier.
            </p>
            <p>
              For most engineering teams in our pipeline, total Basanite spend including recruiter time is materially below a comparable HackerRank deployment.
            </p>
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
            <Link href="/compare/hirevue-vs-basanite" className="border border-earth-200 bg-white p-4 hover:border-gold-500 transition-colors">
              <span className="block font-display text-basanite-900 mb-1">HireVue vs Basanite</span>
              <span className="text-basanite-600">Async video scoring versus live adaptive conversation.</span>
            </Link>
            <Link href="/compare/karat-vs-basanite" className="border border-earth-200 bg-white p-4 hover:border-gold-500 transition-colors">
              <span className="block font-display text-basanite-900 mb-1">Karat vs Basanite</span>
              <span className="text-basanite-600">Human interviewers-as-a-service versus instrumented AI interviewing.</span>
            </Link>
            <Link href="/compare/codesignal-vs-basanite" className="border border-earth-200 bg-white p-4 hover:border-gold-500 transition-colors">
              <span className="block font-display text-basanite-900 mb-1">CodeSignal vs Basanite</span>
              <span className="text-basanite-600">Coding library versus CV-grounded, AI-instrumented assessment.</span>
            </Link>
            <Link href="/alternatives/hackerrank" className="border border-earth-200 bg-white p-4 hover:border-gold-500 transition-colors">
              <span className="block font-display text-basanite-900 mb-1">HackerRank alternatives</span>
              <span className="text-basanite-600">A wider survey of HackerRank alternatives in 2026.</span>
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
