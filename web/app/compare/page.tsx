import Link from 'next/link'
import type { Metadata } from 'next'
import { LogoMark } from '@/components/Logo'

export const metadata: Metadata = {
  title: 'How Basanite compares | Basanite',
  description:
    'Honest head-to-head comparisons of Basanite against HackerRank, HireVue, CodeSignal and Karat.',
}

const BOOK_A_CALL_URL = 'https://cal.eu/basanite/intro'

const COMPARISONS: { href: string; name: string; blurb: string }[] = [
  {
    href: '/compare/hackerrank-vs-basanite',
    name: 'vs HackerRank',
    blurb: 'Automated coding tests versus a conversational assessment of real capability.',
  },
  {
    href: '/compare/hirevue-vs-basanite',
    name: 'vs HireVue',
    blurb: 'One-way recorded video screening versus a depth-first AI interview.',
  },
  {
    href: '/compare/codesignal-vs-basanite',
    name: 'vs CodeSignal',
    blurb: 'Score-only screening versus evidence-grounded, dimension-by-dimension reports.',
  },
  {
    href: '/compare/karat-vs-basanite',
    name: 'vs Karat',
    blurb: 'Outsourced human interviewers versus a consistent, structured AI interview.',
  },
]

export default function ComparePage() {
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
            <Link href="/faq" className="hidden sm:inline hover:text-basanite-900 transition-colors">
              FAQ
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
        <p className="text-gold-700 text-[11px] font-semibold uppercase tracking-[0.25em] mb-4">
          Comparisons
        </p>
        <h1 className="font-display text-4xl sm:text-5xl mb-5 leading-[1.1]">How Basanite compares</h1>
        <p className="text-basanite-600 text-lg max-w-2xl mb-12">
          How Basanite stacks up against the tools teams usually weigh it against. Each one is an
          honest, head-to-head look at where the two approaches differ and where each fits.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          {COMPARISONS.map(c => (
            <Link
              key={c.href}
              href={c.href}
              className="group block border border-earth-300 p-6 hover:border-basanite-900 hover:bg-white transition-colors"
            >
              <span className="font-display text-2xl text-basanite-900 group-hover:text-gold-700 transition-colors">
                Basanite {c.name}
              </span>
              <p className="text-basanite-600 text-sm mt-2">{c.blurb}</p>
            </Link>
          ))}
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
