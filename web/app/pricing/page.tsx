import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { SiteNav } from '@/components/SiteNav'
import { StoneTexture } from '@/components/StoneTexture'
import { buildMetadata, breadcrumbJsonLd, faqPageJsonLd } from '@/lib/seo'
import { QuoteForm } from './QuoteForm'
import { Reveal } from '@/components/Reveal'

export const metadata: Metadata = buildMetadata({
  title: 'Pricing',
  description:
    'Basanite pricing: priced per role, from £249. Start free with 3 interviews, no card. Detailed pricing is quoted to your hiring volume and role mix.',
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
  'Round 1 conversational interview',
  'Round 2 AI Collaboration Workbench',
  'Quote-grounded hirer + candidate reports',
  'ATS integration via Merge.dev',
  'GDPR compliance',
  'Bias and adverse-impact monitoring',
]

const FAQ = [
  {
    question: 'How does per-role pricing work?',
    answer: 'You pay per role, from £249, not per month. Each role comes with an interview allowance sized to your hiring volume and agreed when we quote you, enough to work through your shortlist for that opening. Only if you go well beyond that allowance on a single role do extra interviews cost more, at a rate we agree up front, so there are never surprises.',
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
    answer: 'The standard voice is covered; a bring-your-own ElevenLabs voice clone is optional. Custom or on-premise deployment for regulated industries is handled under Enterprise terms. Talk to us.',
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
      {/* Browsers hide the CSP nonce from the client DOM, so the SSR nonce
          never matches on hydration — a known-benign mismatch. Suppressed
          here the same way the root layout does for its JSON-LD graph. */}
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldCrumbs) }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldFaq) }}
      />

      <SiteNav />

      {/* Hero — dark stone band, echoing the homepage's basanite-900 surfaces
          so the top of the page has depth rather than opening on flat cream. */}
      <header className="relative overflow-hidden bg-basanite-900 pt-32 pb-20 px-6">
        <StoneTexture />
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="hero-in max-w-3xl">
            <p className="hero-item text-gold-400 text-[11px] font-semibold uppercase tracking-[0.25em] mb-5" style={{ ['--d' as string]: '0ms' }}>Pricing</p>
            <h1 className="hero-item font-display text-earth-50 text-4xl sm:text-5xl md:text-6xl leading-[1.05] mb-6" style={{ ['--d' as string]: '100ms' }}>
              Priced per role.{' '}
              <em className="text-gold-400">Not per seat.</em>
            </h1>
            <p className="hero-item text-earth-200 text-lg leading-relaxed" style={{ ['--d' as string]: '220ms' }}>
              Start free, then pay per role. We quote to your hiring volume, so you are never stuck in a tier that does not fit.
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-24">
        {/* 1. Two-path frame — pulled up to overlap the hero band so the two
            cards read as the page's centerpiece decision. */}
        <Reveal as="section" className="relative z-10 -mt-12 mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
            {/* Free path */}
            <div className="card-hover flex flex-col bg-white border border-earth-300/60 p-8 shadow-[0_20px_50px_-30px_rgba(15,15,14,0.4)]">
              <p className="text-basanite-500 text-[10px] font-semibold uppercase tracking-[0.22em] mb-3">Start free</p>
              <h2 className="font-display text-basanite-900 text-2xl mb-2">Run 3 interviews, free</h2>
              <div className="mb-4">
                <span className="font-display text-basanite-900 text-4xl">£0</span>
                <span className="text-basanite-500 text-sm ml-2">no card</span>
              </div>
              <p className="text-basanite-600 text-sm leading-relaxed flex-1 mb-6">
                See the full hirer and candidate reports on 3 real interviews. No credit card, no sales call. The self-serve way to try Basanite.
              </p>
              <a
                href={FREE_HREF}
                className="block text-center px-5 py-3 text-sm font-medium border border-basanite-900 text-basanite-900 hover:bg-basanite-900 hover:text-earth-50 transition-colors"
              >
                Start free
              </a>
            </div>

            {/* Paid path — dark stone surface makes it the hero choice rather
                than just a gold-outlined twin of the free card. */}
            <div className="relative flex flex-col overflow-hidden bg-basanite-900 border border-gold-500/60 p-8 shadow-[0_30px_70px_-30px_rgba(15,15,14,0.6)]">
              <StoneTexture />
              <span className="absolute top-0 right-0 bg-gold-500 text-basanite-900 text-[10px] font-semibold uppercase tracking-[0.18em] px-3 py-1">Most teams</span>
              <div className="relative z-10 flex flex-col flex-1">
                <p className="text-gold-400 text-[10px] font-semibold uppercase tracking-[0.22em] mb-3">Per role</p>
                <h2 className="font-display text-earth-50 text-2xl mb-2">Hire for a role</h2>
                <div className="mb-4">
                  <span className="font-display text-gold-400 text-5xl">From £249</span>
                  <span className="text-earth-300 text-sm ml-2">per role</span>
                </div>
                <p className="text-earth-200 text-sm leading-relaxed flex-1 mb-6">
                  Final pricing depends on your hiring volume and role mix. We&rsquo;ll quote you on a quick call.
                </p>
                <a
                  href="#get-a-quote"
                  className="block text-center px-5 py-3 text-sm font-semibold bg-gold-500 text-basanite-900 hover:bg-gold-400 transition-colors"
                >
                  Get a quote
                </a>
              </div>
            </div>
          </div>

          {/* 2. Why quote-based (one line) */}
          <p className="text-basanite-500 text-sm mt-6 max-w-2xl">
            Pricing scales with your hiring volume and role mix, so every team is priced fairly rather than squeezed into a tier that doesn&rsquo;t fit.
          </p>
        </Reveal>

        {/* 3. What the quote depends on */}
        <Reveal as="section" className="mb-16">
          <p className="text-gold-700 text-[11px] font-semibold uppercase tracking-[0.22em] mb-3">The quote</p>
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-3">What shapes your quote</h2>
          <p className="text-basanite-500 text-sm mb-6 max-w-2xl">
            Have rough numbers on these ready for the call and we can price it on the spot.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {QUOTE_DEPENDS.map((item, i) => (
              <div key={item} className="card-hover flex items-start gap-3 border border-earth-300/60 bg-white px-5 py-4">
                <span className="font-display text-gold-500/80 text-lg leading-none shrink-0 w-6">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-sm text-basanite-700 pt-0.5">{item}</span>
              </div>
            ))}
          </div>
        </Reveal>

        {/* 4. What's included */}
        <Reveal as="section" className="mb-16">
          <p className="text-gold-700 text-[11px] font-semibold uppercase tracking-[0.22em] mb-3">Every role</p>
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-3">What&rsquo;s included</h2>
          <p className="text-basanite-500 text-sm mb-6 max-w-2xl">
            Every paid role gets the full platform. No feature gates by tier.
          </p>
          <div className="border border-earth-300/60 bg-white p-7">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {INCLUDED.map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-basanite-700">
                  <span className="text-gold-500 mt-0.5 shrink-0 text-xs">&#9670;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        {/* 5. Founding-customer offer — dark stone band, echoing the homepage
            closing CTA, so this stands apart from the white info sections. */}
        <Reveal as="section" className="mb-16">
          <div className="relative overflow-hidden bg-basanite-900 border border-gold-500/30 p-8 sm:p-10">
            <StoneTexture />
            <div className="relative z-10 flex flex-col sm:flex-row gap-6 sm:gap-10 items-start sm:items-center">
              <div className="flex-1">
                <p className="text-gold-400 text-[10px] font-semibold uppercase tracking-[0.22em] mb-3">Limited slots</p>
                <h2 className="font-display text-2xl sm:text-3xl text-earth-50 mb-2">Become a founding customer</h2>
                <p className="text-earth-200 text-sm leading-relaxed">
                  We&rsquo;re taking a small number of founding customers at a reduced per-role rate, locked for 12 months. In exchange we ask for a case study and a couple of reference calls, a real partnership while we prove the model together.
                </p>
              </div>
              <a
                href="#get-a-quote"
                className="shrink-0 inline-block px-6 py-3 bg-gold-500 text-basanite-900 text-sm font-semibold hover:bg-gold-400 transition-colors"
              >
                Become a founding customer
              </a>
            </div>
          </div>
        </Reveal>

        {/* 7. Get a quote */}
        <Reveal as="section" id="get-a-quote" className="mb-20 scroll-mt-24">
          <p className="text-gold-700 text-[11px] font-semibold uppercase tracking-[0.22em] mb-3">Get pricing</p>
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-3">Get a quote</h2>
          <p className="text-basanite-500 text-sm mb-7 max-w-2xl">
            A few details and we&rsquo;ll come back with pricing sized to your hiring. Takes under a minute.
          </p>
          <QuoteForm />
        </Reveal>

        {/* 8. Pricing FAQ */}
        <Reveal as="section" className="mb-20">
          <p className="text-gold-700 text-[11px] font-semibold uppercase tracking-[0.22em] mb-3">Questions</p>
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-8">Pricing FAQ</h2>
          <div className="border-t border-earth-200">
            {FAQ.map(f => (
              <details key={f.question} className="group border-b border-earth-200 [&_summary::-webkit-details-marker]:hidden">
                <summary className="cursor-pointer list-none py-5 flex items-start justify-between gap-6 hover:bg-earth-100/40 transition-colors -mx-3 px-3 border-l-2 border-transparent group-open:border-gold-500">
                  <span className="font-display text-basanite-900 text-base sm:text-lg leading-snug group-open:text-gold-700 transition-colors">{f.question}</span>
                  <span aria-hidden="true" className="shrink-0 mt-1 text-gold-600 transition-transform duration-200 group-open:rotate-45 text-2xl leading-none">+</span>
                </summary>
                <div className="text-basanite-600 text-base leading-relaxed pb-6 pr-10 pl-3 max-w-3xl">{f.answer}</div>
              </details>
            ))}
          </div>
        </Reveal>

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
        <p>&copy; {new Date().getFullYear()} Basanite.</p>
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
