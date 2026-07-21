'use client'

// Value page — the assumptions behind the homepage ROI calculator and "The
// four levers". "The impact" itself (components/ImpactSection) lives on the
// homepage at /#roi-calculator; the nav's Value dropdown links both.

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { SavingsFlow } from '@/components/SavingsFlow'
import { SiteNav } from '@/components/SiteNav'

// ─── Scroll reveal hook ──────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); obs.disconnect() } },
      { threshold: 0.08 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

// ─── ROI assumptions ───────────────────────────────────────────────────
// The six constants behind the calculator above, each tied to its cited
// benchmark. Moved from the methodology page so the number and its
// justification live side by side.
const ASSUMPTIONS = [
  {
    figure: '15 hours',
    label: 'Time saved per hire',
    source: 'Derived from Zivaro 2025 and Ashby 2026 benchmarks for technical screening hours.',
  },
  {
    figure: '£80',
    label: 'Blended hourly cost',
    source: 'Weighted mix of recruiter and engineering time.',
  },
  {
    figure: '10 pts',
    label: 'Mishire reduction',
    source: 'Conservative estimate against a 46% baseline (Leadership IQ, n=20,000).',
  },
  {
    figure: '0.5× salary',
    label: 'Replacement cost multiplier',
    source: 'Low end of SHRM 2025 replacement cost range.',
  },
  {
    figure: '10 days',
    label: 'Days of vacancy avoided',
    source: 'Conservative estimate against 30-day average reduction.',
  },
  {
    figure: '£500',
    label: 'Vacancy cost per day',
    source: 'Floor estimate from McKinsey developer-productivity research.',
  },
]

function ROIAssumptions() {
  const ref = useReveal()
  return (
    <section
      id="roi-assumptions"
      className="py-12 sm:py-16 px-6 bg-earth-50 border-b border-earth-200/80 scroll-mt-16"
    >
      <div ref={ref} className="reveal max-w-5xl mx-auto text-center">
        <p className="text-gold-600 text-[11px] font-semibold uppercase tracking-[0.22em] mb-4">
          The assumptions
        </p>
        <h2 className="font-display text-basanite-900 text-3xl sm:text-4xl mb-10 leading-[1.15]">
          The assumptions behind your number.
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          {ASSUMPTIONS.map(a => (
            <div key={a.label} className="border-l-2 border-gold-500/40 pl-5">
              <div className="font-display text-basanite-900 text-2xl leading-none mb-1.5">
                {a.figure}
              </div>
              <p className="text-basanite-900 font-semibold text-sm mb-1">{a.label}</p>
              <p className="text-basanite-600 text-sm leading-relaxed">{a.source}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Section 4 · The four levers ─────────────────────────────────────────
function FourLevers() {
  const ref = useReveal()
  return (
    <section className="py-12 sm:py-16 px-6 bg-white border-b border-earth-200/80">
      <div ref={ref} className="reveal max-w-5xl mx-auto text-center">
        <p className="text-gold-600 text-[11px] font-semibold uppercase tracking-[0.22em] mb-4">
          The four levers
        </p>
        <h2 className="font-display text-basanite-900 text-3xl sm:text-4xl md:text-5xl mb-8 leading-[1.15]">
          Where the savings come from
        </h2>

        <SavingsFlow />

        <p className="text-basanite-700 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto text-left mt-6">
          And it bends to your role, not the other way around. Custom
          dimensions, custom rubrics, and custom workbench tasks for
          engineering, data, ML, security, or wherever you take it next.
        </p>
      </div>
    </section>
  )
}

// ─── Footer ──────────────────────────────────────────────────────────────
function ValueFooter() {
  return (
    <footer className="border-t border-earth-200 bg-white">
      <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-basanite-500">
        <p>Built in Manchester by Drew, Lynn and Aditya.</p>
        <div className="flex items-center gap-5">
          <Link href="/" className="hover:text-basanite-900 transition-colors">
            Home
          </Link>
          <Link href="/faq" className="hover:text-basanite-900 transition-colors">
            FAQ
          </Link>
          <Link href="/login" className="hover:text-basanite-900 transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────
export default function ValuePage() {
  return (
    <>
      <SiteNav />
      <main className="pt-16">
        <ROIAssumptions />
        <FourLevers />
      </main>
      <ValueFooter />
    </>
  )
}
