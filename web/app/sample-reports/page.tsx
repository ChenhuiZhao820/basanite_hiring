import Link from 'next/link'
import type { Metadata } from 'next'
import { LogoMark } from '@/components/Logo'
import { SampleReportsForm } from './SampleReportsForm'

export const metadata: Metadata = {
  title: 'See sample reports | Basanite',
  description:
    'Request a set of sample Basanite reports, the hirer report and the candidate report, to see exactly what an assessment produces.',
}

const BOOK_A_CALL_URL = 'https://cal.eu/basanite/intro'

export default function SampleReportsPage() {
  return (
    <div className="min-h-screen bg-earth-50 text-basanite-900">
      <nav className="fixed top-0 left-0 right-0 z-40 bg-earth-50/85 backdrop-blur-md border-b border-earth-200/60">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={26} dark />
            <span className="font-display text-basanite-900 text-lg">Basanite</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-5 text-sm text-basanite-600">
            <Link href="/pricing" className="hidden sm:inline hover:text-basanite-900 transition-colors">
              Pricing
            </Link>
            <Link href="/compare" className="hidden sm:inline hover:text-basanite-900 transition-colors">
              Comparisons
            </Link>
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

      <main className="max-w-5xl mx-auto px-6 pt-32 pb-24">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-start">
          <div>
            <p className="text-gold-700 text-[11px] font-semibold uppercase tracking-[0.25em] mb-4">
              Sample reports
            </p>
            <h1 className="font-display text-4xl sm:text-5xl mb-5 leading-[1.1]">
              See exactly what Basanite produces
            </h1>
            <p className="text-basanite-600 text-lg mb-6 leading-relaxed">
              Every assessment generates two reports: one for the hirer, with dimension-by-dimension
              scores grounded in the candidate&rsquo;s own words, and one for the candidate, with
              honest, personalised feedback.
            </p>
            <p className="text-basanite-600 text-base leading-relaxed">
              Sign up and we&rsquo;ll share a full sample of both so you can see the depth and
              fairness for yourself before you ever run an interview.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-basanite-700">
              <li className="flex gap-3">
                <span className="text-gold-600">&#10003;</span>
                A complete sample hirer report
              </li>
              <li className="flex gap-3">
                <span className="text-gold-600">&#10003;</span>
                A complete sample candidate report
              </li>
              <li className="flex gap-3">
                <span className="text-gold-600">&#10003;</span>
                No call required to take a look
              </li>
            </ul>
          </div>

          <SampleReportsForm />
        </div>
      </main>

      <footer className="border-t border-earth-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-basanite-500">
          <p>Built in Manchester by Drew, Lynn and Aditya. &copy; {new Date().getFullYear()} Basanite.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href="/" className="hover:text-basanite-900 transition-colors">Home</Link>
            <Link href="/pricing" className="hover:text-basanite-900 transition-colors">Pricing</Link>
            <Link href="/faq" className="hover:text-basanite-900 transition-colors">FAQ</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
