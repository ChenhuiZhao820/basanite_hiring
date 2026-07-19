import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { SiteNav } from '@/components/SiteNav'
import { buildMetadata, breadcrumbJsonLd, faqPageJsonLd } from '@/lib/seo'
import { QuoteForm } from './QuoteForm'

export const metadata: Metadata = buildMetadata({
  title: 'Pricing',
  description:
    'Basanite pricing — priced per role, from £249. Start free with 3 interviews, no card. Detailed pricing is quoted to your hiring volume and role mix.',
  path: '/pricing',
})

const BOOK_A_CALL_URL = 'https://cal.eu/basanite/intro'
// Self-serve free entry point. Points at the app sign-in for now; the actual
// no-gate free-signup flow lives behind this route.
const FREE_HREF = '/login'

// Section 3 — the variables that shape a quote (primes buyers for the call).
const QUOTE_DEPENDS = [
  'Roles you expect to hire for per year',
  'Seniority mix of those roles',
  'Team size',
  'ATS and the integrations you need',
]

// Section 4 — capability list, applies to all paid usage (not tied to tiers).
const INCLUDED = [
  'All 8 metacognitive dimensions',
  'Round 1 conversational interview',
  'Round 2 AI Collaboration Workbench',
  'Quote-grounded hirer + candidate reports',
  'ATS integration via Merge.dev',
  'GDPR compliance',
  'Bias and adverse-impact monitoring',
]

// Section 6 — reconciled to per-role pricing rather than monthly plans.
const COMPARISON_VALUE = [
  { what: 'A mis-hire at a £70k salary', cost: '£50,000+ once ramp, backfill, and lost output are counted', vs: 'evidence-backed briefings lower the risk of making that call blind' },
  { what: 'Senior engineer time lost to first-round screens', cost: 'Hours per week off key projects', vs: 'your engineers only meet candidates worth meeting' },
  { what: 'A paid trial week with one contractor', cost: '£4,000 – £8,000', vs: '16–32× the price of screening that role with Basanite first' },
  { what: 'University assessment-centre cost per candidate', cost: '£500 – £2,000', vs: '2–8× the price of one Basanite role' },
]

