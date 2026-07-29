// Alternatives page — Karat alternatives in 2026.
//
// Different angle from other alternatives pages: Karat is being looked at
// because its per-interview economics do not scale. The natural alternative
// is platform-priced AI interviewing. We position Basanite as the canonical
// alternative, alongside Mercor, HireVue Coding, CodeSignal Interview, and
// in-house structured interviews.

import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { SiteNav } from '@/components/SiteNav'
import { buildMetadata, faqPageJsonLd, breadcrumbJsonLd } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'Karat alternatives — five ways to scale technical interviews in 2026',
  description:
    'A practical guide to Karat alternatives in 2026. Why teams move away from per-interview economics, what platform-priced AI interviewing offers, and how Basanite, Mercor, HireVue, CodeSignal and others compare.',
  path: '/alternatives/karat',
  keywords: [
    'Karat alternative',
    'Karat alternatives 2026',
    'interview as a service alternative',
    'AI technical interview platform',
  ],
})

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Why look for a Karat alternative?',
    a: 'Three reasons dominate the conversations we have with teams switching. First, unit economics: Karat is per-interview at typically US$300–600 per session, which scales linearly with hiring volume. Second, scheduling: panel availability becomes a bottleneck during hiring surges. Third, the AI-collaboration question: Karat interviewers do not have a structured way to measure how candidates work with AI agents, which is increasingly central to engineering roles.',
  },
  {
    q: 'Are AI interviewers actually as good as Karat’s human ones?',
    a: 'A senior human interviewer remains the highest-fidelity instrument available for evaluating a senior engineer. What AI interviewers offer is consistency at scale: the same dimensional rubric applied identically across thousands of candidates, with every score backed by a verbatim quote and a recording the hirer can audit any time. The right framing is not human-vs-AI but where in the funnel each is most valuable.',
  },
  {
    q: 'Can I bring my own rubric?',
    a: 'Basanite ships with eight metacognitive dimensions calibrated to engineering work, but customers regularly map their internal rubric into ours during pilot. Karat customers usually find the dimensional model is broader than the four-to-six-criterion rubrics they were using internally.',
  },
  {
    q: 'What happens to candidate experience when you remove the human interviewer?',
    a: 'Candidate sentiment is one of the clearest signals from our pilots. The Basanite voice conversation is rated, on average, as more humane than the platforms it replaces — including Karat, because the AI interviewer holds patience and consistency in ways even a vetted contract interviewer sometimes cannot. Every candidate also receives a personal feedback report regardless of outcome, which is more than most human-led platforms offer.',
  },
  {
    q: 'How does pricing actually compare?',
    a: 'For a team hiring 50 engineers in a year, Karat at conservative pricing ($300/interview, ~1.5 interviews per hire) runs around $22.5k. Basanite at Growth tier costs £1,500/mo / about £18k a year with no per-interview uplift inside the tier. The savings get larger as volume increases.',
  },
]

