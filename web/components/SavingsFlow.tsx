'use client'

import { useEffect, useRef, useState } from 'react'

// ─── Savings-flow (Sankey / leak diagram) ────────────────────────────────
// Answers "Where the savings come from" literally: total hiring spend flows
// in from the left and branches peel off as labelled leaks — recruiter hours,
// engineer hours, vacancy days, mis-hire risk (the four levers). The diagram
// tweens between two states: "Today" (wide leaks) and "With Basanite" (leaks
// narrowed, a gold "Recovered" flow arriving on the right). Widths here encode
// money (a single common unit), so the flow is honest; the specifics stay as
// text labels. Mobile falls back to two simplified stacked bars.

type Leak = {
  key: string
  label: string
  sub: string
  color: string
  today: number
  basanite: number
}

// Effective spend is the legitimate cost of the hire — it never leaks.
const EFFECTIVE = { key: 'effective', label: 'Effective spend', sub: 'The hire itself', color: '#847d72', value: 120 }

const LEAKS: Leak[] = [
  { key: 'recruiter', label: 'Recruiter hours', sub: 'Screening & phone screens', color: '#b6c8d6', today: 55, basanite: 20 },
  { key: 'engineer', label: 'Engineer hours', sub: '~17 hrs/hire on early rounds', color: '#8ea6ba', today: 70, basanite: 28 },
  { key: 'vacancy', label: 'Vacancy days', sub: '~30 days a role stays open', color: '#6a869d', today: 45, basanite: 22 },
  { key: 'mishire', label: 'Mis-hire risk', sub: '46% fail within 18 months', color: '#4e6a82', today: 50, basanite: 30 },
]

const RECOVERED_COLOR = '#c49a2f'
const RECOVERED_TOTAL = LEAKS.reduce((a, l) => a + (l.today - l.basanite), 0) // 120
const TOTAL = EFFECTIVE.value + LEAKS.reduce((a, l) => a + l.today, 0) // 340

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

// Scalar rAF tween toward a target, eased. Frozen (no animation) when disabled.
function useTween(target: number, enabled: boolean) {
  const [val, setVal] = useState(target)
  const cur = useRef(target)
  const raf = useRef<number | null>(null)
  useEffect(() => {
    if (!enabled) {
      cur.current = target
      setVal(target)
      return
    }
    const from = cur.current
    const start = performance.now()
    const dur = 1100
    const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2)
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur)
      cur.current = lerp(from, target, ease(p))
      setVal(cur.current)
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current)
    }
  }, [target, enabled])
  return val
}

// Geometry constants for the desktop SVG.
const W = 1160
const H = 440
const SRC_X = 100
const SRC_W = 22
const TGT_X = 880
const TGT_W = 22
const SRC_TOP = 50
const TGT_TOP = 18
const GAP = 12

function ribbonPath(sy: number, ty: number, w: number) {
  const sx = SRC_X + SRC_W
  const tx = TGT_X
  const mx = (sx + tx) / 2
  const sb = sy + w
  const tb = ty + w
  return `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${tx} ${ty} L ${tx} ${tb} C ${mx} ${tb}, ${mx} ${sb}, ${sx} ${sb} Z`
}

