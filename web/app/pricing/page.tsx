import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { LogoMark } from '@/components/Logo'
import { buildMetadata, breadcrumbJsonLd, faqPageJsonLd } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'Pricing',
  description: 'Basanite pricing — monthly subscription credits, sized to headcount. Plans for founders, scaling tech teams, and specialist technical recruiters. Free pilot for qualifying teams.',
  path: '/pricing',
})

const BOOK_A_CALL_URL = 'https://cal.eu/basanite/intro'

type Plan = {
  name: string
  price: string
  period: string
  audience: string
  includes: string[]
  cta: string
  ctaHref: string
  highlighted?: boolean
}

const PLANS: Plan[] = [
  {
    name: 'Starter',
    price: '£400',
    period: 'per month',
    audience: 'Founders and small agencies hiring 1–3 engineers per quarter.',
    includes: [
      '30 interview credits per month',
      'Standard ATS integration',
      'All 8 metacognitive dimensions',
      'Round 1 conversational interview',
      'Quote-grounded hirer + candidate reports',
      'Email support',
    ],
    cta: 'Start with a pilot',
    ctaHref: BOOK_A_CALL_URL,
  },
  {
    name: 'Growth',
    price: '£1,500',
    period: 'per month',
    audience: 'Scaling tech teams and small recruitment desks.',
    includes: [
      '150 interview credits per month',
      '50+ ATS integrations via Merge.dev',
      'Custom evaluation frameworks',
      'Salary compatibility flows',
      'Round 1 + Round 2 AI Collaboration Workbench',
      'Priority support and onboarding',
    ],
    cta: 'Book a demo',
    ctaHref: BOOK_A_CALL_URL,
    highlighted: true,
  },
  {
    name: 'Agency',
    price: 'From £3,300',
    period: 'per month',
    audience: 'Specialist technical recruitment firms.',
    includes: [
      'Volume credit packs',
      'Multi-client workspace',
      'White-labelled candidate flow',
      'Priority model capacity',
      'Dedicated CSM',
      'Custom contract terms',
    ],
    cta: 'Talk to founders',
    ctaHref: BOOK_A_CALL_URL,
  },
]

const COMPARISON_VALUE = [
  { what: 'A mis-hire at a £70k salary', cost: '£50,000+ once ramp, backfill, and lost output are counted', vs: 'evidence-backed briefings lower the risk of making that call blind' },
  { what: 'Senior engineer time lost to first-round screens', cost: 'Hours per week off key projects', vs: 'your engineers only meet candidates worth meeting' },
  { what: 'A paid trial week with one contractor', cost: '£4,000 – £8,000', vs: 'covered by ~10 months of Starter plan' },
  { what: 'University assessment-centre cost per candidate', cost: '£500 – £2,000', vs: 'one Basanite credit delivers deeper evidence at a fraction of the cost' },
]

const FAQ = [
  {
    question: 'What is one credit worth?',
    answer: 'One credit funds one complete candidate assessment — Round 1 conversational interview, optional Round 2 AI Collaboration Workbench, and the full hirer + candidate report. There are no hidden per-minute or per-token charges.',
  },
  {
    question: 'Do unused credits roll over?',
    answer: 'No. Credits reset monthly. Most customers use less than half their allowance in the first month and ramp up as their pipeline fills. We will not penalise you for under-using during onboarding.',
  },
  {
    question: 'What if we need more credits in a hiring spike?',
    answer: 'Top-ups are available on demand at £25 per credit on Starter, £20 on Growth, and volume-discounted on Agency. We do not throttle you mid-month.',
  },
  {
    question: 'Is there a free pilot?',
    answer: 'Yes, for qualifying teams. We run Basanite on a real candidate of yours, free, in exchange for an honest reaction. The 20-minute intro call is the place to ask about it.',
  },
  {
    question: 'Annual contracts?',
    answer: 'Available on Growth and Agency plans, with a 15% discount on monthly equivalents. Talk to us if you want this.',
  },
  {
    question: 'What does the price NOT include?',
    answer: 'Bring-your-own ElevenLabs voice clone (we cover the standard voice). Custom on-premise deployment for regulated industries — talk to us about Enterprise pricing.',
  },
]

