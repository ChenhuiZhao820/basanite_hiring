// Alternatives page — CodeSignal alternatives in 2026.
//
// CodeSignal's defining product is the General Coding Assessment / Coding
// Score. Teams looking for alternatives are usually either questioning the
// benchmark-comparability frame in the AI era, or wanting more diagnostic
// signal than a single composite number gives them.

import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { SiteNav } from '@/components/SiteNav'
import { buildMetadata, faqPageJsonLd, breadcrumbJsonLd } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'CodeSignal alternatives — five platforms beyond the Coding Score',
  description:
    'A guide to CodeSignal alternatives in 2026. Why teams move past benchmark coding scores, what diagnostic interviewing offers, and how Basanite, HackerRank, HireVue, Karat and Mercor compare.',
  path: '/alternatives/codesignal',
  keywords: [
    'CodeSignal alternative',
    'CodeSignal alternatives 2026',
    'replace CodeSignal',
    'AI-resistant technical assessment',
  ],
})

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Is the CodeSignal Coding Score still meaningful in 2026?',
    a: 'It is comparable, which is genuinely useful — a 720 from one university is a 720 from another. What it does not tell you is how the candidate makes engineering trade-offs, where their judgment is shallow, or how well they work alongside AI agents. The score is a ranking instrument, not a diagnostic one. Whether that is enough depends on what kind of hiring decision you are trying to make.',
  },
  {
    q: 'What does Basanite produce instead of a single composite score?',
    a: 'A dimension-by-dimension report across 8 metacognitive constructs (judgment under ambiguity, tacit knowledge, intuition under data scarcity, psychological safety, creative reframing, ethical reasoning, learning from experience, AI-collaboration intelligence). Each score is behaviourally anchored and no score above 3 stands without a verbatim candidate quote or trace event as evidence. Hirers say it reads like a briefing document for the final interview — which is exactly how it is designed.',
  },
  {
    q: 'What about the proctoring side of CodeSignal?',
    a: 'CodeSignal has shipped serious proctoring tooling — webcam, screen-share, plagiarism detection. We do not have anything like the same proctoring stack, because Basanite addresses the AI-cheating problem differently. Round 1 questions are unique per candidate (built from the CV), so leaked answer banks do not help. In Round 2 we require AI use and instrument it, removing the cheating vector entirely rather than trying to detect it.',
  },
  {
    q: 'Can I replace CodeSignal entirely?',
    a: 'For most engineering teams in the Series-A through mid-market range, yes. For very-high-volume new-grad programmes where benchmark comparability is mission-critical, you may want to keep CodeSignal at the very top of the funnel and route candidates who clear that bar into Basanite for the deeper evaluation.',
  },
  {
    q: 'What does this cost?',
    a: 'Basanite is published: Starter £400/mo for small teams, Growth £1,500/mo for typical Series-B engineering orgs, Agency £3,300+/mo for recruitment firms and high-volume teams. CodeSignal is quote-based and typically lands in the £15k–£50k+ annual range for serious deployments.',
  },
]

