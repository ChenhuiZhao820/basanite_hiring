// Alternatives page — Mercor alternatives in 2026.
//
// Mercor is the closest competitor to Basanite by category. The honest
// difference is depth: role-templated AI interviewers vs CV-grounded
// adaptive interviews plus a second AI Collaboration round. Be honest
// about Mercor's strengths — they are well-funded, fast to deploy,
// and have meaningful market traction.

import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { LogoMark } from '@/components/Logo'
import { buildMetadata, faqPageJsonLd, breadcrumbJsonLd } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'Mercor alternatives — five AI interview platforms compared',
  description:
    'A guide to Mercor alternatives in 2026. Why teams compare role-templated AI interviewers, what CV-grounded adaptive interviews add, and how Basanite, HireVue, Karat, CodeSignal and HackerRank fit.',
  path: '/alternatives/mercor',
  keywords: [
    'Mercor alternative',
    'Mercor alternatives 2026',
    'AI interviewer alternative',
    'AI conversational interview',
  ],
})

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'How is Basanite different from Mercor?',
    a: 'Two structural differences. First, every Basanite interview is built from the individual candidate’s own CV — no role templates — so the conversation is necessarily about systems the candidate has actually worked on. Second, Basanite has a Round 2: the AI Collaboration Workbench, a sandboxed VS Code environment where the candidate ships work in a real codebase alongside their own AI agent. Mercor focuses on the conversational round only.',
  },
  {
    q: 'Is Mercor a worse product?',
    a: 'No. Mercor is a serious product with real traction and a well-resourced team. The right framing is that they are solving a slightly different problem — fast role-template deployment across many roles — while Basanite is solving the technical-layer-interview problem with maximum depth per candidate. For a team running a generalist hiring funnel across many functions, Mercor is a perfectly defensible choice.',
  },
  {
    q: 'Why does CV-grounded matter?',
    a: 'Role-template interviews ask similar questions of every candidate applying for the same role. Once a candidate population has seen a few of those interviews, the questions leak — and prepared candidates outperform genuinely good ones. CV-grounded interviews are unique to each candidate, so leaked answer banks do not help, and the conversation is automatically about systems the candidate has hands-on experience with.',
  },
  {
    q: 'Do I need both rounds?',
    a: 'For most technical roles, yes. Round 1 surfaces judgment, tacit knowledge, and how the candidate frames problems — signal that lives in narrative. Round 2 surfaces engineering taste, AI orchestration, and shipping calibration — signal that lives in observable behaviour. Together they cross-validate. Where the rounds agree the signal is reinforced; where they disagree the report flags the discrepancy for the human interviewer to probe.',
  },
  {
    q: 'What about pricing?',
    a: 'Mercor’s pricing is private and shaped to enterprise contracts. Basanite publishes: Starter £400/mo, Growth £1,500/mo, Agency £3,300+/mo. For most teams running 30+ technical hires/yr the unit economics work out favourably for Basanite once you account for the value of the Round 2 evaluation Mercor does not currently offer.',
  },
]

