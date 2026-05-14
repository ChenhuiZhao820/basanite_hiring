// Comparison page — CodeSignal vs Basanite.
//
// CodeSignal's strength is its General Coding Assessment, certified
// benchmarks, and large library. Basanite's strength is unique CV-grounded
// conversation + an AI Collaboration round nobody else offers. The angle
// here is library-and-benchmark vs personalised-and-instrumented.

import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { LogoMark } from '@/components/Logo'
import { buildMetadata, faqPageJsonLd, breadcrumbJsonLd } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'CodeSignal vs Basanite — assessment library vs AI-instrumented interview',
  description:
    'Compare CodeSignal’s coding assessment library and certified benchmark scores against Basanite’s CV-grounded conversational interview and AI Collaboration Workbench.',
  path: '/compare/codesignal-vs-basanite',
  keywords: [
    'CodeSignal vs Basanite',
    'CodeSignal alternative',
    'coding assessment platform comparison',
    'AI interview',
  ],
})

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'What is CodeSignal’s General Coding Assessment?',
    a: 'CodeSignal’s GCA is a 70-minute four-task benchmark that produces a comparable Coding Score (out of 850). It is widely used for new-grad and early-career hiring as a standardised filter. The benefit is comparability; the cost is that any standardised benchmark with a published format is now solvable by AI agents in a fraction of the allotted time.',
  },
  {
    q: 'Does Basanite have anything like the GCA score?',
    a: 'Not by design. We deliberately avoid a single composite number because it discards the signal we work hardest to surface. Basanite reports a dimension-by-dimension score across 8 metacognitive constructs, each backed by a quote or trace event. A hirer reading the report sees not just how a candidate performed but specifically where their judgment is strong and where it is shallow.',
  },
  {
    q: 'Can CodeSignal handle the AI-cheating problem?',
    a: 'CodeSignal has shipped proctoring tooling — webcam, screen-share, plagiarism detection — and they iterate on it. Realistically, however, a candidate using an AI agent on a second device cannot be caught by webcam alone, and proctoring of a remote candidate has structural limits. Basanite sidesteps the arms race by making Round 1 unique to the candidate’s CV and by requiring AI use in Round 2.',
  },
  {
    q: 'Is there a place for both?',
    a: 'Yes. A meaningful number of customers run CodeSignal at the very top of the funnel for raw competence screening, then route candidates who clear that bar into Basanite for the deeper evaluation. CodeSignal’s ATS push and Basanite’s ATS push both land in the same Greenhouse / Lever / Ashby record, so the integration story is clean.',
  },
  {
    q: 'How does pricing compare?',
    a: 'CodeSignal is enterprise quote-based and typically lands in the £15k–£50k+ annual range for serious deployments, with significant uplift for proctoring features and assessment library access. Basanite is published: £400/mo Starter, £1,500/mo Growth, £3,300+/mo Agency, no per-candidate uplift inside your plan tier.',
  },
]

type Row = { feature: string; codesignal: string; basanite: string }

