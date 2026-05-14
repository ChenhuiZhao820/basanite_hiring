// Alternatives page — HireVue alternatives in 2026.
//
// Different angle from the HackerRank alternatives page: HireVue is being
// looked at for replacement because async video lacks depth and adaptive
// probing. We position Basanite as the most relevant alternative for the
// technical layer specifically, while staying fair about HireVue's strengths.

import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { LogoMark } from '@/components/Logo'
import { buildMetadata, faqPageJsonLd, breadcrumbJsonLd } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'HireVue alternatives — five platforms for live, adaptive technical interviews',
  description:
    'A guide to HireVue alternatives in 2026. Why teams move beyond async video, what live adaptive interviewing offers, and how Basanite, Mercor, Karat, CodeSignal and others compare.',
  path: '/alternatives/hirevue',
  keywords: [
    'HireVue alternative',
    'HireVue alternatives 2026',
    'async video interview alternative',
    'live AI interview platform',
  ],
})

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Why are teams moving off HireVue?',
    a: 'Three common reasons. One: technical hiring needs depth that one-way video cannot probe — candidates record polished one-shot answers and the platform cannot follow up. Two: HireVue Coding tests engineers as if AI is the enemy, which is increasingly disconnected from how the job is done. Three: candidate experience — many candidates rate one-way video to camera as alienating, and conversion at the assessment step has trended downward.',
  },
  {
    q: 'Is async video still useful?',
    a: 'For non-technical roles at massive scale — graduate intake, hourly hiring, structured behavioural screens — yes, absolutely. HireVue is excellent there. The question is whether the technical layer of the interview should sit inside the same platform, and increasingly the answer is no.',
  },
  {
    q: 'Does Basanite work for non-technical roles?',
    a: 'No. We deliberately scope to the technical layer of the interview — engineering, ML, data, security, applied-AI. Psychometric assessment, culture-fit, and behavioural interviewing for non-technical roles are different problems with different evidentiary bases. Bundling them in would dilute the rigor of each.',
  },
  {
    q: 'Can Basanite replace HireVue entirely?',
    a: 'For a technical-only funnel, yes — and many of our customers run that way. For a mixed funnel, the cleaner pattern is HireVue at the behavioural / culture-fit layer and Basanite at the technical layer. Both push results back to the same ATS record so the hirer sees one unified view.',
  },
  {
    q: 'What does Basanite charge?',
    a: 'Published pricing: Starter £400/mo for small teams, Growth £1,500/mo for typical Series-B orgs, Agency £3,300+/mo for recruitment firms and high-volume teams. No per-candidate uplift inside your plan tier.',
  },
]

