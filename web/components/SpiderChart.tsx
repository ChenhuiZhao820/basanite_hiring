'use client'

import { useEffect, useRef, useState } from 'react'

// Pure-SVG animated radar/spider chart. Eight axes, one per evaluation
// dimension. The polygon morphs through randomised score profiles every
// ~2.5s with a smooth 900ms tween. Decorative — the random values do not
// represent any real candidate; they illustrate "capability is a shape".

const N = 8
const TAU = Math.PI * 2

const VB = 480
const CENTER = VB / 2
const R = 168
const LABEL_R_FACTOR = 1.18
const GRID_RINGS = [0.25, 0.5, 0.75, 1.0]

const LABELS = [
  'Judgment',
  'Tacit',
  'Intuition',
  'Safety',
  'Reframing',
  'Ethics',
  'Learning',
  'Human–AI',
]

const angleOf = (i: number) => (i / N) * TAU - Math.PI / 2

const pointOnAxis = (i: number, s: number) => ({
  x: CENTER + Math.cos(angleOf(i)) * R * s,
  y: CENTER + Math.sin(angleOf(i)) * R * s,
})

const polygonPoints = (scores: number[]) =>
  scores
    .map((s, i) => {
      const p = pointOnAxis(i, s)
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`
    })
    .join(' ')

function anchorFor(i: number): 'start' | 'middle' | 'end' {
  const c = Math.cos(angleOf(i))
  if (c > 0.35) return 'start'
  if (c < -0.35) return 'end'
  return 'middle'
}

function baselineFor(i: number): 'auto' | 'middle' | 'hanging' {
  const s = Math.sin(angleOf(i))
  if (s < -0.35) return 'auto'
  if (s > 0.35) return 'hanging'
  return 'middle'
}

const MIN_SCORE = 0.45
const MAX_SCORE = 0.95
const MAX_DELTA = 0.18

// Deterministic seed for SSR — matches what the reduced-motion branch shows.
const REPRESENTATIVE = [0.78, 0.72, 0.68, 0.82, 0.74, 0.7, 0.76, 0.8]

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v))

const seedScores = (): number[] =>
  Array.from(
    { length: N },
    () => MIN_SCORE + Math.random() * (MAX_SCORE - MIN_SCORE)
  )

const stepScores = (prev: number[]): number[] =>
  prev.map(v =>
    clamp(v + (Math.random() * 2 - 1) * MAX_DELTA, MIN_SCORE, MAX_SCORE)
  )

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduce(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduce(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduce
}

// Tween the whole array from its current visible value toward `target` over
// `durationMs`. The hook captures `current` once at tween start (via ref) so
// new targets arriving mid-tween smoothly re-base from wherever we are now.
function useTweenedArray(
  target: number[],
  durationMs: number,
  enabled: boolean
) {
  const [current, setCurrent] = useState<number[]>(target)
  const fromRef = useRef<number[]>(target)
  const toRef = useRef<number[]>(target)
  const currentRef = useRef<number[]>(target)
  const startRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    currentRef.current = current
  })

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
      const t = Math.min(1, (now - startRef.current) / durationMs)
      const eased = easeInOutCubic(t)
      const next = fromRef.current.map(
        (f, i) => f + (toRef.current[i] - f) * eased
      )
      setCurrent(next)
      currentRef.current = next
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        rafRef.current = null
      }
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [target, durationMs, enabled])

  return current
}

const TICK_MS = 2500
const TWEEN_MS = 900

export function SpiderChart() {
  const reduceMotion = usePrefersReducedMotion()
  const [target, setTarget] = useState<number[]>(REPRESENTATIVE)

  // After mount: seed a random target and start the ticker. Done in effect to
  // keep the SSR-rendered polygon deterministic and avoid hydration mismatch.
  useEffect(() => {
    if (reduceMotion) {
      setTarget(REPRESENTATIVE)
      return
    }
    setTarget(seedScores())
    const id = setInterval(() => {
      setTarget(prev => stepScores(prev))
    }, TICK_MS)
    return () => clearInterval(id)
  }, [reduceMotion])

  const scores = useTweenedArray(target, TWEEN_MS, !reduceMotion)
  const points = polygonPoints(scores)

  return (
    <svg
      viewBox={`0 0 ${VB} ${VB}`}
      preserveAspectRatio="xMidYMid meet"
      overflow="visible"
      className="w-full max-w-[460px] mx-auto h-auto"
      role="img"
      aria-label="Illustrative profile across the eight capability dimensions Basanite evaluates"
    >
      {GRID_RINGS.map(ring => (
        <circle
          key={ring}
          cx={CENTER}
          cy={CENTER}
          r={R * ring}
          fill="none"
          stroke="#b3a99e"
          strokeOpacity={ring === 1 ? 0.55 : 0.22}
          strokeWidth={ring === 1 ? 1.25 : 1}
          aria-hidden="true"
        />
      ))}

      {Array.from({ length: N }, (_, i) => {
        const p = pointOnAxis(i, 1)
        return (
          <line
            key={i}
            x1={CENTER}
            y1={CENTER}
            x2={p.x}
            y2={p.y}
            stroke="#b3a99e"
            strokeOpacity={0.3}
            strokeWidth={1}
            aria-hidden="true"
          />
        )
      })}

      <polygon
        points={points}
        fill="#c49a2f"
        fillOpacity={0.22}
        stroke="#c49a2f"
        strokeOpacity={0.9}
        strokeWidth={1.5}
        strokeLinejoin="round"
        aria-hidden="true"
      />

      {scores.map((s, i) => {
        const p = pointOnAxis(i, s)
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3.5}
            fill="#c49a2f"
            aria-hidden="true"
          />
        )
      })}

      {LABELS.map((label, i) => {
        const p = pointOnAxis(i, LABEL_R_FACTOR)
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor={anchorFor(i)}
            dominantBaseline={baselineFor(i)}
            fontSize="15"
            fill="#3d3a36"
            style={{
              fontFamily: 'var(--font-body)',
              letterSpacing: '0.01em',
            }}
          >
            {label}
          </text>
        )
      })}
    </svg>
  )
}
