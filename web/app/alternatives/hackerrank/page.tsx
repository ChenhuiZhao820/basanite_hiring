// Alternatives page — HackerRank alternatives in 2026.
//
// Lists Basanite as the most relevant alternative for teams concerned about
// AI cheating, then gives fair coverage of CodeSignal, HireVue, Karat, Mercor.
// Target intent: "HackerRank alternative", "alternatives to HackerRank".

import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { SiteNav } from '@/components/SiteNav'
import { buildMetadata, faqPageJsonLd, breadcrumbJsonLd } from '@/lib/seo'
import { REGISTER_INTEREST_URL } from '@/lib/links'

export const metadata: Metadata = buildMetadata({
  title: 'HackerRank alternatives in 2026 — five platforms to consider',
  description:
    'A practical guide to HackerRank alternatives in 2026. Why teams are looking, what the AI-cheating problem looks like, and how Basanite, CodeSignal, HireVue, Karat and Mercor compare.',
  path: '/alternatives/hackerrank',
  keywords: [
    'HackerRank alternative',
    'HackerRank alternatives 2026',
    'replace HackerRank',
    'AI-resistant coding test',
  ],
})

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Why are so many teams replacing HackerRank in 2026?',
    a: 'The fundamental problem is that static coding tests are trivially solvable by Claude, GPT, and Cursor in seconds. Plagiarism detection catches verbatim copy-paste but not rewritten AI solutions. Teams that have used HackerRank for years are finding their scores no longer correlate with on-the-job performance — and the recruiter time HackerRank still requires has not decreased.',
  },
  {
    q: 'Is the cheapest HackerRank alternative worth it?',
    a: 'Cheaper alternatives that are themselves static-coding-test platforms inherit HackerRank’s underlying weakness. The right question is not which alternative is cheaper at sticker price, but which alternative actually produces predictive signal at the volumes you hire at. The cost of a bad hire dwarfs the cost of any technical-assessment platform.',
  },
  {
    q: 'Does Basanite have a free tier or a trial?',
    a: 'We run paid pilots calibrated to your role mix. The pilot includes a working interview, a sample report, and a fit conversation about the eight dimensions and how they map to your hiring rubric. Register your interest via the link at the bottom of this page to start one.',
  },
  {
    q: 'Can I migrate my existing HackerRank assessments to Basanite?',
    a: 'No — and we will not pretend otherwise. The two products measure different things. What we can do is help map your existing HackerRank rubric into the eight dimensions so that the question your hiring committee asks (do we trust this candidate to ship calibrated work?) is answered with stronger evidence than HackerRank scores can provide.',
  },
  {
    q: 'Which HackerRank alternative is best for very high volume?',
    a: 'For funnels above several thousand candidates per month, HireVue’s async-first model is still the operational benchmark. For lower volumes where you need a depth of signal HireVue cannot deliver, Basanite is purpose-built. CodeSignal sits in the middle for new-grad pipelines.',
  },
]