export default async function HireVueAlternativesPage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  const ldFaq = faqPageJsonLd(FAQ_ITEMS.map(i => ({ question: i.q, answer: i.a })))
  const ldCrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Alternatives', path: '/alternatives/hirevue' },
    { name: 'HireVue alternatives', path: '/alternatives/hirevue' },
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
            Buying guide
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[1.05] mb-6">
            HireVue alternatives in 2026
          </h1>
          <p className="text-basanite-600 text-lg leading-relaxed max-w-2xl">
            HireVue is excellent for what it is — async behavioural screening at enterprise scale. For technical hiring specifically, however, more teams are reaching for platforms that hold a real conversation with the candidate. Here are the five most relevant alternatives.
          </p>
        </header>

        {/* Why people look */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-4">Why teams are looking</h2>
          <div className="text-basanite-700 text-base leading-relaxed space-y-4 max-w-3xl">
            <p>
              The HireVue replacement search usually starts from one of three places. The first is candidate experience: one-way video gets steady complaints from engineers, and conversion at the assessment step has trended downward. The second is signal depth: a recorded answer cannot be probed, and the gap between a polished headline and the underlying reasoning often stays invisible. The third — and the dominant force in 2026 — is that the actual technical job has changed.
            </p>
            <p>
              Engineers in 2026 ship work alongside AI agents. A coding test that asks them to write code unaided is testing a skill that increasingly does not exist in the real workflow. HireVue Coding has not adapted to this; most of its replacements have to.
            </p>
          </div>
        </section>

        {/* Top alternatives */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-6">Top HireVue alternatives in 2026</h2>

          <div className="space-y-8">
            <article className="border border-earth-200 bg-white p-6 sm:p-8">
              <header className="mb-3 flex items-start justify-between gap-3 flex-wrap">
                <h3 className="font-display text-xl text-basanite-900">1. Basanite</h3>
                <span className="text-[11px] uppercase tracking-[0.18em] text-gold-700 font-semibold">For technical roles</span>
              </header>
              <p className="text-basanite-700 text-base leading-relaxed mb-3">
                Basanite is a live voice conversation built from each candidate’s own CV, followed by an AI Collaboration Workbench where the candidate uses their own AI agent to ship work in a real codebase. The interviewer adapts in real time — probing vagueness, surfacing unsupported claims, following up on gaps — in a way no async video product can. The 8-dimension report includes a verbatim candidate quote on every score above 3, and a GDPR Article 22 consent flow is built in.
              </p>
              <p className="text-basanite-600 text-sm leading-relaxed">
                <strong>Best for:</strong> Engineering, ML, data, security, applied-AI roles at Series-A through mid-market scale. <strong>Pricing:</strong> £400 / £1,500 / £3,300+ per month. <strong>Link:</strong> <Link href="/" className="underline text-gold-600 hover:text-gold-700">basanite.co.uk</Link> · <Link href="/compare/hirevue-vs-basanite" className="underline text-gold-600 hover:text-gold-700">head-to-head comparison</Link>.
              </p>
            </article>

            <article className="border border-earth-200 bg-white p-6 sm:p-8">
              <h3 className="font-display text-xl text-basanite-900 mb-3">2. Mercor</h3>
              <p className="text-basanite-700 text-base leading-relaxed mb-3">
                Mercor is a well-funded entrant in the AI-conversational interview category, with role-templated AI interview agents that deploy fast. For teams looking at HireVue alternatives because they want a conversational AI interviewer specifically, Mercor is on the shortlist. Their templates trade per-candidate personalisation for breadth and speed; they do not currently offer a Round 2 AI Collaboration workbench.
              </p>
              <p className="text-basanite-600 text-sm leading-relaxed">
                <strong>Best for:</strong> Teams that want an AI-conversation product fast and prefer role-template breadth. <strong>Link:</strong> <Link href="/alternatives/mercor" className="underline text-gold-600 hover:text-gold-700">Mercor alternatives</Link>.
              </p>
            </article>

            <article className="border border-earth-200 bg-white p-6 sm:p-8">
              <h3 className="font-display text-xl text-basanite-900 mb-3">3. Karat</h3>
              <p className="text-basanite-700 text-base leading-relaxed mb-3">
                If the reason for moving off HireVue is that you want a real human in the chair — not an AI — Karat is the canonical answer. Vetted contract engineers conduct structured coding interviews on the customer’s behalf. The cost is per-interview (typically US$300–600+) and scheduling depends on panel availability, but for stakeholder commitments where a human interviewer is non-negotiable, Karat remains the standard.
              </p>
              <p className="text-basanite-600 text-sm leading-relaxed">
                <strong>Best for:</strong> Senior-band hiring, stakeholder requirement for human interviewers. <strong>Link:</strong> <Link href="/compare/karat-vs-basanite" className="underline text-gold-600 hover:text-gold-700">Karat vs Basanite</Link>.
              </p>
            </article>

            <article className="border border-earth-200 bg-white p-6 sm:p-8">
              <h3 className="font-display text-xl text-basanite-900 mb-3">4. CodeSignal</h3>
              <p className="text-basanite-700 text-base leading-relaxed mb-3">
                CodeSignal’s General Coding Assessment produces a comparable 850-point Coding Score, which is genuinely useful for high-volume new-grad pipelines. They also operate a live interview product. Where it overlaps with HireVue is in standardised assessment; where it diverges is that the GCA is a coding-specific benchmark rather than a video behavioural screen. The AI-cheating concerns we raised for HackerRank apply here too, though CodeSignal has shipped more proctoring tooling.
              </p>
              <p className="text-basanite-600 text-sm leading-relaxed">
                <strong>Best for:</strong> New-grad and early-career pipelines, teams that need a benchmark Coding Score. <strong>Link:</strong> <Link href="/compare/codesignal-vs-basanite" className="underline text-gold-600 hover:text-gold-700">CodeSignal vs Basanite</Link>.
              </p>
            </article>

            <article className="border border-earth-200 bg-white p-6 sm:p-8">
              <h3 className="font-display text-xl text-basanite-900 mb-3">5. HackerRank</h3>
              <p className="text-basanite-700 text-base leading-relaxed mb-3">
                HackerRank has the largest installed base in the technical-assessment space and the broadest question library. As a HireVue alternative it is partial: HackerRank covers the coding test layer well but does not offer a video / conversational round natively. Teams replacing HireVue with HackerRank usually combine it with a separate live-interview product. Same AI-cheating caveats apply.
              </p>
              <p className="text-basanite-600 text-sm leading-relaxed">
                <strong>Best for:</strong> Teams that want a brand-name coding test with existing rubric scaffolding. <strong>Link:</strong> <Link href="/compare/hackerrank-vs-basanite" className="underline text-gold-600 hover:text-gold-700">HackerRank vs Basanite</Link>.
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
                  <th className="font-display font-normal text-basanite-900 px-4 py-3">Why you’re moving off HireVue</th>
                  <th className="font-display font-normal text-basanite-900 px-4 py-3">Best alternative</th>
                </tr>
              </thead>
              <tbody className="text-basanite-700">
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Need adaptive, probing conversation</td>
                  <td className="px-4 py-3">Basanite</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Need to test AI orchestration skill</td>
                  <td className="px-4 py-3">Basanite (Round 2 workbench)</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Want a human interviewer in the chair</td>
                  <td className="px-4 py-3">Karat</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Want a fast role-template AI interviewer</td>
                  <td className="px-4 py-3">Mercor</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Standardised coding-score benchmark</td>
                  <td className="px-4 py-3">CodeSignal</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Coding-test brand familiarity</td>
                  <td className="px-4 py-3">HackerRank</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Quote-grounded reports + GDPR Article 22</td>
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
            Book a 20-minute call. We will run a real CV-grounded interview against a sample candidate and walk you through the report.
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