export default async function PricingPage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  const ldCrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Pricing', path: '/pricing' },
  ])
  const ldFaq = faqPageJsonLd(FAQ.map(f => ({ question: f.question, answer: f.answer })))

  return (
    <div className="min-h-screen bg-earth-50 text-basanite-900">
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldCrumbs) }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldFaq) }}
      />

      <SlimNav />

      <main className="max-w-5xl mx-auto px-6 pt-24 pb-24">
        {/* Hero */}
        <header className="mb-16 max-w-3xl">
          <p className="text-gold-700 text-[11px] font-semibold uppercase tracking-[0.25em] mb-4">Pricing</p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[1.05] mb-6">
            Subscription credits, sized to headcount.
          </h1>
          <p className="text-basanite-600 text-lg leading-relaxed mb-3">
            Monthly interview-credit allowance. Top-ups when you need them. One credit equals one complete assessment.
          </p>
          <p className="text-basanite-500 text-sm">
            Gross margin above 50%. We grow when you grow.
          </p>
        </header>

        {/* Plans */}
        <section className="mb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PLANS.map(p => (
              <div
                key={p.name}
                className={`flex flex-col bg-white border p-7 ${p.highlighted ? 'border-gold-500 ring-1 ring-gold-500/50' : 'border-earth-300/60'}`}
              >
                {p.highlighted && (
                  <p className="text-gold-700 text-[10px] font-semibold uppercase tracking-[0.22em] mb-3">Most popular</p>
                )}
                <h2 className="font-display text-basanite-900 text-2xl mb-1">{p.name}</h2>
                <p className="text-basanite-500 text-xs leading-relaxed mb-5 min-h-[2.5rem]">{p.audience}</p>
                <div className="mb-6">
                  <span className="font-display text-3xl text-basanite-900">{p.price}</span>
                  <span className="text-basanite-500 text-sm ml-2">{p.period}</span>
                </div>
                <ul className="space-y-2 mb-7 flex-1">
                  {p.includes.map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm text-basanite-600">
                      <span className="text-gold-500 mt-0.5 shrink-0 text-xs">◆</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={p.ctaHref}
                  target="_blank"
                  rel="noreferrer"
                  className={`block text-center px-5 py-3 text-sm font-medium transition-colors ${p.highlighted ? 'bg-basanite-900 text-earth-50 hover:bg-gold-600' : 'border border-basanite-900 text-basanite-900 hover:bg-basanite-900 hover:text-earth-50'}`}
                >
                  {p.cta}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Value comparison */}
        <section className="mb-20">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-3">What a wrong hire really costs</h2>
          <p className="text-basanite-500 text-sm mb-7 max-w-2xl">
            Basanite&apos;s pricing makes sense against the cost of hiring risk: the salary of a mis-hire, and the time your highest-value contributors lose along the way. Know your candidates better, lower the risk — and let your engineers engineer.
          </p>
          <div className="border border-earth-300/60 bg-white">
            <div className="hidden sm:grid grid-cols-3 gap-4 px-6 py-3 border-b border-earth-200 text-[11px] font-semibold uppercase tracking-[0.15em] text-gold-700">
              <span>What it normally costs</span>
              <span>Typical price</span>
              <span>Compared to Basanite</span>
            </div>
            {COMPARISON_VALUE.map((row, i) => (
              <div
                key={row.what}
                className={`grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 px-6 py-4 ${i < COMPARISON_VALUE.length - 1 ? 'border-b border-earth-200' : ''}`}
              >
                <p className="text-sm text-basanite-900 font-medium">{row.what}</p>
                <p className="text-sm text-basanite-700">{row.cost}</p>
                <p className="text-sm text-basanite-600">{row.vs}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pilot CTA */}
        <section className="mb-20 border border-gold-500/40 bg-white p-8 sm:p-10">
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 items-start sm:items-center">
            <div className="flex-1">
              <h2 className="font-display text-2xl text-basanite-900 mb-2">Free pilot for qualifying teams</h2>
              <p className="text-basanite-600 text-sm leading-relaxed">
                We&apos;ll run Basanite on a real candidate of yours, free, in exchange for an honest reaction. Founders, ops leads, and staffing firms hiring contractors monthly are our sweet spot.
              </p>
            </div>
            <a
              href={BOOK_A_CALL_URL}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 inline-block px-6 py-3 bg-basanite-900 text-earth-50 text-sm font-medium hover:bg-gold-600 transition-colors"
            >
              Book a call
            </a>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-20">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-8">Pricing FAQ</h2>
          <div className="border-t border-earth-200">
            {FAQ.map(f => (
              <details key={f.question} className="group border-b border-earth-200 [&_summary::-webkit-details-marker]:hidden">
                <summary className="cursor-pointer list-none py-5 flex items-start justify-between gap-6 hover:bg-earth-100/40 transition-colors -mx-3 px-3">
                  <span className="font-display text-basanite-900 text-base sm:text-lg leading-snug">{f.question}</span>
                  <span aria-hidden="true" className="shrink-0 mt-1 text-gold-600 transition-transform duration-200 group-open:rotate-45 text-2xl leading-none">+</span>
                </summary>
                <div className="text-basanite-600 text-base leading-relaxed pb-6 pr-10 max-w-3xl">{f.answer}</div>
              </details>
            ))}
          </div>
        </section>

        {/* Related */}
        <section className="border-t border-earth-200 pt-10">
          <p className="text-gold-700 text-[11px] font-semibold uppercase tracking-[0.25em] mb-4">Keep reading</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/faq" className="inline-block px-4 py-2 border border-earth-300 text-basanite-600 text-sm hover:border-basanite-900 hover:text-basanite-900 transition-colors">FAQ</Link>
            <Link href="/about" className="inline-block px-4 py-2 border border-earth-300 text-basanite-600 text-sm hover:border-basanite-900 hover:text-basanite-900 transition-colors">About</Link>
            <Link href="/compare/hackerrank-vs-basanite" className="inline-block px-4 py-2 border border-earth-300 text-basanite-600 text-sm hover:border-basanite-900 hover:text-basanite-900 transition-colors">vs HackerRank</Link>
            <Link href="/compare/hirevue-vs-basanite" className="inline-block px-4 py-2 border border-earth-300 text-basanite-600 text-sm hover:border-basanite-900 hover:text-basanite-900 transition-colors">vs HireVue</Link>
            <Link href="/blog" className="inline-block px-4 py-2 border border-earth-300 text-basanite-600 text-sm hover:border-basanite-900 hover:text-basanite-900 transition-colors">Blog</Link>
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
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark size={26} dark />
          <span className="font-display text-basanite-900 text-lg">Basanite</span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-5 text-sm text-basanite-600">
          <Link href="/about" className="hidden sm:inline hover:text-basanite-900 transition-colors">About</Link>
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
      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-basanite-500">
        <p>Built in Manchester by Drew, Lynn and Aditya. &copy; {new Date().getFullYear()} Basanite.</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link href="/" className="hover:text-basanite-900 transition-colors">Home</Link>
          <Link href="/pricing" className="hover:text-basanite-900 transition-colors">Pricing</Link>
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
