'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

// Animated spider chart for the homepage "dimensions" section.
//
// Eight axes, one per evaluation dimension. The polygon cycles through eight
// profiles — one per dimension, each spiking on that axis — so the shape reads
// as "capability is a shape, and different engineers peak in different
// places". Whichever dimension is currently strongest has its label and
// question tinted red.
//
// The scores are illustrative, not real candidate data. They are generated
// deterministically so SSR and the first client render agree.

const N = 8
const TAU = Math.PI * 2

// Square viewBox — the chart only. Labels are HTML positioned around it, so
// the questions wrap naturally and stay legible at any width.
const VB = 300
const C = VB / 2
const R = 116
const RINGS = [0.25, 0.5, 0.75, 1]

const ACTIVE = '#b03f28' // rust red, ~5.6:1 on the earth-50 section background
const GOLD = '#c49a2f'
const GRID = '#b3a99e'

const TICK_MS = 2600
const TWEEN_MS = 850

type Dimension = { name: string; question: string }

export const DIMENSIONS: Dimension[] = [
  { name: 'Problem framing', question: 'Can they turn a vague brief into a workable spec?' },
  { name: 'Context handling', question: 'Do they give the model what it needs, or hope for the best?' },
  { name: 'Verification', question: 'Do they check the model’s output, or ship it?' },
  { name: 'Iteration', question: 'When the first answer is wrong, what do they do next?' },
  { name: 'Tool fluency', question: 'Do they know which tool fits which subtask?' },
  { name: 'Judgment under uncertainty', question: 'When the model is confidently wrong, do they catch it?' },
  { name: 'Coachability', question: 'Can they take feedback mid-task and adjust?' },
  { name: 'Communication', question: 'Can they explain what they did and why?' },
]

const angleOf = (i: number) => (i / N) * TAU - Math.PI / 2

const pointOnAxis = (i: number, s: number) => ({
  x: C + Math.cos(angleOf(i)) * R * s,
  y: C + Math.sin(angleOf(i)) * R * s,
})

const polygonPoints = (scores: number[]) =>
  scores.map((s, i) => { const p = pointOnAxis(i, s); return `${p.x.toFixed(2)},${p.y.toFixed(2)}` }).join(' ')

// Profile k spikes on axis k. The rest are spread deterministically but with
// more variance so each shape looks recognisably irregular, while the peak
// stays unambiguous.
export const profileFor = (k: number): number[] =>
  Array.from({ length: N }, (_, i) => {
    if (i === k) return 0.97
    const h1 = ((i * 37 + k * 61) % 23) / 23
    const h2 = ((i * 73 + k * 19) % 17) / 17
    return 0.18 + h1 * 0.35 + h2 * 0.15
  })

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

// Tween the score array toward `target`, re-basing from wherever the current
// animation happens to be when a new target arrives mid-flight.
function useTweenedArray(target: number[], enabled: boolean) {
  const [current, setCurrent] = useState<number[]>(target)
  const fromRef = useRef(target)
  const toRef = useRef(target)
  const currentRef = useRef(target)
  const startRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => { currentRef.current = current })

  useEffect(() => {
    if (!enabled) {
      setCurrent(target)
      currentRef.current = target
      return
    }
    fromRef.current = currentRef.current
    toRef.current = target
    startRef.current = performance.now()

    const tick = (now: number) => {
      const t = Math.min(1, (now - startRef.current) / TWEEN_MS)
      const next = fromRef.current.map((f, i) => f + (toRef.current[i] - f) * easeInOutCubic(t))
      setCurrent(next)
      currentRef.current = next
      rafRef.current = t < 1 ? requestAnimationFrame(tick) : null
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current) }
  }, [target, enabled])

  return current
}

// Places an HTML label block around the chart. Percentages are relative to the
// 2:1 container, so the x and y radii differ; the transform then anchors the
// block outward from the vertex it belongs to. Widths are percentages too, so
// the labels scale with the container instead of colliding at smaller widths.
const LABEL_RX = 17 // % of container width
const LABEL_RY = 33 // % of container height

function labelStyle(i: number): React.CSSProperties {
  const a = angleOf(i)
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  const side = cos > 0.35 ? 'right' : cos < -0.35 ? 'left' : 'center'

  const tx = side === 'right' ? '0' : side === 'left' ? '-100%' : '-50%'
  const ty = side === 'center' ? (sin < 0 ? '-100%' : '0') : '-50%'

  return {
    left: `${50 + LABEL_RX * cos}%`,
    top: `${50 + LABEL_RY * sin}%`,
    transform: `translate(${tx}, ${ty})`,
    textAlign: side === 'right' ? 'left' : side === 'left' ? 'right' : 'center',
    width: side === 'center' ? '21%' : '17.5%',
  }
}