const FAQ = [
  {
    question: 'How does per-role pricing work?',
    answer: 'You pay per role, from £249, not per month. Each role comes with an interview allowance sized to your hiring volume and agreed when we quote you — enough to work through your shortlist for that opening. Only if you go well beyond that allowance on a single role do extra interviews cost more, at a rate we agree up front, so there are never surprises.',
  },
  {
    question: 'What counts as a "role"?',
    answer: 'One genuine opening with a job description, run within a defined hiring window. A single requisition you interview several candidates against is one role, not one role per candidate.',
  },
  {
    question: 'How is my quote calculated?',
    answer: 'From four things: how many roles you expect to hire for in a year, the seniority mix of those roles, your team size, and the integrations you need. Bring rough numbers to the call and we will price it fairly to your actual volume.',
  },
  {
    question: 'Do you offer a trial or founding-customer terms?',
    answer: 'Both. You can start free with 3 interviews and see the full hirer and candidate reports, no card required. We also take a limited number of founding customers at a reduced per-role rate locked for 12 months, in exchange for a case study and a couple of reference calls.',
  },
  {
    question: 'How is candidate data handled?',
    answer: 'Basanite is GDPR-compliant, candidates consent before anything is recorded, and every assessment runs through bias and adverse-impact monitoring so scoring stays fair and defensible. Ask us for the detail on data residency and retention.',
  },
  {
    question: 'Is there anything the price does not include?',
    answer: 'The standard voice is covered; a bring-your-own ElevenLabs voice clone is optional. Custom or on-premise deployment for regulated industries is handled under Enterprise terms — talk to us.',
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

      <SiteNav />

      <main className="max-w-5xl mx-auto px-6 pt-24 pb-24">
        {/* Hero */}
        <header className="mb-12 max-w-3xl">
          <p className="text-gold-700 text-[11px] font-semibold uppercase tracking-[0.25em] mb-4">Pricing</p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[1.05] mb-6">
            Priced per role. Not per seat.
          </h1>
          <p className="text-basanite-600 text-lg leading-relaxed">
            Start free, then pay per role. We quote to your hiring volume, so you are never stuck in a tier that does not fit.
          </p>
        </header>

        {/* 1. Two-path frame */}
        <section className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Free path */}
            <div className="flex flex-col bg-white border border-earth-300/60 p-8">
              <p className="text-basanite-500 text-[10px] font-semibold uppercase tracking-[0.22em] mb-3">Start free</p>
              <h2 className="font-display text-basanite-900 text-2xl mb-2">Run 3 interviews, free</h2>
              <p className="text-basanite-600 text-sm leading-relaxed flex-1 mb-6">
                See the full hirer and candidate reports on 3 real interviews. No credit card, no sales call — the self-serve way to try Basanite.
              </p>
              <a
                href={FREE_HREF}
                className="block text-center px-5 py-3 text-sm font-medium border border-basanite-900 text-basanite-900 hover:bg-basanite-900 hover:text-earth-50 transition-colors"
              >
                Start free
              </a>
            </div>

            {/* Paid path */}
            <div className="flex flex-col bg-white border border-gold-500 ring-1 ring-gold-500/50 p-8">
              <p className="text-gold-700 text-[10px] font-semibold uppercase tracking-[0.22em] mb-3">Per role</p>
              <div className="mb-2">
                <span className="font-display text-basanite-900 text-4xl">From £249</span>
                <span className="text-basanite-500 text-sm ml-2">per role</span>
              </div>
              <p className="text-basanite-600 text-sm leading-relaxed flex-1 mb-6">
                Final pricing depends on your hiring volume and role mix. We&rsquo;ll quote you on a quick call.
              </p>
              <a
                href="#get-a-quote"
                className="block text-center px-5 py-3 text-sm font-medium bg-basanite-900 text-earth-50 hover:bg-gold-600 transition-colors"
              >
                Get a quote
              </a>
            </div>
          </div>

          {/* 2. Why quote-based (one line) */}
          <p className="text-basanite-500 text-sm mt-6 max-w-2xl">
            Pricing scales with your hiring volume and role mix, so every team is priced fairly rather than squeezed into a tier that doesn&rsquo;t fit.
          </p>
        </section>

        {/* 3. What the quote depends on */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-3">What shapes your quote</h2>
          <p className="text-basanite-500 text-sm mb-6 max-w-2xl">
            Have rough numbers on these ready for the call and we can price it on the spot.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {QUOTE_DEPENDS.map(item => (
              <div key={item} className="flex items-start gap-2.5 border border-earth-300/60 bg-white px-5 py-4">
                <span className="text-gold-500 mt-0.5 shrink-0 text-xs">◆</span>
                <span className="text-sm text-basanite-700">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 4. What's included */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-3">What&rsquo;s included</h2>
          <p className="text-basanite-500 text-sm mb-6 max-w-2xl">
            Every paid role gets the full platform. No feature gates by tier.
          </p>
          <div className="border border-earth-300/60 bg-white p-7">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {INCLUDED.map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-basanite-700">
                  <span className="text-gold-500 mt-0.5 shrink-0 text-xs">◆</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 5. Founding-customer offer */}
        <section className="mb-16 border border-gold-500/50 bg-white p-8 sm:p-10">
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 items-start sm:items-center">
            <div className="flex-1">
              <p className="text-gold-700 text-[10px] font-semibold uppercase tracking-[0.22em] mb-3">Limited slots</p>
              <h2 className="font-display text-2xl text-basanite-900 mb-2">Become a founding customer</h2>
              <p className="text-basanite-600 text-sm leading-relaxed">
                We&rsquo;re taking a small number of founding customers at a reduced per-role rate, locked for 12 months. In exchange we ask for a case study and a couple of reference calls — a real partnership while we prove the model together.
              </p>
            </div>
            <a
              href="#get-a-quote"
              className="shrink-0 inline-block px-6 py-3 bg-basanite-900 text-earth-50 text-sm font-medium hover:bg-gold-600 transition-colors"
            >
              Become a founding customer
            </a>
          </div>
        </section>

        {/* 6. What a wrong hire really costs */}
        <section className="mb-16">
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

        {/* 7. Get a quote */}
        <section id="get-a-quote" className="mb-20 scroll-mt-24">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-3">Get a quote</h2>
          <p className="text-basanite-500 text-sm mb-7 max-w-2xl">
            A few details and we&rsquo;ll come back with pricing sized to your hiring. Takes under a minute.
          </p>
          <QuoteForm />
        </section>

        {/* 8. Pricing FAQ */}
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
            <Link href="/compare" className="inline-block px-4 py-2 border border-earth-300 text-basanite-600 text-sm hover:border-basanite-900 hover:text-basanite-900 transition-colors">Comparisons</Link>
            <Link href="/blog" className="inline-block px-4 py-2 border border-earth-300 text-basanite-600 text-sm hover:border-basanite-900 hover:text-basanite-900 transition-colors">Blog</Link>
          </div>
        </section>
      </main>

      <SlimFooter />
    </div>
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