function Sankey({ t }: { t: number }) {
  const segs = [
    { ...EFFECTIVE, w: EFFECTIVE.value, opacity: 1 },
    ...LEAKS.map(l => ({ ...l, w: lerp(l.today, l.basanite, t), opacity: 1 })),
    { key: 'recovered', label: 'Recovered', sub: 'Basanite savings', color: RECOVERED_COLOR, w: RECOVERED_TOTAL * t, opacity: clamp01(t * 1.6) },
  ]

  let sy = SRC_TOP
  const src = segs.map(s => {
    const o = { y: sy, w: s.w }
    sy += s.w
    return o
  })
  let ty = TGT_TOP
  const tgt = segs.map(s => {
    const o = { y: ty, w: s.w }
    ty += s.w + GAP
    return o
  })

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label="Flow diagram: total hiring spend, with recruiter hours, engineer hours, vacancy days and mis-hire risk leaking away. With Basanite these leaks narrow and the difference is recovered."
    >
      {/* Left source label */}
      <text x={SRC_X} y={SRC_TOP - 16} fontSize={11} fill="#79705c" letterSpacing="1.5" style={{ textTransform: 'uppercase' }}>
        Total hiring spend
      </text>

      {/* Ribbons (drawn first, behind the bars) */}
      {segs.map((s, i) => (
        <path key={`r-${s.key}`} d={ribbonPath(src[i].y, tgt[i].y, s.w)} fill={s.color} opacity={0.5 * s.opacity} />
      ))}

      {/* Source bar — one solid block of total spend */}
      <rect x={SRC_X} y={SRC_TOP} width={SRC_W} height={TOTAL} rx={2} fill="#2d2b28" />

      {/* Target node bars + labels */}
      {segs.map((s, i) => {
        const cy = tgt[i].y + s.w / 2
        return (
          <g key={`t-${s.key}`} opacity={s.opacity}>
            <rect x={TGT_X} y={tgt[i].y} width={TGT_W} height={Math.max(0, s.w)} rx={2} fill={s.color} />
            <text x={TGT_X + TGT_W + 14} y={cy - 1} fontSize={15} className="font-display" fill={s.key === 'recovered' ? '#8a6c1a' : '#1a1a18'}>
              {s.label}
            </text>
            <text x={TGT_X + TGT_W + 14} y={cy + 14} fontSize={11} fill="#79705c">
              {s.sub}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function StackedBar({ title, gold, segs }: { title: string; gold?: boolean; segs: { key: string; color: string; w: number }[] }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-xs font-semibold ${gold ? 'text-gold-700' : 'text-basanite-500'}`}>{title}</span>
      </div>
      <div className="flex h-9 w-full overflow-hidden rounded bg-earth-100">
        {segs
          .filter(s => s.w > 0)
          .map(s => (
            <div key={s.key} style={{ width: `${(s.w / TOTAL) * 100}%`, backgroundColor: s.color }} />
          ))}
      </div>
    </div>
  )
}

export function SavingsFlow() {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [mode, setMode] = useState(0)

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Toggle between the two states while on screen. Reduced motion holds the
  // "With Basanite" state so the recovered flow is always visible.
  useEffect(() => {
    if (reduced) {
      setMode(1)
      return
    }
    if (!inView) return
    const id = setInterval(() => setMode(m => (m ? 0 : 1)), 3200)
    return () => clearInterval(id)
  }, [inView, reduced])

  const t = useTween(reduced ? 1 : mode, !reduced && inView)

  const todaySegs = [
    { key: EFFECTIVE.key, color: EFFECTIVE.color, w: EFFECTIVE.value },
    ...LEAKS.map(l => ({ key: l.key, color: l.color, w: l.today })),
  ]
  const basaniteSegs = [
    { key: EFFECTIVE.key, color: EFFECTIVE.color, w: EFFECTIVE.value },
    ...LEAKS.map(l => ({ key: l.key, color: l.color, w: l.basanite })),
    { key: 'recovered', color: RECOVERED_COLOR, w: RECOVERED_TOTAL },
  ]

  const legend = [
    { key: EFFECTIVE.key, label: EFFECTIVE.label, sub: EFFECTIVE.sub, color: EFFECTIVE.color },
    ...LEAKS.map(l => ({ key: l.key, label: l.label, sub: l.sub, color: l.color })),
    { key: 'recovered', label: 'Recovered', sub: 'Basanite savings', color: RECOVERED_COLOR },
  ]

  return (
    <div ref={ref}>
      {/* State caption — outside the frame (desktop only; mobile bars are
          labelled individually). Crossfades with the flow tween. */}
      <div className="hidden md:block relative h-7 mb-3 text-center">
        <span
          className="absolute inset-x-0 font-display text-lg text-basanite-500"
          style={{ opacity: clamp01(1 - t * 1.6) }}
        >
          Today
        </span>
        <span
          className="absolute inset-x-0 font-display text-lg text-gold-700"
          style={{ opacity: clamp01(t * 1.6) }}
        >
          With Basanite
        </span>
      </div>

      <div className="rounded-xl border border-earth-200 bg-earth-50 p-4 sm:p-6">
        {/* Desktop / tablet: full Sankey */}
        <div className="hidden md:block">
          <Sankey t={t} />
        </div>

        {/* Mobile: simplified stacked bars + legend */}
        <div className="md:hidden">
        <div className="space-y-4">
          <StackedBar title="Today" segs={todaySegs} />
          <StackedBar title="With Basanite" gold segs={basaniteSegs} />
        </div>
        <ul className="mt-5 grid grid-cols-1 gap-x-4 gap-y-2.5 text-left">
          {legend.map(item => (
            <li key={item.key} className="flex items-start gap-2.5">
              <span className="mt-1 h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />
              <span className="leading-tight">
                <span className={`text-sm font-semibold ${item.key === 'recovered' ? 'text-gold-700' : 'text-basanite-900'}`}>
                  {item.label}
                </span>
                <span className="block text-xs text-basanite-500">{item.sub}</span>
              </span>
            </li>
          ))}
        </ul>
        </div>
      </div>
    </div>
  )
}
