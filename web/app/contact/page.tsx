import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { SiteNav } from '@/components/SiteNav'
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'Contact',
  description: 'Get in touch with Basanite — book a demo, ask a question, request a pilot, or talk to founders directly.',
  path: '/contact',
})

const BOOK_A_CALL_URL = 'https://cal.eu/basanite/intro'

const CONTACTS = [
  {
    role: 'General enquiries',
    email: 'hello@basanite.co.uk',
    description: 'For pilots, demos, partnership conversations, and anything else.',
  },
  {
    role: 'Privacy & data rights',
    email: 'privacy@basanite.co.uk',
    description: 'GDPR access, deletion, portability requests. Single point of contact for the founders acting as joint controllers.',
  },
  {
    role: 'Press & speaking',
    email: 'hello@basanite.co.uk',
    description: 'Interviews, conference invitations, and media enquiries.',
  },
]

const FOUNDERS = [
  { name: 'Aditya Shah', role: 'CEO', linkedin: 'https://www.linkedin.com/in/adityashah100/' },
  { name: 'Andrew Robertson', role: 'CTO', linkedin: 'https://www.linkedin.com/in/andrewrobertsonamr/' },
  { name: 'Lynn Zhao', role: 'CPO', linkedin: 'https://www.linkedin.com/in/lynn-zhao-59a198292/' },
]

export default async function ContactPage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  const ldCrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Contact', path: '/contact' },
  ])

  const ldContact = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact Basanite',
    url: 'https://basanite.co.uk/contact',
    mainEntity: {
      '@type': 'Organization',
      name: 'Basanite',
      email: 'hello@basanite.co.uk',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Manchester',
        addressCountry: 'GB',
      },
      contactPoint: CONTACTS.map(c => ({
        '@type': 'ContactPoint',
        contactType: c.role,
        email: c.email,
      })),
    },
  }

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldContact) }}
      />

      <SiteNav />

      <main className="max-w-4xl mx-auto px-6 pt-24 pb-24">
        <header className="mb-14 max-w-3xl">
          <p className="text-gold-700 text-[11px] font-semibold uppercase tracking-[0.25em] mb-4">Contact</p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[1.05] mb-6">
            Get in touch.
          </h1>
          <p className="text-basanite-600 text-lg leading-relaxed">
            We respond within a working day, usually within a few hours. The fastest path is the 20-minute intro call.
          </p>
        </header>

        {/* Primary CTA: book a call */}
        <section className="mb-16 border border-gold-500/40 bg-white p-8 sm:p-10">
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 items-start sm:items-center">
            <div className="flex-1">
              <h2 className="font-display text-2xl text-basanite-900 mb-2">Book a 20-minute call</h2>
              <p className="text-basanite-600 text-sm leading-relaxed">
                Walk through Basanite live on your own job description. We&apos;ll show you the interview, the report, and the eight dimensions — and answer anything in the way.
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

        {/* Contact channels */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-8">By email</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {CONTACTS.map(c => (
              <a
                key={c.role}
                href={`mailto:${c.email}`}
                className="block border border-earth-300/60 bg-white p-6 hover:border-gold-500 transition-colors"
              >
                <p className="text-gold-700 text-[11px] font-semibold uppercase tracking-[0.2em] mb-2">{c.role}</p>
                <p className="font-display text-basanite-900 text-lg mb-2">{c.email}</p>
                <p className="text-basanite-500 text-sm leading-relaxed">{c.description}</p>
              </a>
            ))}
          </div>
        </section>

        {/* Direct outreach */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-3">Talk to a founder directly</h2>
          <p className="text-basanite-500 text-sm mb-7 max-w-2xl">
            Sometimes the fastest way is LinkedIn. We try to reply within 24 hours.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {FOUNDERS.map(f => (
              <a
                key={f.name}
                href={f.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="block border border-earth-300/60 bg-white p-5 hover:border-gold-500 transition-colors"
              >
                <p className="font-display text-basanite-900 text-base mb-0.5">{f.name}</p>
                <p className="text-gold-600 text-[11px] font-semibold uppercase tracking-widest mb-2">{f.role}</p>
                <p className="text-basanite-500 text-xs">LinkedIn →</p>
              </a>
            ))}
          </div>
        </section>

        {/* Office / location */}
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-3">Where we are</h2>
          <p className="text-basanite-600 text-base leading-relaxed max-w-2xl">
            Manchester, United Kingdom. We work out of Frontier Fridays and the Masood Entrepreneurship Centre. Happy to meet in person if you&apos;re in the city.
          </p>
        </section>

        {/* Data rights */}
        <section className="border-t border-earth-200 pt-10">
          <h2 className="font-display text-xl text-basanite-900 mb-3">Data subject rights</h2>
          <p className="text-basanite-600 text-sm leading-relaxed max-w-2xl mb-3">
            If you want to access, export, or delete personal data Basanite holds about you, the fastest way is the self-serve data-rights page. We respond within 30 days as required by UK GDPR.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/data-rights"
              className="inline-block px-4 py-2 border border-basanite-900 text-basanite-900 text-xs font-medium hover:bg-basanite-900 hover:text-earth-50 transition-colors"
            >
              Open data-rights page
            </Link>
            <Link
              href="/privacy"
              className="inline-block px-4 py-2 border border-earth-300 text-basanite-600 text-xs font-medium hover:border-basanite-900 hover:text-basanite-900 transition-colors"
            >
              Read the privacy notice
            </Link>
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
      <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-basanite-500">
        <p>&copy; {new Date().getFullYear()} Basanite.</p>
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
