'use client'

// "The impact" — headline numbers + ROI calculator on the dark stone band.
// Extracted from app/value/page.tsx so it can render both on the homepage
// (between the dimensions and the process) and on the /value page without
// duplicating the copy or the calculator math. The assumptions link points at
// /value#roi-assumptions so it resolves from either page.

import { useEffect, useMemo, useRef, useState } from 'react'
import { StoneTexture } from '@/components/StoneTexture'

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

const NUMBERS = [
  {
    value: '17 hours',
    desc: 'of senior engineering time saved per hire.',
    caption: 'Replaces the screening + first technical round.',
  },
  {
    value: '30 days',
    desc: 'cut from time-to-hire.',
    caption: 'From 10 weeks to 6, on average.',
  },
  {
    value: '£10–15k',
    desc: 'in mishire risk avoided, per hire.',
    caption:
      "46% of new hires fail in 18 months. 89% of those failures are signals coding tests don't measure.",
  },
  {
    value: '1 report',
    desc: 'behind every hiring decision.',
    caption:
      'Eight dimensions, scored on the same rubric, every time. Defensible to your board, your team, and the candidate.',
  },
]

// Editable value display: shows the formatted figure, turns into a free-type
// field on focus, and commits a clamped value on blur / Enter, so users can
// type a number in directly instead of only dragging the slider.
function ROIValueInput({
  value,
  min,
  max,
  onChange,
  prefix = '',
  ariaLabel,
}: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  prefix?: string
  ariaLabel: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const display = draft ?? value.toLocaleString('en-GB')

  const commit = () => {
    if (draft === null) return
    const digits = draft.replace(/[^0-9]/g, '')
    const next =
      digits === '' ? value : Math.min(max, Math.max(min, Number(digits)))
    onChange(next)
    setDraft(null)
  }

  return (
    <span className="font-display text-2xl text-gold-400 tabular-nums">
      {prefix}
      <input
        type="text"
        inputMode="numeric"
        aria-label={ariaLabel}
        value={display}
        onChange={e => setDraft(e.target.value)}
        onFocus={e => {
          setDraft(value.toString())
          const el = e.currentTarget
          requestAnimationFrame(() => el.select())
        }}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        className="bg-transparent text-right text-gold-400 tabular-nums outline-none border-b border-transparent focus:border-gold-500/50 transition-colors"
        style={{ width: `${Math.max(display.length, 2) + 1}ch` }}
      />
    </span>
  )
}

export function ImpactSection() {
  const ref = useReveal()
  const [n, setN] = useState(40)
  const [s, setS] = useState(80000)

  const recovered = useMemo(() => {
    const perHire = 15 * 80 + 0.10 * s * 0.5 + 10 * 500
    const round = (v: number) => Math.round(v / 1000) * 1000
    return round(n * perHire)
  }, [n, s])

  const fmt = (v: number) => `£${v.toLocaleString('en-GB')}`

  return (
    <section
      id="roi-calculator"
      className="relative py-16 sm:py-20 px-6 bg-basanite-900 overflow-hidden scroll-mt-16"
    >
      <StoneTexture />
      <div ref={ref} className="reveal relative z-10 max-w-5xl mx-auto text-center">
        <p className="text-gold-500 text-[11px] font-semibold uppercase tracking-[0.22em] mb-3">
          The impact
        </p>
        <h2 className="font-display text-earth-50 text-3xl sm:text-4xl mb-10 leading-[1.15]">
          What you get back
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-left">
          {NUMBERS.map((num, i) => (
            <div key={num.value} className="relative pt-4 border-t-2 border-gold-500/50">
              <div className="text-gold-500 text-[10px] font-semibold uppercase tracking-[0.25em] mb-2">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="font-display text-earth-50 text-2xl sm:text-3xl leading-[1.05] mb-2">
                {num.value}
              </div>
              <p className="text-earth-200 text-sm leading-relaxed">
                {num.desc}
              </p>
              <p className="italic text-earth-400 text-xs leading-relaxed mt-2">
                {num.caption}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-10 border-t border-earth-300/10">
          <h3 className="font-display text-earth-50 text-2xl sm:text-3xl mb-8">
            See your number
          </h3>

          <div className="grid sm:grid-cols-2 gap-x-12 gap-y-8 max-w-3xl mx-auto text-left">
            <div>
              <div className="flex items-baseline justify-between text-sm text-earth-300 mb-3">
                <label htmlFor="roi-engineers">Engineers hired a year</label>
                <ROIValueInput
                  value={n}
                  min={1}
                  max={200}
                  onChange={setN}
                  ariaLabel="Engineers hired per year"
                />
              </div>
              <input
                id="roi-engineers"
                type="range"
                min={1}
                max={200}
                step={1}
                value={n}
                onChange={e => setN(Number(e.target.value))}
                className="roi-slider w-full"
              />
              <div className="flex justify-between text-xs text-earth-500 mt-2">
                <span>1</span>
                <span>200</span>
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between text-sm text-earth-300 mb-3">
                <label htmlFor="roi-salary">Average base salary (&pound;)</label>
                <ROIValueInput
                  value={s}
                  min={25000}
                  max={250000}
                  onChange={setS}
                  prefix="£"
                  ariaLabel="Average base salary in pounds"
                />
              </div>
              <input
                id="roi-salary"
                type="range"
                min={25000}
                max={250000}
                step={5000}
                value={s}
                onChange={e => setS(Number(e.target.value))}
                className="roi-slider w-full"
              />
              <div className="flex justify-between text-xs text-earth-500 mt-2">
                <span>&pound;25,000</span>
                <span>&pound;250,000</span>
              </div>
            </div>
          </div>

          <p className="mt-10 text-earth-100 text-xl sm:text-2xl leading-relaxed">
            Basanite recovers{' '}
            <span className="font-display text-gold-400">~{fmt(recovered)}</span>{' '}
            of your hiring inefficiency.
          </p>

          <p className="italic text-earth-500 text-sm mt-4">
            Math: Ashby 2026, Leadership IQ, SHRM 2025.{' '}
            <a
              href="/value#roi-assumptions"
              className="not-italic text-gold-500 hover:text-gold-400 underline underline-offset-4 decoration-gold-500/40 font-medium"
            >
              See the assumptions &darr;
            </a>
          </p>
        </div>
      </div>

      <style jsx>{`
        .roi-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 2px;
          background: #3d3a36;
          border-radius: 1px;
          outline: none;
          cursor: pointer;
        }
        .roi-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #c49a2f;
          border: 2px solid #1a1a18;
          box-shadow: 0 0 0 3px rgba(196, 154, 47, 0.15);
          cursor: grab;
          transition: box-shadow 0.15s ease;
        }
        .roi-slider::-webkit-slider-thumb:hover {
          box-shadow: 0 0 0 6px rgba(196, 154, 47, 0.2);
        }
        .roi-slider::-webkit-slider-thumb:active {
          cursor: grabbing;
          box-shadow: 0 0 0 8px rgba(196, 154, 47, 0.25);
        }
        .roi-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #c49a2f;
          border: 2px solid #1a1a18;
          box-shadow: 0 0 0 3px rgba(196, 154, 47, 0.15);
          cursor: grab;
        }
        .roi-slider::-moz-range-track {
          height: 2px;
          background: #3d3a36;
          border-radius: 1px;
        }
      `}</style>
    </section>
  )
}