function Chart({ scores, active, className }: { scores: number[]; active: number; className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${VB} ${VB}`}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {RINGS.map(ring => (
        <polygon
          key={ring}
          points={polygonPoints(Array(N).fill(ring))}
          fill="none"
          stroke={GRID}
          strokeOpacity={ring === 1 ? 0.5 : 0.2}
          strokeWidth={ring === 1 ? 1.25 : 1}
          strokeLinejoin="round"
        />
      ))}

      {Array.from({ length: N }, (_, i) => {
        const p = pointOnAxis(i, 1)
        const isActive = i === active
        return (
          <line
            key={i}
            x1={C}
            y1={C}
            x2={p.x}
            y2={p.y}
            stroke={isActive ? ACTIVE : GRID}
            strokeOpacity={isActive ? 0.5 : 0.28}
            strokeWidth={1}
            style={{ transition: 'stroke 500ms ease, stroke-opacity 500ms ease' }}
          />
        )
      })}

      <polygon
        points={polygonPoints(scores)}
        fill={GOLD}
        fillOpacity={0.22}
        stroke={GOLD}
        strokeOpacity={0.9}
        strokeWidth={1.5}
        strokeLinejoin="round"
        className="data-polygon"
      />

      {scores.map((s, i) => {
        const p = pointOnAxis(i, s)
        const isActive = i === active
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={isActive ? 5 : 3}
            fill={isActive ? ACTIVE : GOLD}
            style={{ transition: 'fill 500ms ease, r 500ms ease' }}
          />
        )
      })}
    </svg>
  )
}

export function DimensionsRadar() {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [inView, setInView] = useState(false)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReduced(true)
      return
    }
    const el = ref.current
    // Without IntersectionObserver there is no way to know when the chart is
    // on screen, so animate unconditionally rather than sit frozen.
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    // Stays attached: the cycle pauses when the chart leaves the viewport and
    // resumes where it left off.
    const obs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (reduced || !inView) return
    const id = setInterval(() => setActive(a => (a + 1) % N), TICK_MS)
    return () => clearInterval(id)
  }, [reduced, inView])

  // Memoised so the array identity only changes when `active` does. Without
  // this the tween effect below re-runs on every render, resetting its start
  // timestamp each frame and freezing the polygon in place.
  const target = useMemo(() => profileFor(active), [active])
  const scores = useTweenedArray(target, !reduced)

  return (
    <div ref={ref}>
      {/* Wide screens: chart with a label at each vertex. */}
      <div className="relative hidden lg:block w-full aspect-[2/1]">
        <Chart
          scores={scores}
          active={active}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[38%] h-auto overflow-visible"
        />
        {DIMENSIONS.map((d, i) => {
          const isActive = i === active
          return (
            <div key={d.name} className="absolute leading-tight" style={labelStyle(i)}>
              <div
                className="font-display text-lg"
                style={{ color: isActive ? ACTIVE : '#2d2b28', transition: 'color 500ms ease' }}
              >
                {d.name}
              </div>
              <div
                className="text-[13px] mt-1.5 leading-snug"
                style={{ color: isActive ? ACTIVE : '#6b665e', transition: 'color 500ms ease' }}
              >
                {d.question}
              </div>
            </div>
          )
        })}
      </div>

      {/* Narrow screens: labels around a circle don't fit, so the chart sits
          above a plain list and the active row carries the same highlight. */}
      <div className="lg:hidden">
        <Chart scores={scores} active={active} className="w-full max-w-[320px] mx-auto h-auto overflow-visible" />
        <ul className="mt-8 space-y-3 text-left">
          {DIMENSIONS.map((d, i) => {
            const isActive = i === active
            return (
              <li
                key={d.name}
                className="border-l-2 pl-3"
                style={{
                  borderColor: isActive ? ACTIVE : '#e8e2d8',
                  transition: 'border-color 500ms ease',
                }}
              >
                <div
                  className="font-display text-base"
                  style={{ color: isActive ? ACTIVE : '#2d2b28', transition: 'color 500ms ease' }}
                >
                  {d.name}
                </div>
                <div
                  className="text-xs mt-0.5 leading-snug"
                  style={{ color: isActive ? ACTIVE : '#6b665e', transition: 'color 500ms ease' }}
                >
                  {d.question}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