const COMPARISON_TABLE: Row[] = [
  {
    feature: 'Primary product',
    codesignal: 'Coding assessment library + GCA benchmark + interview platform',
    basanite: 'Conversational AI interview + AI Collaboration Workbench',
  },
  {
    feature: 'Question source',
    codesignal: 'Curated library, custom assessments, GCA fixed benchmark',
    basanite: 'Each interview generated from the individual candidate’s CV',
  },
  {
    feature: 'Standardised benchmark score',
    codesignal: 'Coding Score out of 850 from the GCA',
    basanite: 'No single composite; dimension-by-dimension behaviourally-anchored scores',
  },
  {
    feature: 'AI cheating resistance',
    codesignal: 'Proctoring + plagiarism detection on static tests',
    basanite: 'Unique CV-grounded questions; AI use required and instrumented in Round 2',
  },
  {
    feature: 'AI orchestration evaluation',
    codesignal: 'Not measured',
    basanite: '6 sub-dimensions instrumented through the Round 2 workbench session',
  },
  {
    feature: 'Conversational round',
    codesignal: 'Live coding interviews via the CodeSignal interview product (human-led)',
    basanite: 'Native AI-led 20–30 minute voice conversation, adaptive to candidate answers',
  },
  {
    feature: 'Evidence in the report',
    codesignal: 'Coding score + code submission + test-case outcomes',
    basanite: 'Quote-grounded dimension scores plus Round 2 trace events',
  },
  {
    feature: 'GDPR Article 22',
    codesignal: 'Available through compliance configurations',
    basanite: 'Built-in consent flow and self-serve form before any decision is acted on',
  },
  {
    feature: 'Candidate experience',
    codesignal: 'Algorithmic puzzle environment',
    basanite: 'CV-grounded conversation; many candidates rate it the most humane technical screen they have taken',
  },
  {
    feature: 'Candidate feedback report',
    codesignal: 'Score visibility varies by employer setting',
    basanite: 'Every candidate gets a personal feedback report regardless of outcome',
  },
  {
    feature: 'ATS integrations',
    codesignal: 'Direct integrations with major ATSs',
    basanite: '50+ ATSs via Merge.dev (Greenhouse, Lever, Ashby, Workable, BambooHR…)',
  },
  {
    feature: 'Best-fit company size',
    codesignal: 'Mid-market to enterprise, new-grad / early-career heavy funnels',
    basanite: 'Series A through mid-market, plus recruitment agencies running 30+ technical roles/yr',
  },
  {
    feature: 'Pricing',
    codesignal: 'Quote-based; typical mid-market £15k–£50k+/yr',
    basanite: 'Published: £400 / £1,500 / £3,300+ per month',
  },
]