export default async function KaratAlternativesPage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  const ldFaq = faqPageJsonLd(FAQ_ITEMS.map(i => ({ question: i.q, answer: i.a })))
  const ldCrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Alternatives', path: '/alternatives/karat' },
    { name: 'Karat alternatives', path: '/alternatives/karat' },
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
            Karat alternatives in 2026
          </h1>
          <p className="text-basanite-600 text-lg leading-relaxed max-w-2xl">
            Karat built the interview-as-a-service category and they execute it well. The reasons teams now look for alternatives are structural: per-interview pricing, panel-availability bottlenecks, and the absence of an AI-collaboration round. Here are the five platforms worth considering.
          </p>
        </header>

        {/* Why people look */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-4">Why teams are looking</h2>
          <div className="text-basanite-700 text-base leading-relaxed space-y-4 max-w-3xl">
            <p>
              Karat works. The product does what it says — vetted contract engineers, structured rubrics, peer-engineer signal — and for the right organisation it is excellent. The alternative-search usually starts when one of three constraints binds.
            </p>
            <p>
              <strong>Cost.</strong> Per-interview pricing scales linearly. A team running 200 first-round technical interviews per year is looking at $60k–$120k+ in Karat fees before any final-round work. Platform-priced alternatives can deliver the same first-round throughput for a fraction of that.
            </p>
            <p>
              <strong>Scale.</strong> Karat’s panel grows steadily but cannot flex overnight. During hiring surges, scheduling slips. Platform interviewers do not have this constraint.
            </p>
            <p>
              <strong>What is being measured.</strong> Karat interviewers test engineering judgment through a structured coding interview. They do not — by design — instrument how a candidate works alongside an AI agent. For roles where AI orchestration is the dominant on-the-job activity, this signal is increasingly central.
            </p>
          </div>
        </section>

        {/* Top alternatives */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-6">Top Karat alternatives in 2026</h2>

          <div className="space-y-8">
            <article className="border border-earth-200 bg-white p-6 sm:p-8">
              <header className="mb-3 flex items-start justify-between gap-3 flex-wrap">
                <h3 className="font-display text-xl text-basanite-900">1. Basanite</h3>
                <span className="text-[11px] uppercase tracking-[0.18em] text-gold-700 font-semibold">Scalable AI interviewer</span>
              </header>
              <p className="text-basanite-700 text-base leading-relaxed mb-3">
                Basanite is the closest like-for-like replacement for Karat in the AI-native model. Round 1 is a 20–30 minute live voice conversation built from the candidate’s own CV, conducted by an AI interviewer trained on a documented inventory of 22 probing techniques. Round 2 — which Karat does not offer — is an AI Collaboration Workbench where the candidate ships work in a real codebase alongside their own AI agent, instrumented across six observable sub-dimensions. The report is dimension-by-dimension with verbatim candidate quotes pinned to every score above 3.
              </p>
              <p className="text-basanite-600 text-sm leading-relaxed">
                <strong>Best for:</strong> Engineering teams running 30+ technical hires/yr who want consistency at scale. <strong>Pricing:</strong> £400 / £1,500 / £3,300+ per month, no per-interview uplift. <strong>Link:</strong> <Link href="/" className="underline text-gold-600 hover:text-gold-700">basanite.co.uk</Link> · <Link href="/compare/karat-vs-basanite" className="underline text-gold-600 hover:text-gold-700">head-to-head comparison</Link>.
              </p>
            </article>

            <article className="border border-earth-200 bg-white p-6 sm:p-8">
              <h3 className="font-display text-xl text-basanite-900 mb-3">2. Mercor</h3>
              <p className="text-basanite-700 text-base leading-relaxed mb-3">
                Mercor is another AI-conversational alternative to human-led interviewing, with role-templated interview agents that deploy quickly. For teams that want to leave behind per-interview economics and prefer template breadth over CV-level personalisation, Mercor is on the shortlist. They do not currently offer a Round 2 AI Collaboration workbench.
              </p>
              <p className="text-basanite-600 text-sm leading-relaxed">
                <strong>Best for:</strong> Fast-moving teams that value role-template breadth and quick deployment. <strong>Link:</strong> <Link href="/alternatives/mercor" className="underline text-gold-600 hover:text-gold-700">Mercor alternatives</Link>.
              </p>
            </article>

            <article className="border border-earth-200 bg-white p-6 sm:p-8">
              <h3 className="font-display text-xl text-basanite-900 mb-3">3. CodeSignal Interview</h3>
              <p className="text-basanite-700 text-base leading-relaxed mb-3">
                CodeSignal’s interview product gives your internal engineers a polished live-coding environment to conduct the interview in. It is a different unit of substitution than Karat — you are not outsourcing the interview, you are scaffolding your internal interviewers. For teams that want to professionalise their own engineering panel rather than outsource it, this is a real option.
              </p>
              <p className="text-basanite-600 text-sm leading-relaxed">
                <strong>Best for:</strong> Teams keeping interviewing in-house but wanting better tooling. <strong>Link:</strong> <Link href="/compare/codesignal-vs-basanite" className="underline text-gold-600 hover:text-gold-700">CodeSignal vs Basanite</Link>.
              </p>
            </article>

            <article className="border border-earth-200 bg-white p-6 sm:p-8">
              <h3 className="font-display text-xl text-basanite-900 mb-3">4. HireVue Coding</h3>
              <p className="text-basanite-700 text-base leading-relaxed mb-3">
                HireVue Coding is the technical extension of HireVue’s async video platform — recorded answers plus a coding workspace, scored by AI. It moves away from the per-interview Karat model and toward an enterprise-platform model. The trade-off is that it is async rather than live and does not adapt to candidate answers in real time.
              </p>
              <p className="text-basanite-600 text-sm leading-relaxed">
                <strong>Best for:</strong> Global enterprises wanting a single platform for behavioural and coding screens. <strong>Link:</strong> <Link href="/compare/hirevue-vs-basanite" className="underline text-gold-600 hover:text-gold-700">HireVue vs Basanite</Link>.
              </p>
            </article>

            <article className="border border-earth-200 bg-white p-6 sm:p-8">
              <h3 className="font-display text-xl text-basanite-900 mb-3">5. In-house structured interviews</h3>
              <p className="text-basanite-700 text-base leading-relaxed mb-3">
                The unfashionable but legitimate alternative is to bring interviewing back in-house with strong structured rubrics. The cost is engineering time; the benefit is full control of signal definition and a peer-engineer signal Karat itself was trying to replicate. For small senior-band hiring programmes (under 20 hires/yr) where engineering capacity is available, this can outperform any platform — though most teams find the engineering opportunity cost too high.
              </p>
              <p className="text-basanite-600 text-sm leading-relaxed">
                <strong>Best for:</strong> Small senior-band hiring programmes with available engineering capacity. <strong>Link:</strong> <Link href="/faq" className="underline text-gold-600 hover:text-gold-700">FAQ on the underlying methodology</Link>.
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
                  <th className="font-display font-normal text-basanite-900 px-4 py-3">Why you’re moving off Karat</th>
                  <th className="font-display font-normal text-basanite-900 px-4 py-3">Best alternative</th>
                </tr>
              </thead>
              <tbody className="text-basanite-700">
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Per-interview economics don’t scale</td>
                  <td className="px-4 py-3">Basanite (platform-priced)</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Scheduling bottleneck during hiring surges</td>
                  <td className="px-4 py-3">Basanite or Mercor</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Need to measure AI orchestration</td>
                  <td className="px-4 py-3">Basanite (Round 2 workbench)</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Want fast role-template deployment</td>
                  <td className="px-4 py-3">Mercor</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Keep interviewing in-house, better tools</td>
                  <td className="px-4 py-3">CodeSignal Interview</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">One enterprise platform for all hiring</td>
                  <td className="px-4 py-3">HireVue Coding</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Senior-only, small volume, engineering capacity</td>
                  <td className="px-4 py-3">In-house structured</td>
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
            Book a 20-minute call. We will run a real CV-grounded interview against a sample candidate and walk through the unit-economics maths next to your current Karat spend.
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