export default async function CodeSignalAlternativesPage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  const ldFaq = faqPageJsonLd(FAQ_ITEMS.map(i => ({ question: i.q, answer: i.a })))
  const ldCrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Alternatives', path: '/alternatives/codesignal' },
    { name: 'CodeSignal alternatives', path: '/alternatives/codesignal' },
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
            CodeSignal alternatives in 2026
          </h1>
          <p className="text-basanite-600 text-lg leading-relaxed max-w-2xl">
            CodeSignal built one of the best standardised coding-assessment platforms on the market. The General Coding Assessment and the 850-point Coding Score remain genuinely useful for very large new-grad pipelines. For other use cases, here are the five most relevant alternatives — and how to think about the trade-offs.
          </p>
        </header>

        {/* Why people look */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-4">Why teams are looking</h2>
          <div className="text-basanite-700 text-base leading-relaxed space-y-4 max-w-3xl">
            <p>
              The CodeSignal alternative-search usually starts from one of three places. First, the Coding Score is a ranking instrument; teams that need diagnostic signal — where is the candidate strong, where is the candidate shallow — find a single composite number insufficient. Second, AI cheating: CodeSignal has invested in proctoring but the underlying static-coding-test problem persists, and proctoring of remote candidates has structural limits. Third, the actual job has changed: senior engineers ship work alongside AI agents, and no current CodeSignal product captures that.
            </p>
            <p>
              Smaller signals also push the search. Pricing is private and tends to scale with the seriousness of the deployment; the assessment library is excellent but adds up. Candidate experience on algorithmic-puzzle tests gets steady complaints — engineers say it does not feel like the work they actually do.
            </p>
          </div>
        </section>

        {/* Top alternatives */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-6">Top CodeSignal alternatives in 2026</h2>

          <div className="space-y-8">
            <article className="border border-earth-200 bg-white p-6 sm:p-8">
              <header className="mb-3 flex items-start justify-between gap-3 flex-wrap">
                <h3 className="font-display text-xl text-basanite-900">1. Basanite</h3>
                <span className="text-[11px] uppercase tracking-[0.18em] text-gold-700 font-semibold">Diagnostic, AI-native</span>
              </header>
              <p className="text-basanite-700 text-base leading-relaxed mb-3">
                Basanite is the most-different-by-design alternative. Instead of a single composite Coding Score, Basanite produces a dimension-by-dimension report across 8 metacognitive constructs — every score above 3 backed by a verbatim candidate quote or Round 2 trace event. Round 1 is a CV-grounded voice conversation (unique to the candidate, AI-cheating-resistant by construction). Round 2 is the AI Collaboration Workbench: a sandboxed VS Code environment where the candidate ships work in a real codebase alongside their own AI agent, instrumented across six observable sub-dimensions. GDPR Article 22 is built into the consent flow.
              </p>
              <p className="text-basanite-600 text-sm leading-relaxed">
                <strong>Best for:</strong> Engineering teams that want diagnostic signal and AI-collaboration evaluation over standardised ranking. <strong>Pricing:</strong> £400 / £1,500 / £3,300+ per month. <strong>Link:</strong> <Link href="/" className="underline text-gold-600 hover:text-gold-700">basanite.co.uk</Link> · <Link href="/compare/codesignal-vs-basanite" className="underline text-gold-600 hover:text-gold-700">head-to-head comparison</Link>.
              </p>
            </article>

            <article className="border border-earth-200 bg-white p-6 sm:p-8">
              <h3 className="font-display text-xl text-basanite-900 mb-3">2. HackerRank</h3>
              <p className="text-basanite-700 text-base leading-relaxed mb-3">
                HackerRank is the most obvious like-for-like alternative — another large coding-assessment library, mature ATS integrations, and the broadest brand familiarity in the candidate population. It does not offer a benchmark like CodeSignal’s Coding Score, but its library is arguably larger. The AI-cheating concerns that apply to CodeSignal apply at least as much here.
              </p>
              <p className="text-basanite-600 text-sm leading-relaxed">
                <strong>Best for:</strong> Teams that want a large coding-test library with mature ATS integrations. <strong>Link:</strong> <Link href="/compare/hackerrank-vs-basanite" className="underline text-gold-600 hover:text-gold-700">HackerRank vs Basanite</Link>.
              </p>
            </article>

            <article className="border border-earth-200 bg-white p-6 sm:p-8">
              <h3 className="font-display text-xl text-basanite-900 mb-3">3. HireVue</h3>
              <p className="text-basanite-700 text-base leading-relaxed mb-3">
                A meaningfully different category — async video plus AI transcript scoring — and the operational benchmark for enterprise-scale screening. HireVue Coding adds a coding workspace alongside the video answers. For teams that have outgrown a coding-test-only approach and want behavioural signal alongside it, HireVue is the most mature platform on the market.
              </p>
              <p className="text-basanite-600 text-sm leading-relaxed">
                <strong>Best for:</strong> Multi-thousand-candidate-per-month funnels at enterprise scale. <strong>Link:</strong> <Link href="/compare/hirevue-vs-basanite" className="underline text-gold-600 hover:text-gold-700">HireVue vs Basanite</Link>.
              </p>
            </article>

            <article className="border border-earth-200 bg-white p-6 sm:p-8">
              <h3 className="font-display text-xl text-basanite-900 mb-3">4. Karat</h3>
              <p className="text-basanite-700 text-base leading-relaxed mb-3">
                If the reason for moving off CodeSignal is that you want more depth than any test produces, Karat is the human-interviewer answer. Vetted contract engineers conduct structured coding interviews on the customer’s behalf. The trade-offs are per-interview pricing (typically US$300–600+) and panel-availability scheduling, but the peer-engineer signal can be excellent.
              </p>
              <p className="text-basanite-600 text-sm leading-relaxed">
                <strong>Best for:</strong> Senior-band hiring where stakeholders require a human interviewer. <strong>Link:</strong> <Link href="/compare/karat-vs-basanite" className="underline text-gold-600 hover:text-gold-700">Karat vs Basanite</Link>.
              </p>
            </article>

            <article className="border border-earth-200 bg-white p-6 sm:p-8">
              <h3 className="font-display text-xl text-basanite-900 mb-3">5. Mercor</h3>
              <p className="text-basanite-700 text-base leading-relaxed mb-3">
                A newer entrant in the AI-conversational interview category with strong funding and role-templated interview agents. For teams moving off CodeSignal because they want a live AI-led conversation rather than a coding test, Mercor is on the shortlist. They do not currently offer a Round 2 AI Collaboration workbench.
              </p>
              <p className="text-basanite-600 text-sm leading-relaxed">
                <strong>Best for:</strong> Teams looking at AI-interviewer alternatives with role-template breadth. <strong>Link:</strong> <Link href="/alternatives/mercor" className="underline text-gold-600 hover:text-gold-700">Mercor alternatives</Link>.
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
                  <th className="font-display font-normal text-basanite-900 px-4 py-3">Why you’re moving off CodeSignal</th>
                  <th className="font-display font-normal text-basanite-900 px-4 py-3">Best alternative</th>
                </tr>
              </thead>
              <tbody className="text-basanite-700">
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Single composite score isn’t diagnostic enough</td>
                  <td className="px-4 py-3">Basanite (8-dimension report)</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">AI cheating is degrading signal</td>
                  <td className="px-4 py-3">Basanite (CV-grounded + instrumented AI)</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Need to measure AI-collaboration skill</td>
                  <td className="px-4 py-3">Basanite (Round 2 workbench)</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Want a like-for-like coding-test alternative</td>
                  <td className="px-4 py-3">HackerRank</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Want async video at enterprise scale</td>
                  <td className="px-4 py-3">HireVue</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Want a human interviewer in the chair</td>
                  <td className="px-4 py-3">Karat</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Want role-templated AI interviewer</td>
                  <td className="px-4 py-3">Mercor</td>
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
            Book a 20-minute call. Bring a sample CodeSignal report if you have one — we will sit Basanite next to it and walk you through what the dimensional report adds.
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

function SlimFooter() {
  return (
    <footer className="border-t border-earth-200 bg-white">
      <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-basanite-500">
        <p>&copy; {new Date().getFullYear()} Basanite.</p>
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