export default async function CodeSignalVsBasanitePage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  const ldFaq = faqPageJsonLd(FAQ_ITEMS.map(i => ({ question: i.q, answer: i.a })))
  const ldCrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Compare', path: '/compare/codesignal-vs-basanite' },
    { name: 'CodeSignal vs Basanite', path: '/compare/codesignal-vs-basanite' },
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
            CodeSignal vs Basanite
          </h1>
          <p className="text-basanite-600 text-lg leading-relaxed max-w-2xl">
            CodeSignal built its category on standardised coding benchmarks — a comparable Coding Score, a polished assessment library, and certified frameworks. Basanite takes a different stance: every candidate gets a unique conversation built from their own CV, then a Round 2 that instruments how they work alongside an AI agent. Here is how they line up.
          </p>
        </header>

        {/* TL;DR */}
        <section className="mb-16 border border-earth-200 bg-white p-6 sm:p-8">
          <h2 className="font-display text-xl text-basanite-900 mb-3">TL;DR</h2>
          <ul className="space-y-3 text-basanite-700 text-base leading-relaxed">
            <li>
              <strong>Pick CodeSignal</strong> if a comparable single coding-score benchmark across thousands of new-grad candidates is the primary thing you need, and AI-era cheating is a problem you are willing to keep playing whack-a-mole with.
            </li>
            <li>
              <strong>Pick Basanite</strong> if you want to measure judgment, AI-collaboration skill, and engineering taste — not raw puzzle throughput — and you want every score backed by a verbatim quote.
            </li>
            <li>
              <strong>Use both</strong> if CodeSignal’s benchmark is your top-of-funnel filter and Basanite is your deeper, more humane evaluation layer.
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
                  <th className="font-display font-normal text-basanite-900 px-4 py-3">CodeSignal</th>
                  <th className="font-display font-normal text-basanite-900 px-4 py-3">Basanite</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_TABLE.map((row, i) => (
                  <tr key={i} className="border-t border-earth-200 align-top">
                    <td className="px-4 py-3 font-medium text-basanite-900">{row.feature}</td>
                    <td className="px-4 py-3 text-basanite-600">{row.codesignal}</td>
                    <td className="px-4 py-3 text-basanite-600">{row.basanite}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* What CodeSignal is best at */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-4">What CodeSignal is genuinely good at</h2>
          <div className="text-basanite-700 text-base leading-relaxed space-y-4 max-w-3xl">
            <p>
              CodeSignal’s defining product is the General Coding Assessment — a 70-minute, four-task test that produces a comparable 850-point Coding Score across millions of candidates. For large early-career programmes — graduate intake, new-grad pipelines, intern conversion — that comparability is real. A 720 from one university looks the same as a 720 from another, which makes downstream filtering more defensible.
            </p>
            <p>
              The assessment library is also large and well-maintained, with role-specific frameworks for backend, frontend, mobile, data, and ML. CodeSignal Interview adds a live coding environment for human-led pair-programming, which is genuinely useful for teams that want one platform spanning screen and on-site interview.
            </p>
            <p>
              On the AI-cheating problem CodeSignal has been honest about the difficulty and has shipped real proctoring features. We do not think proctoring solves the underlying issue — and they would probably agree — but for many enterprise customers the combination of proctoring plus plagiarism detection plus statistical anomaly tracking gives them a defensible-enough position.
            </p>
          </div>
        </section>

        {/* Where Basanite differs */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-4">Where Basanite differs</h2>
          <div className="text-basanite-700 text-base leading-relaxed space-y-4 max-w-3xl">
            <p>
              The architecture choices behind Basanite reflect a different bet about where the value of a technical assessment lives in 2026.
            </p>
            <p>
              <strong>Personalisation over benchmark.</strong> A comparable Coding Score gives you ranking. It does not tell you where the candidate’s judgment is strong, where they get sloppy, what kinds of system they are at home with, or how they decide which trade-offs are worth fighting for. Basanite builds the interview from the candidate’s CV, so the conversation is necessarily about systems they have actually worked on — which produces a more diagnostic, less rankable kind of signal.
            </p>
            <p>
              <strong>AI orchestration as a first-class signal.</strong> CodeSignal tests engineers as if AI is the enemy. Basanite tests engineers as if AI is the team-mate — because in 2026 that is what it is. Round 2 instruments six observable sub-dimensions of AI-collaboration skill that cannot be inferred from any standardised coding test.
            </p>
            <p>
              <strong>Quote-grounded scoring.</strong> CodeSignal gives you a score and a code submission. Basanite gives you a dimension report where no score above 3 can stand without a verbatim candidate quote or an observable Round 2 trace event. It is harder to dispute and easier to defend in a hiring committee.
            </p>
          </div>
        </section>

        {/* Use case fit */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-6">Which one fits you?</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="border border-earth-200 bg-white p-6">
              <h3 className="font-display text-lg text-basanite-900 mb-3">Pick CodeSignal if…</h3>
              <ul className="space-y-2 text-basanite-600 text-sm leading-relaxed list-disc pl-5 marker:text-gold-600">
                <li>You hire new-grad and early-career engineers at large volume</li>
                <li>A standardised comparable benchmark score is essential to your funnel</li>
                <li>You already operate the proctoring infrastructure to defend the test</li>
                <li>One vendor for screen-and-interview is operationally simpler</li>
              </ul>
            </div>
            <div className="border border-earth-200 bg-white p-6">
              <h3 className="font-display text-lg text-basanite-900 mb-3">Pick Basanite if…</h3>
              <ul className="space-y-2 text-basanite-600 text-sm leading-relaxed list-disc pl-5 marker:text-gold-600">
                <li>You hire mid- and senior-band engineers where judgment matters</li>
                <li>AI-collaboration skill is part of how the role actually ships work</li>
                <li>You want quote-grounded evidence on every dimension score</li>
                <li>Predictable platform pricing matters more than benchmark comparability</li>
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
            <Link href="/compare/karat-vs-basanite" className="border border-earth-200 bg-white p-4 hover:border-gold-500 transition-colors">
              <span className="block font-display text-basanite-900 mb-1">Karat vs Basanite</span>
              <span className="text-basanite-600">Human interviewers-as-a-service vs instrumented AI.</span>
            </Link>
            <Link href="/alternatives/codesignal" className="border border-earth-200 bg-white p-4 hover:border-gold-500 transition-colors">
              <span className="block font-display text-basanite-900 mb-1">CodeSignal alternatives</span>
              <span className="text-basanite-600">A wider survey of CodeSignal alternatives in 2026.</span>
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
            Book a 20-minute call. Bring a sample CodeSignal report if you have one — we will sit Basanite next to it.
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
