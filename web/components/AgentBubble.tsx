'use client'

import { useEffect, useRef } from 'react'

type FftSnapshot = {
  freq: Uint8Array | undefined
  volume: number
  isSpeaking: boolean
}

type Phase = 'idle' | 'live' | 'ending' | 'done' | 'error'

type Props = {
  getFft: () => FftSnapshot
  phase: Phase
}

const N_POINTS = 36
const BASE_R = 110
const RADIUS_SMOOTH = 0.22
const VOLUME_SMOOTH = 0.15

// Pseudo-noise: layered sines at incommensurate frequencies. Cheap, organic
// enough for blob morphing, no dependency.
function pseudoNoise(angle: number, t: number): number {
  return (
    Math.sin(angle * 1.7 + t * 0.00080) * 0.40 +
    Math.sin(angle * 3.3 + t * 0.00110) * 0.30 +
    Math.sin(angle * 5.1 + t * 0.00140) * 0.30
  )
}

function avgRange(arr: Uint8Array, start: number, end: number): number {
  const lo = Math.max(0, start)
  const hi = Math.min(arr.length, end)
  if (hi <= lo) return 0
  let s = 0
  for (let i = lo; i < hi; i++) s += arr[i]
  return s / (hi - lo)
}

// Module-level initial path so the bubble paints as a circle on mount,
// before the first rAF tick. Avoids a one-frame blank.
function makeInitialPath(): string {
  const arr = new Float32Array(N_POINTS).fill(BASE_R)
  return buildPath(arr)
}

function buildPath(radii: Float32Array): string {
  const n = radii.length
  const px = new Float32Array(n)
  const py = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2
    px[i] = Math.cos(angle) * radii[i]
    py[i] = Math.sin(angle) * radii[i]
  }
  // Midpoints between consecutive control points; quadratic Béziers through
  // each control point landing at the next midpoint give a closed, smooth blob.
  const mx = new Float32Array(n)
  const my = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    mx[i] = (px[i] + px[j]) / 2
    my[i] = (py[i] + py[j]) / 2
  }
  let d = `M ${mx[n - 1].toFixed(2)} ${my[n - 1].toFixed(2)}`
  for (let i = 0; i < n; i++) {
    d += ` Q ${px[i].toFixed(2)} ${py[i].toFixed(2)} ${mx[i].toFixed(2)} ${my[i].toFixed(2)}`
  }
  d += ' Z'
  return d
}

const INITIAL_PATH_D = makeInitialPath()

export default function AgentBubble({ getFft, phase }: Props) {
  const groupRef = useRef<SVGGElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const radiiRef = useRef<Float32Array>(new Float32Array(N_POINTS).fill(BASE_R))
  const volRef = useRef(0)

  useEffect(() => {
    let alive = true
    const start = performance.now()
    let raf = 0

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    function frame() {
      if (!alive) return
      const t = performance.now() - start
      const snap = getFft()
      const freq = snap.freq
      const speaking = snap.isSpeaking && phase === 'live'

      // Frequency bands. Skip DC bin; speech energy mostly under bin ~64.
      let low = 0
      let mid = 0
      let high = 0
      if (freq && freq.length > 0) {
        low = avgRange(freq, 1, 8) / 255
        mid = avgRange(freq, 8, 32) / 255
        high = avgRange(freq, 32, 64) / 255
      }

      const breathe = speaking ? 0 : Math.sin(t * 0.0015) * 4
      const baseR = BASE_R + breathe + low * 18

      const deformAmp = reduceMotion ? 0 : speaking ? 30 : 6
      const next = new Float32Array(N_POINTS)
      for (let i = 0; i < N_POINTS; i++) {
        const angle = (i / N_POINTS) * Math.PI * 2
        const midRipple = Math.sin(angle * 6 + t * 0.0010) * mid
        const highRipple = Math.sin(angle * 12 + t * 0.0015) * high
        const noise = pseudoNoise(angle, t) * 0.15
        next[i] = baseR + (midRipple + highRipple * 0.6 + noise) * deformAmp
      }

      // Low-pass smoothing so the blob doesn't jitter on transient peaks.
      const smoothed = radiiRef.current
      for (let i = 0; i < N_POINTS; i++) {
        smoothed[i] = smoothed[i] * (1 - RADIUS_SMOOTH) + next[i] * RADIUS_SMOOTH
      }

      // Volume swell drives glow + scale.
      const targetVol = speaking ? snap.volume : 0
      volRef.current = volRef.current * (1 - VOLUME_SMOOTH) + targetVol * VOLUME_SMOOTH

      const g = groupRef.current
      const p = pathRef.current
      if (p) p.setAttribute('d', buildPath(smoothed))
      if (g) {
        const scale = 1 + volRef.current * 0.04
        g.setAttribute('transform', `scale(${scale.toFixed(4)})`)
        const glow = (8 + volRef.current * 28).toFixed(1)
        g.style.setProperty('--bubble-glow', `${glow}px`)
      }

      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
    }
  }, [getFft, phase])

  return (
    <div
      data-phase={phase}
      className="agent-bubble pointer-events-none fixed inset-0 flex items-center justify-center"
      aria-hidden
    >
      <svg
        viewBox="-150 -150 300 300"
        className="agent-bubble__svg"
        shapeRendering="geometricPrecision"
      >
        <defs>
          <radialGradient id="bubbleFill" cx="42%" cy="38%" r="68%">
            <stop offset="0%" stopColor="#6b665e" />
            <stop offset="42%" stopColor="#3d3a36" />
            <stop offset="82%" stopColor="#c49a2f" />
            <stop offset="100%" stopColor="#8a6c1a" />
          </radialGradient>
          <radialGradient id="bubbleFillError" cx="42%" cy="38%" r="68%">
            <stop offset="0%" stopColor="#524e48" />
            <stop offset="100%" stopColor="#1a1a18" />
          </radialGradient>
        </defs>
        <g ref={groupRef} className="agent-bubble__group">
          <path
            ref={pathRef}
            className="agent-bubble__path"
            d={INITIAL_PATH_D}
          />
        </g>
      </svg>
    </div>
  )
}
