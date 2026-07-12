import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { headers } from 'next/headers'
import { LogoMark } from '@/components/Logo'
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'About',
  description: 'Basanite was founded in 2026 by three final-year computer scientists from the University of Manchester, building the technical interview we wish had filtered us.',
  path: '/about',
})

const BOOK_A_CALL_URL = 'https://cal.eu/basanite/intro'

const TEAM = [
  {
    name: 'Aditya Shah',
    role: 'CEO',
    img: '/team/aditya.png',
    linkedin: 'https://www.linkedin.com/in/adityashah100/',
    bullets: [
      'Data Analyst & Technology Modeller at Virgin Media O2 (13-month placement)',
      'Previously founded an edtech startup',
      'Final-year Computer Science, University of Manchester',
    ],
    blurb: 'Owns commercial, fundraising, customer discovery and positioning. Has lived the candidate side of the broken hiring funnel first-hand.',
  },
  {
    name: 'Andrew Robertson',
    role: 'CTO',
    img: '/team/drew.png',
    linkedin: 'https://www.linkedin.com/in/andrewrobertsonamr/',
    bullets: [
      'SWE Intern at The Trade Desk, Rothschild & Co, Cisco',
      'ICHack26 1st place, Bloomberg Bpuzzled 1st place',
      'Final-year Computer Science, University of Manchester',
    ],
    blurb: 'Owns the agent architecture, the Next.js + FastAPI + Supabase stack, and the production engineering of the interview itself.',
  },
  {
    name: 'Lynn Zhao',
    role: 'CPO',
    img: '/team/lynn.png',
    linkedin: 'https://www.linkedin.com/in/lynn-zhao-59a198292/',
    bullets: [
      'BSc Artificial Intelligence, University of Manchester',
      'AI Safety Fellowship at BlueDot Impact, prior internship at OpenAI Cambridge',
      'UniHack 2025 Digital CleanUp — 1st place',
    ],
    blurb: 'Owns product, primary research with hiring managers and occupational psychometricians, and the prompt architecture behind the interview agent.',
  },
]

const TIMELINE = [
  { date: 'Early 2026', headline: 'Problem identified', body: 'The three of us were applying for graduate engineering roles and watching technical screens collapse — leaked question banks, take-homes that could be done by Cursor in ten minutes, and a hiring funnel that no longer measured anything real.' },
  { date: 'April 2026', headline: 'MVP shipped', body: 'End-to-end working product: hirer dashboard, candidate portal, live 10–20 minute AI voice interview, dual reports grounded in candidate quotes. Built in week one.' },
  { date: 'May 2026', headline: '50 trial users', body: 'University of Manchester CS students, Manchester technology recruiters, and early hirers running mock interviews. Surveyed feedback drove iteration two.' },
  { date: 'May 2026', headline: 'Stripe VC accelerator', body: 'Accepted into the Stripe internal accelerator alongside ongoing applications to YC and VFA26.' },
  { date: 'May 2026', headline: 'First paid pilot', body: 'Verbal commitment from a seven-figure-revenue technology recruitment firm in Manchester. First contract worth ~£40k ARR.' },
  { date: '2026 →', headline: 'Iteration three', body: 'The AI Collaboration Workbench: a sandboxed VS Code environment where candidates ship a real ticket alongside the AI agent of their choice. The dimension no other interview measures.' },
]

const VALUES = [
  {
    title: 'Depth over breadth',
    body: 'Each layer of the assessment exists to move one level deeper into signal quality. A candidate who answers fluently at the surface should encounter ground that shifts beneath them at the next layer. The edges of real ability are blurry; performed ability has no edges.',
  },
  {
    title: 'Structure as fairness',
    body: 'By anchoring every evaluation to consistent frameworks and explicit scoring criteria, a self-taught engineer without institutional pedigree can be seen as clearly as one from a target university. Both are asked the same questions in the same spirit, with the same depth of follow-up.',
  },
  {
    title: 'Honest about AI limits',
    body: 'We flag where human expertise is required, produce quotable evidence rather than opaque scores, and position Basanite as infrastructure that makes human judgement better — not the mechanism that replaces it.',
  },
  {
    title: 'A two-way mirror',
    body: 'The best hiring processes leave candidates with a clearer understanding of themselves. Every assessment strategy deployed by Basanite can be honestly explained to the candidate it is applied to.',
  },
]