export default async function MercorAlternativesPage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  const ldFaq = faqPageJsonLd(FAQ_ITEMS.map(i => ({ question: i.q, answer: i.a })))
  const ldCrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Alternatives', path: '/alternatives/mercor' },
    { name: 'Mercor alternatives', path: '/alternatives/mercor' },
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
            Mercor alternatives in 2026
          </h1>
          <p className="text-basanite-600 text-lg leading-relaxed max-w-2xl">
            Mercor is one of the most visible new entrants in AI interviewing and has scaled quickly. For teams comparison-shopping the category, here are the five most relevant alternatives — and where Basanite specifically differs in approach.
          </p>
        </header>

        {/* Why people look */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-4">Why teams compare alternatives</h2>
          <div className="text-basanite-700 text-base leading-relaxed space-y-4 max-w-3xl">
            <p>
              Mercor took an explicit position early: role-templated AI interviewers that deploy fast across many functions. That bet has worked — they have real volume and a serious customer base. Teams comparing alternatives usually have one of three sensitivities.
            </p>
            <p>
              <strong>Depth of signal per candidate.</strong> A role template asks similar questions of every candidate applying for the same role. For senior-band hiring where the questions need to probe the specific systems the candidate has worked on, role templates can feel generic. CV-grounded interviewing is the deeper alternative.
            </p>
            <p>
              <strong>Hands-on engineering evidence.</strong> Mercor focuses on the conversational round. For teams that want to see candidates actually ship work in a codebase — not just talk about it — a second-round workbench matters.
            </p>
            <p>
              <strong>Quote-grounded evidence.</strong> Teams pushing AI interviewing through a compliance review (UK / EU GDPR, US EEOC) typically need every score in the report backed by specific evidence. The level of evidence varies across the category.
            </p>
          </div>
        </section>

        {/* Top alternatives */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-6">Top Mercor alternatives in 2026</h2>

          <div className="space-y-8">
            <article className="border border-earth-200 bg-white p-6 sm:p-8">
              <header className="mb-3 flex items-start justify-between gap-3 flex-wrap">
                <h3 className="font-display text-xl text-basanite-900">1. Basanite</h3>
                <span className="text-[11px] uppercase tracking-[0.18em] text-gold-700 font-semibold">Two-round, CV-grounded</span>
              </header>
              <p className="text-basanite-700 text-base leading-relaxed mb-3">
                Basanite is the most direct alternative for teams who want the AI-interviewer model with more depth per candidate. Every Round 1 conversation is built from the individual candidate’s CV — there are no role templates, so leaked answer banks do not help. Round 2 is the AI Collaboration Workbench: a sandboxed VS Code environment, a multi-thousand-line role-matched codebase, a real ticket, and the candidate’s own AI agent. Scoring is dimension-by-dimension across 8 metacognitive constructs, every score above 3 backed by a verbatim candidate quote or trace event. GDPR Article 22 is built into the consent flow.
              </p>
              <p className="text-basanite-600 text-sm leading-relaxed">
                <strong>Best for:</strong> Engineering, ML, data, security and applied-AI hiring where depth per candidate matters. <strong>Pricing:</strong> £400 / £1,500 / £3,300+ per month. <strong>Link:</strong> <Link href="/" className="underline text-gold-600 hover:text-gold-700">basanite.co.uk</Link> · <Link href="/faq" className="underline text-gold-600 hover:text-gold-700">FAQ</Link>.
              </p>
            </article>

            <article className="border border-earth-200 bg-white p-6 sm:p-8">
              <h3 className="font-display text-xl text-basanite-900 mb-3">2. HireVue</h3>
              <p className="text-basanite-700 text-base leading-relaxed mb-3">
                HireVue takes a different bet from Mercor — async video plus transcript scoring rather than live conversational AI. For teams comparing Mercor with a non-conversational alternative for behavioural / culture-fit screening, HireVue is the operational benchmark. HireVue Coding adds a coding workspace. It is not measuring AI orchestration in the way modern engineering roles require.
              </p>
              <p className="text-basanite-600 text-sm leading-relaxed">
                <strong>Best for:</strong> Enterprise-scale async behavioural screening across many functions. <strong>Link:</strong> <Link href="/compare/hirevue-vs-basanite" className="underline text-gold-600 hover:text-gold-700">HireVue vs Basanite</Link>.
              </p>
            </article>

            <article className="border border-earth-200 bg-white p-6 sm:p-8">
              <h3 className="font-display text-xl text-basanite-900 mb-3">3. Karat</h3>
              <p className="text-basanite-700 text-base leading-relaxed mb-3">
                If the reason for considering Mercor is operational — taking the interview load off your engineering team — but you would rather have a human in the chair than an AI, Karat is the obvious alternative. Vetted contract engineers, structured rubrics, per-interview pricing (typically US$300–600+). The trade-off is unit economics and scheduling-against-panel-availability, which is exactly the constraint AI interviewers were invented to remove.
              </p>
              <p className="text-basanite-600 text-sm leading-relaxed">
                <strong>Best for:</strong> Senior-band hiring where stakeholders require a human interviewer. <strong>Link:</strong> <Link href="/compare/karat-vs-basanite" className="underline text-gold-600 hover:text-gold-700">Karat vs Basanite</Link>.
              </p>
            </article>

            <article className="border border-earth-200 bg-white p-6 sm:p-8">
              <h3 className="font-display text-xl text-basanite-900 mb-3">4. CodeSignal</h3>
              <p className="text-basanite-700 text-base leading-relaxed mb-3">
                CodeSignal’s value proposition is benchmark comparability through the General Coding Assessment. For teams comparing Mercor for new-grad pipelines, CodeSignal is the standardised alternative — a comparable 850-point Coding Score across millions of candidates. It is a coding test rather than a conversational interview, so the substitution is partial. AI-cheating mitigation is via proctoring.
              </p>
              <p className="text-basanite-600 text-sm leading-relaxed">
                <strong>Best for:</strong> New-grad and early-career pipelines with strict comparability requirements. <strong>Link:</strong> <Link href="/compare/codesignal-vs-basanite" className="underline text-gold-600 hover:text-gold-700">CodeSignal vs Basanite</Link>.
              </p>
            </article>

            <article className="border border-earth-200 bg-white p-6 sm:p-8">
              <h3 className="font-display text-xl text-basanite-900 mb-3">5. HackerRank</h3>
              <p className="text-basanite-700 text-base leading-relaxed mb-3">
                HackerRank is the most familiar name in the technical-assessment market and the biggest installed base. As a Mercor alternative it is a partial substitute — HackerRank is primarily a coding test platform, not a conversational interviewer — but teams that want a brand-name coding screen with mature tooling often default here.
              </p>
              <p className="text-basanite-600 text-sm leading-relaxed">
                <strong>Best for:</strong> Teams with existing HackerRank rubric scaffolding or strong brand familiarity in their candidate population. <strong>Link:</strong> <Link href="/compare/hackerrank-vs-basanite" className="underline text-gold-600 hover:text-gold-700">HackerRank vs Basanite</Link>.
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
                  <th className="font-display font-normal text-basanite-900 px-4 py-3">Why you’re comparing alternatives</th>
                  <th className="font-display font-normal text-basanite-900 px-4 py-3">Best fit</th>
                </tr>
              </thead>
              <tbody className="text-basanite-700">
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Want per-candidate CV-grounded interviews</td>
                  <td className="px-4 py-3">Basanite</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Want hands-on AI-collaboration evaluation</td>
                  <td className="px-4 py-3">Basanite (Round 2 workbench)</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Need GDPR Article 22 built-in</td>
                  <td className="px-4 py-3">Basanite</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Need async video at enterprise scale</td>
                  <td className="px-4 py-3">HireVue</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Need a human in the chair</td>
                  <td className="px-4 py-3">Karat</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Need comparable benchmark score</td>
                  <td className="px-4 py-3">CodeSignal</td>
                </tr>
                <tr className="border-t border-earth-200 align-top">
                  <td className="px-4 py-3 font-medium">Existing HackerRank rubric scaffolding</td>
                  <td className="px-4 py-3">HackerRank</td>
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
            Book a 20-minute call. We will run a real CV-grounded interview against a sample candidate and show you the Round 2 workbench in action.
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