export default async function HackerRankAlternativesPage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  const ldFaq = faqPageJsonLd(FAQ_ITEMS.map(i => ({ question: i.q, answer: i.a })))
  const ldCrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Alternatives', path: '/alternatives/hackerrank' },
    { name: 'HackerRank alternatives', path: '/alternatives/hackerrank' },
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
            Buying guide
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[1.05] mb-6">
            HackerRank alternatives in 2026
          </h1>
          <p className="text-basanite-600 text-lg leading-relaxed max-w-2xl">
            HackerRank is the most-used technical assessment platform on the market. It is also the one most exposed to the AI-cheating problem, because its core product is the static coding test that AI agents now solve in seconds. Here are the five alternatives most teams should consider in 2026.
          </p>
        </header>

        {/* Why people look for alternatives */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-4">Why teams are looking</h2>
          <div className="text-basanite-700 text-base leading-relaxed space-y-4 max-w-3xl">
            <p>
              Three forces have stacked up over the past 24 months. First, AI agents demolished the signal value of static coding tests. A take-home that took a competent engineer four hours in 2022 now takes Claude Code four minutes — and the candidate barely needs to understand the answer. Second, the engineering workforce has bifurcated into engineers who orchestrate AI well and engineers who do not, and HackerRank does not measure the orchestration skill at all. Third, recruiter time on top-of-funnel screening has not declined — if anything, the noise floor has gone up, because more candidates pass the tests while fewer of them can actually do the job.
            </p>
            <p>
              When teams replace HackerRank, they are usually solving one of three problems: cheating resistance, signal depth, or recruiter throughput. Different alternatives are good at different ones.
            </p>
          </div>
        </section>

        {/* Top alternatives */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-6">Top HackerRank alternatives in 2026</h2>

          <div className="space-y-8">
            <article className="border border-earth-200 bg-white p-6 sm:p-8">
              <header className="mb-3 flex items-start justify-between gap-3 flex-wrap">
                <h3 className="font-display text-xl text-basanite-900">1. Basanite</h3>
                <span className="text-[11px] uppercase tracking-[0.18em] text-gold-700 font-semibold">AI-cheating resistant</span>
              </header>
              <p className="text-basanite-700 text-base leading-relaxed mb-3">
                Basanite is purpose-built for the AI era. Round 1 is a 20–30 minute voice conversation built entirely from the candidate’s own CV — no two candidates ever see the same questions, so leaked answer banks do not help. Round 2 is the AI Collaboration Workbench: a sandboxed VS Code environment, a multi-thousand-line role-matched codebase, a real ticket, and the candidate’s own AI agent (Claude Code, Cursor, Copilot, Aider). We score 8 metacognitive dimensions with quote-grounded evidence on every score above 3.
              </p>
              <p className="text-basanite-600 text-sm leading-relaxed">
                <strong>Best for:</strong> Series-A through mid-market engineering teams, recruitment agencies, technical hiring where judgment matters. <strong>Pricing:</strong> £400 / £1,500 / £3,300+ per month. <strong>Link:</strong> <Link href="/" className="underline text-gold-600 hover:text-gold-700">basanite.co.uk</Link> · <Link href="/compare/hackerrank-vs-basanite" className="underline text-gold-600 hover:text-gold-700">head-to-head comparison</Link>.
              </p>
            </article>

            <article className="border border-earth-200 bg-white p-6 sm:p-8">
              <h3 className="font-display text-xl text-basanite-900 mb-3">2. CodeSignal</h3>
              <p className="text-basanite-700 text-base leading-relaxed mb-3">
                CodeSignal’s strength is its General Coding Assessment, a standardised 70-minute four-task test that produces a comparable 850-point Coding Score across millions of candidates. For new-grad and early-career hiring at scale, this comparability is genuinely useful. They also ship serious proctoring tooling and have an interview platform for live human-led coding. The AI-cheating concerns that apply to HackerRank apply to a meaningful degree here, but CodeSignal has been honest about the difficulty and has invested in mitigations.
              </p>
              <p className="text-basanite-600 text-sm leading-relaxed">
                <strong>Best for:</strong> Large early-career programmes, new-grad pipelines, teams that need a comparable benchmark score. <strong>Link:</strong> <Link href="/compare/codesignal-vs-basanite" className="underline text-gold-600 hover:text-gold-700">CodeSignal vs Basanite</Link>.
              </p>
            </article>

            <article className="border border-earth-200 bg-white p-6 sm:p-8">
              <h3 className="font-display text-xl text-basanite-900 mb-3">3. HireVue</h3>
              <p className="text-basanite-700 text-base leading-relaxed mb-3">
                HireVue is the operational gold standard for async video interviewing at very large scale. The platform handles enormous candidate volumes — graduate intake at global banks, hourly hiring at retail chains — with a maturity smaller competitors do not have. HireVue Coding adds a coding workspace alongside the video questions. For roles where a recorded behavioural interview followed by a coding test is the right shape, HireVue is still excellent. It does not measure AI orchestration.
              </p>
              <p className="text-basanite-600 text-sm leading-relaxed">
                <strong>Best for:</strong> Global enterprises with multi-thousand-candidate-per-month funnels and async-first culture. <strong>Link:</strong> <Link href="/compare/hirevue-vs-basanite" className="underline text-gold-600 hover:text-gold-700">HireVue vs Basanite</Link>.
              </p>
            </article>

            <article className="border border-earth-200 bg-white p-6 sm:p-8">
              <h3 className="font-display text-xl text-basanite-900 mb-3">4. Karat</h3>
              <p className="text-basanite-700 text-base leading-relaxed mb-3">
                Karat takes a structurally different approach: instead of platforming the interview, they provide vetted human engineers to conduct it on your behalf. The benefit is a peer-engineer signal that no AI yet replicates and a real human in the chair if your stakeholders require one. The cost is per-interview pricing (typically $300–600+) that scales linearly with volume and a panel-availability bottleneck on scheduling.
              </p>
              <p className="text-basanite-600 text-sm leading-relaxed">
                <strong>Best for:</strong> Senior-band hiring where stakeholder commitment requires a human interviewer; well-funded teams comfortable with per-session economics. <strong>Link:</strong> <Link href="/compare/karat-vs-basanite" className="underline text-gold-600 hover:text-gold-700">Karat vs Basanite</Link>.
              </p>
            </article>

            <article className="border border-earth-200 bg-white p-6 sm:p-8">
              <h3 className="font-display text-xl text-basanite-900 mb-3">5. Mercor</h3>
              <p className="text-basanite-700 text-base leading-relaxed mb-3">
                Mercor is one of the newer entrants in the AI-conversational-interviewer category and has scaled quickly with strong funding. Their approach uses role-templated AI interview agents, useful for fast-moving teams that need quick deployment. Where their architecture differs from Basanite is in personalisation: Mercor works from role templates rather than the individual candidate’s CV, and they do not currently offer an AI Collaboration round.
              </p>
              <p className="text-basanite-600 text-sm leading-relaxed">
                <strong>Best for:</strong> Teams that want an AI interview product fast and value role-template breadth over per-candidate personalisation. <strong>Link:</strong> <Link href="/alternatives/mercor" className="underline text-gold-600 hover:text-gold-700">Mercor alternatives</Link>.
              </p>
            </article>
          </div>
        </section>

        {/* Decision matrix */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-6">Quick decision matrix</h2>
          <div className="overflow-x-auto border border-earth-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-earth-100 text-left">
                  <th className="font-display font-normal text-basanite-900 px-4 py-3">Concern</th>
                  <th className="font-display font-normal text-basanite-900 px-4 py-3">Best fit</th>
                </tr>
              </thead>
              <tbody className="text-basanite-700">
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">AI cheating on coding tests</td>
                  <td className="px-4 py-3">Basanite (unique CV-grounded questions)</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">AI-orchestration skill</td>
                  <td className="px-4 py-3">Basanite (Round 2 workbench)</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">High-volume new-grad benchmark</td>
                  <td className="px-4 py-3">CodeSignal (GCA score)</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Async video at enterprise scale</td>
                  <td className="px-4 py-3">HireVue</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Human interviewer in the chair</td>
                  <td className="px-4 py-3">Karat</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Fast role-template deployment</td>
                  <td className="px-4 py-3">Mercor</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Quote-grounded scoring + GDPR Article 22</td>
                  <td className="px-4 py-3">Basanite</td>
                </tr>
              </tbody>
            </table>
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

        {/* CTA */}
        <section className="mt-16 border-t border-earth-200 pt-12 text-center">
          <h2 className="font-display text-2xl text-basanite-900 mb-3">See Basanite live</h2>
          <p className="text-basanite-600 text-base mb-6 max-w-xl mx-auto">
            Register your interest and we&rsquo;ll be in touch. We will run a real CV-grounded interview against a sample candidate and show you a side-by-side with whichever HackerRank report you bring.
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