export default async function AboutPage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  const ldCrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
  ])

  return (
    <div className="min-h-screen bg-earth-50 text-basanite-900">
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldCrumbs) }}
      />

      <SlimNav />

      <main className="max-w-4xl mx-auto px-6 pt-24 pb-24">
        {/* Hero */}
        <header className="mb-20 max-w-3xl">
          <p className="text-gold-700 text-[11px] font-semibold uppercase tracking-[0.25em] mb-4">About Basanite</p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[1.05] mb-8">
            We are building the technical interview we wish had filtered us.
          </h1>
          <p className="text-basanite-600 text-lg leading-relaxed mb-5">
            Basanite is an AI-native technical hiring platform. Every candidate gets a unique conversation built from their own CV, so leaked answers and AI cheating tools stop working. Hirers only spend their senior-engineer hours on candidates worth meeting.
          </p>
          <p className="text-basanite-600 text-lg leading-relaxed">
            Founded in 2026 in Manchester, UK, by three final-year computer scientists.
          </p>
        </header>

        {/* Mission */}
        <section className="mb-20">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-6">Our mission</h2>
          <p className="text-basanite-600 text-base leading-relaxed max-w-3xl mb-4">
            Technical hiring has two breakdowns we want to solve. The first is that coding tests have collapsed into a cheating arms race — capable AI agents and screen overlays make take-homes and live-coding screens trivial to pass without exercising the underlying skill. The second is that the capability that <em>does</em> matter — engineering effectiveness when working alongside AI — is not measured anywhere.
          </p>
          <p className="text-basanite-600 text-base leading-relaxed max-w-3xl mb-4">
            Banning AI from the interview selects for unaided coding while leaving the AI-orchestration skill entirely untested. We do something different. We give every candidate a unique conversation built from their own CV, then put them in a real codebase alongside the AI tool of their choice and watch how they ship.
          </p>
          <p className="text-basanite-600 text-base leading-relaxed max-w-3xl">
            We do not believe AI should make the hiring decision. We believe AI should produce evidence — quote-grounded, auditable, fair — so the human interviewer can make a better one.
          </p>
        </section>

        {/* Values */}
        <section className="mb-20">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-8">What we believe</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {VALUES.map(v => (
              <div key={v.title} className="border border-earth-300/60 bg-white p-7">
                <h3 className="font-display text-lg text-basanite-900 mb-3">{v.title}</h3>
                <p className="text-basanite-600 text-sm leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section className="mb-20">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-2">Story so far</h2>
          <p className="text-basanite-500 text-sm mb-8">Six weeks. Three pivots. Live product.</p>
          <ol className="border-l-2 border-gold-500/40 pl-6 space-y-7">
            {TIMELINE.map(t => (
              <li key={t.headline} className="relative">
                <span className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-gold-500" aria-hidden="true" />
                <p className="text-gold-700 text-[11px] font-semibold uppercase tracking-[0.2em] mb-1">{t.date}</p>
                <h3 className="font-display text-lg text-basanite-900 mb-1.5">{t.headline}</h3>
                <p className="text-basanite-600 text-sm leading-relaxed max-w-2xl">{t.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Team */}
        <section className="mb-20" id="team">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-2">The team</h2>
          <p className="text-basanite-500 text-sm mb-10">Three final-year computer scientists at the University of Manchester.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {TEAM.map(m => (
              <div key={m.name} className="border border-earth-300/60 bg-white p-7 flex flex-col">
                <div className="flex items-center gap-4 mb-5">
                  <div className="relative w-14 h-14 rounded-full overflow-hidden bg-earth-200 shrink-0">
                    <Image src={m.img} alt={m.name} fill className="object-cover object-top" sizes="56px" />
                  </div>
                  <div>
                    <h3 className="font-display text-basanite-900 text-lg leading-tight">{m.name}</h3>
                    <p className="text-gold-600 text-xs font-semibold uppercase tracking-widest mt-0.5">{m.role}</p>
                  </div>
                </div>
                <p className="text-basanite-600 text-sm leading-relaxed mb-4">{m.blurb}</p>
                <ul className="space-y-1.5 mb-5 flex-1">
                  {m.bullets.map(b => (
                    <li key={b} className="flex items-start gap-2 text-xs text-basanite-500">
                      <span className="text-gold-500 mt-0.5 shrink-0">◆</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={m.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-basanite-500 hover:text-gold-600 transition-colors"
                >
                  LinkedIn →
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Where to next */}
        <section className="border-t border-earth-200 pt-12">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-3">Want to see it?</h2>
          <p className="text-basanite-600 text-base mb-8 max-w-xl">
            Book a 20-minute intro and we&apos;ll walk you through the platform live, on your own job description.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={BOOK_A_CALL_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-block px-6 py-3 bg-basanite-900 text-earth-50 text-sm font-medium hover:bg-gold-600 transition-colors"
            >
              Book a call
            </a>
            <Link
              href="/faq"
              className="inline-block px-6 py-3 border border-basanite-900 text-basanite-900 text-sm font-medium hover:bg-basanite-900 hover:text-earth-50 transition-colors"
            >
              Read the FAQ
            </Link>
            <Link
              href="/contact"
              className="inline-block px-6 py-3 border border-earth-300 text-basanite-600 text-sm font-medium hover:border-basanite-900 hover:text-basanite-900 transition-colors"
            >
              Get in touch
            </Link>
          </div>
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
          <Link href="/#how-it-works" className="hidden sm:inline hover:text-basanite-900 transition-colors">How it works</Link>
          <Link href="/faq" className="hidden sm:inline hover:text-basanite-900 transition-colors">FAQ</Link>
          <a
            href={BOOK_A_CALL_URL}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-earth-50 bg-basanite-900 px-4 py-2 hover:bg-gold-600 transition-colors duration-200"
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
        <p>Built in Manchester by Drew, Lynn and Aditya. &copy; {new Date().getFullYear()} Basanite.</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link href="/" className="hover:text-basanite-900 transition-colors">Home</Link>
          <Link href="/about" className="hover:text-basanite-900 transition-colors">About</Link>
          <Link href="/contact" className="hover:text-basanite-900 transition-colors">Contact</Link>
          <Link href="/faq" className="hover:text-basanite-900 transition-colors">FAQ</Link>
          <Link href="/privacy" className="hover:text-basanite-900 transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-basanite-900 transition-colors">Terms</Link>
        </div>
      </div>
    </footer>
  )
}
