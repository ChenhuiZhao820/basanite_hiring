'use client'

// Particle-cloud visualiser inspired by Roonil/NCS_Spectrum_GLava.
// ~1800 particles arranged in a feathered spherical shell, displaced each
// frame by a 3-octave fractal noise field, projected to 2D and drawn with
// additive ('screen') blending so dense clusters bloom naturally.
// Audio reactivity:
//   • bass (low band)  → scales the sphere radius
//   • mids (mid band)  → strength of fractal displacement
//   • volume           → overall brightness + slight zoom
// All values mirror the GLava parameters where reasonable
//   (sphereRadius, feather, displaceX/Y/Z, flowEvolution, glow size).

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

const NUM_PARTICLES = 20800             // 2× the previous 10400
const BASE_RADIUS_VMIN = 0.19            // smaller overall
const FEATHER = 0.10                     // thinner shell → more hollow centre
// Power < 1 biases the radial sampling toward the outer edge of the shell, so
// most particles sit on the silhouette rim and the inside is sparser.
const RADIAL_BIAS = 0.22
const PARTICLE_R_PX = 1.2                // slightly smaller dots since there are 4× more
const PARTICLE_ALPHA_BASE = 0.32         // accounts for higher density
const TRAIL_ALPHA = 0.42                 // faster trail fade so streaks don't dominate
const NOISE_SCALE = 1.7                  // spatial frequency of fractal field
const NOISE_FLOW = 0.00028               // flow rate; higher = more visible motion at rest
const NOISE_OCTAVES = 3                  // GLava `complexity`

// ─── Audio response: each particle has a single scalar "expansion" value
// that smoothly lerps toward a target proportional to audio volume. Each
// particle also has its own *expansion scale* assigned at init, drawn from a
// power-law distribution so most particles stay near the body and the tail
// of "frayers" reaches progressively further out — many close, fewer mid,
// fewest very far.
const LERP_RATE = 0.035                  // slower per-frame approach → cloud doesn't jump on every word

const FRAY_BASE = 0.06                   // body of cloud breathes ~6% on full volume
const FRAY_MAX  = 0.60                   // furthest frayers reach ~60% beyond the rim at peak vol
const FRAY_POWER = 3.5                   // higher = more particles cluster near base, longer thin tail

// ─── Transient detection on the high band ('T', 'S', 'CH', etc.). Only fires
// on sharp jumps above a threshold (so steady speech doesn't constantly
// trigger), and decays slowly so the spike leaves a residual hold. Effect is
// kept subtle so it adds character without making the cloud jumpy.
const SPIKE_THRESHOLD = 0.04             // ignore high-band changes below this
const SPIKE_GAIN = 2.0                   // multiplier on the (above-threshold) delta
const SPIKE_DECAY = 0.93                 // per-frame decay (~0.25s residual)
const SPIKE_TARGET_BOOST = 0.30          // how much spike adds to the audio-volume term
// Particle palette: each particle picks one entry at init. Wider warm-tone
// range — pale ivory through gold to amber, plus a few "off" cooler/warmer
// outliers — for visible chromatic depth.
const PARTICLE_PALETTE: Array<[number, number, number]> = [
  [232, 197, 85],   // gold-300       #e8c555
  [212, 168, 67],   // gold-400       #d4a843
  [196, 154, 47],   // gold-500       #c49a2f
  [240, 210, 105],  // pale gold      #f0d269
  [224, 144, 72],   // warm amber     #e09048
  [232, 178, 90],   // honey          #e8b25a
  // Slightly off-palette additions for chromatic variety:
  [248, 226, 158],  // ivory          #f8e29e
  [255, 220, 130],  // pale yellow    #ffdc82
  [205, 134, 60],   // deep amber     #cd863c
  [180, 116, 40],   // bronze         #b47428
  [220, 200, 110],  // sand           #dcc86e
  [232, 168, 105],  // peach gold     #e8a869
  [170, 130, 50],   // antique gold   #aa8232
  [248, 200, 96],   // butter         #f8c860
]
// Error tint (when phase is 'error') — desaturated basanite.
const ERROR_RGB: [number, number, number] = [80, 76, 70]

// ─── Cheap 3D layered-sine noise (no deps, ~30 ops per call) ─────────────
function noise3(x: number, y: number, z: number): number {
  return (
    Math.sin(x * 0.85 + y * 0.27 + z * 0.13) * 0.45 +
    Math.sin(x * 0.31 + y * 0.74 + z * 0.42) * 0.30 +
    Math.sin(x * 0.49 + y * 0.18 + z * 0.92) * 0.25
  )
}

function fbm3(x: number, y: number, z: number, octaves: number): number {
  let amp = 0.5
  let freq = 1
  let v = 0
  for (let i = 0; i < octaves; i++) {
    v += amp * noise3(x * freq, y * freq, z * freq)
    amp *= 0.55
    freq *= 2.05
  }
  return v
}

function avgRange(arr: Uint8Array, lo: number, hi: number): number {
  const start = Math.max(0, lo)
  const end = Math.min(arr.length, hi)
  if (end <= start) return 0
  let s = 0
  for (let i = start; i < end; i++) s += arr[i]
  return s / (end - start)
}

// ─── Particle initialisation: uniform in a feathered spherical shell ─────
function initParticles(
  buf: Float32Array,
  colorIdx: Uint8Array,
  scales: Float32Array,
) {
  const inner = 1 - FEATHER
  for (let i = 0; i < NUM_PARTICLES; i++) {
    // Random direction on unit sphere via rejection sampling.
    let x: number, y: number, z: number, len: number
    do {
      x = Math.random() * 2 - 1
      y = Math.random() * 2 - 1
      z = Math.random() * 2 - 1
      len = x * x + y * y + z * z
    } while (len > 1 || len < 1e-6)
    const norm = Math.sqrt(len)
    const r = inner + FEATHER * Math.pow(Math.random(), RADIAL_BIAS)
    const k = r / norm
    buf[i * 3] = x * k
    buf[i * 3 + 1] = y * k
    buf[i * 3 + 2] = z * k
    colorIdx[i] = Math.floor(Math.random() * PARTICLE_PALETTE.length)

    // Power-law expansion scale: most particles cluster at FRAY_BASE, with a
    // smooth fall-off toward FRAY_MAX so few reach the furthest band.
    const u = Math.random()
    scales[i] = FRAY_BASE + (FRAY_MAX - FRAY_BASE) * Math.pow(u, FRAY_POWER)
  }
}

export default function AgentBubble({ getFft, phase }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Float32Array | null>(null)
  const colorIdxRef = useRef<Uint8Array | null>(null)
  const scalesRef = useRef<Float32Array | null>(null)      // per-particle expansion-scale tier
  const expansionRef = useRef<Float32Array | null>(null)   // current per-particle radial expansion
  const volRef = useRef(0)
  const prevHighRef = useRef(0)                             // last frame's high-band level
  const spikeRef = useRef(0)                                // residual transient spike

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    if (
      !particlesRef.current ||
      !colorIdxRef.current ||
      !scalesRef.current ||
      !expansionRef.current
    ) {
      particlesRef.current = new Float32Array(NUM_PARTICLES * 3)
      colorIdxRef.current = new Uint8Array(NUM_PARTICLES)
      scalesRef.current = new Float32Array(NUM_PARTICLES)
      expansionRef.current = new Float32Array(NUM_PARTICLES)
      initParticles(particlesRef.current, colorIdxRef.current, scalesRef.current)
    }
    const particles = particlesRef.current
    const colorIdx = colorIdxRef.current
    const scales = scalesRef.current
    const expansion = expansionRef.current

    let alive = true
    let raf = 0
    let lastW = 0
    let lastH = 0
    let dpr = 1

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    function fitCanvas() {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const cw = window.innerWidth
      const ch = window.innerHeight
      if (cw === lastW && ch === lastH && canvas!.width === Math.floor(cw * dpr)) return
      lastW = cw
      lastH = ch
      canvas!.width = Math.floor(cw * dpr)
      canvas!.height = Math.floor(ch * dpr)
      canvas!.style.width = cw + 'px'
      canvas!.style.height = ch + 'px'
    }

    function frame() {
      if (!alive) return
      fitCanvas()
      const w = canvas!.width
      const h = canvas!.height
      const cx = w / 2
      const cy = h / 2

      const t = performance.now()
      const snap = getFft()
      const speaking = snap.isSpeaking && phase === 'live'

      // Smooth volume — slower so word-by-word fluctuations don't jump.
      const targetVol = speaking ? snap.volume : 0
      volRef.current = volRef.current * 0.92 + targetVol * 0.08
      const vol = volRef.current

      const freq = snap.freq
      const lowBand = freq ? avgRange(freq, 1, 8) / 255 : 0
      const midBand = freq ? avgRange(freq, 8, 32) / 255 : 0
      const highBand = freq ? avgRange(freq, 32, 64) / 255 : 0

      // Transient spike: rises only when the high band jumps sharply (above
      // threshold), and decays slowly. Adds a lingering nudge on hard
      // consonants without amplifying every word.
      const dHigh = Math.max(0, highBand - prevHighRef.current)
      prevHighRef.current = highBand
      const triggered = dHigh > SPIKE_THRESHOLD ? (dHigh - SPIKE_THRESHOLD) * SPIKE_GAIN : 0
      spikeRef.current = Math.max(spikeRef.current * SPIKE_DECAY, triggered)
      const spike = spikeRef.current

      // Sphere radius in px (vmin-based + audio bass scaling).
      const vmin = Math.min(w, h)
      const sphereR = vmin * BASE_RADIUS_VMIN * (1 + lowBand * 0.30 + vol * 0.08)

      // Idle lateral drift strength (small, subtle motion when no audio).
      // Audio doesn't pump this — audio drives the radial expansion below.
      const dispStrength = reduceMotion ? 0.005 : 0.015 + midBand * 0.010

      // Trail fade — clear with semi-transparent dark fill so previous frame's
      // particles linger briefly and create motion bloom.
      ctx!.globalCompositeOperation = 'source-over'
      ctx!.fillStyle = `rgba(15, 15, 14, ${TRAIL_ALPHA})`
      ctx!.fillRect(0, 0, w, h)

      // Additive blending for the cloud + the soft inner glow.
      ctx!.globalCompositeOperation = 'screen'

      // Two glow systems layered together:
      //   1) Tight rim halos in three offset warm tones (dialled down)
      //   2) A new wider glow that fades smoothly from rim deep into the
      //      middle, in a different warm tone, so the centre isn't a sudden
      //      black void.
      const glowOuter = sphereR * 1.10

      // ── 1) Rim halos (tighter, lower intensity) ─────────────────────────
      const rimLayers: Array<[number, number, string, number]> = [
        [-3, -2, '232, 197, 85', 0.05 + vol * 0.05], // gold-300, up-left
        [ 4,  1, '212, 168, 67', 0.04 + vol * 0.04], // gold-400, down-right
        [ 0,  4, '224, 144, 72', 0.03 + vol * 0.03], // warm amber, below
      ]
      for (const [dx, dy, rgb, alpha] of rimLayers) {
        const grad = ctx!.createRadialGradient(
          cx + dx, cy + dy, 0,
          cx + dx, cy + dy, glowOuter,
        )
        grad.addColorStop(0,    `rgba(${rgb}, 0)`)
        grad.addColorStop(0.62, `rgba(${rgb}, 0)`)
        grad.addColorStop(0.80, `rgba(${rgb}, ${(alpha * 0.4).toFixed(3)})`)
        grad.addColorStop(0.92, `rgba(${rgb}, ${alpha.toFixed(3)})`)
        grad.addColorStop(1,    `rgba(${rgb}, 0)`)
        ctx!.fillStyle = grad
        ctx!.beginPath()
        ctx!.arc(cx + dx, cy + dy, glowOuter, 0, Math.PI * 2)
        ctx!.fill()
      }

      // ── 2) Wide glow that fades long into the middle ────────────────────
      // Pushed outward — empty centre until ~50% radius, then ramps up to
      // peak just inside the rim.
      const innerGlowAlpha = 0.06 + vol * 0.06
      const innerGlowRgb = '232, 178, 90'  // honey, distinct from the rim layers
      const innerGlowOuter = sphereR * 1.05
      const innerGrad = ctx!.createRadialGradient(
        cx, cy, 0,
        cx, cy, innerGlowOuter,
      )
      innerGrad.addColorStop(0,    `rgba(${innerGlowRgb}, 0)`)
      innerGrad.addColorStop(0.50, `rgba(${innerGlowRgb}, 0)`)
      innerGrad.addColorStop(0.72, `rgba(${innerGlowRgb}, ${(innerGlowAlpha * 0.30).toFixed(3)})`)
      innerGrad.addColorStop(0.88, `rgba(${innerGlowRgb}, ${(innerGlowAlpha * 0.75).toFixed(3)})`)
      innerGrad.addColorStop(0.95, `rgba(${innerGlowRgb}, ${innerGlowAlpha.toFixed(3)})`)
      innerGrad.addColorStop(1,    `rgba(${innerGlowRgb}, 0)`)
      ctx!.fillStyle = innerGrad
      ctx!.beginPath()
      ctx!.arc(cx, cy, innerGlowOuter, 0, Math.PI * 2)
      ctx!.fill()

      const baseAlpha =
        phase === 'idle'
          ? PARTICLE_ALPHA_BASE * 0.6
          : phase === 'error'
            ? PARTICLE_ALPHA_BASE * 0.4
            : PARTICLE_ALPHA_BASE + vol * 0.04

      const flowT = t * NOISE_FLOW

      const particleScreenR = PARTICLE_R_PX * dpr
      const innerShell = 1 - FEATHER
      for (let i = 0; i < NUM_PARTICLES; i++) {
        const ix = i * 3
        const rx = particles[ix]
        const ry = particles[ix + 1]
        const rz = particles[ix + 2]
        // Where this particle sits within the shell. 0 = inner edge, 1 = rim.
        const homeR = Math.sqrt(rx * rx + ry * ry + rz * rz)
        const rimFactor = Math.min(1, Math.max(0, (homeR - innerShell) / FEATHER))

        // Smoothly track the audio-driven radial expansion. Each particle has
        // its own assigned scale (tier), so when audio pumps, particles
        // graduate outward at their own depth. The spike term adds a small
        // lingering kick on sharp high-band onsets.
        const target = (vol + spike * SPIKE_TARGET_BOOST) * scales[i]
        const cur = expansion[i]
        const next = cur + (target - cur) * LERP_RATE
        expansion[i] = next
        const radialFactor = 1 + next

        // Idle lateral drift from noise — small, makes the cloud "alive" when
        // silent. Sampled at the rest position so the field is stationary.
        const nfx =
          fbm3(rx * NOISE_SCALE + flowT, ry * NOISE_SCALE, rz * NOISE_SCALE, NOISE_OCTAVES) *
          dispStrength
        const nfy =
          fbm3(rx * NOISE_SCALE, ry * NOISE_SCALE + flowT * 1.13, rz * NOISE_SCALE, NOISE_OCTAVES) *
          dispStrength
        const nfz =
          fbm3(rx * NOISE_SCALE, ry * NOISE_SCALE, rz * NOISE_SCALE + flowT * 0.87, NOISE_OCTAVES) *
          dispStrength

        const fx = rx * radialFactor + nfx
        const fy = ry * radialFactor + nfy
        const fz = rz * radialFactor + nfz

        // Mild perspective: closer particles slightly bigger + brighter.
        const persp = 1.5 / (1.5 + fz * 0.55)
        const sx = cx + fx * sphereR * persp
        const sy = cy + fy * sphereR * persp
        const sr = particleScreenR * persp

        // Z-depth shading (front of sphere brighter than back).
        const zBright = 0.45 + ((fz + 1) * 0.5) * 0.55
        // Edge band: particles on the silhouette of the sphere fully bright;
        // particles near the camera axis fade out hard. Power 5 so the
        // hollow centre is unmistakable.
        const edgeRaw = Math.sqrt(Math.max(0, 1 - fz * fz))
        const er2 = edgeRaw * edgeRaw
        const edgeFactor = er2 * er2 * edgeRaw  // edgeRaw^5
        // Rim boost: particles sitting on the outermost shell are brighter
        // than those nearer the inside.
        const rimBoost = 0.55 + 0.45 * rimFactor
        const a = baseAlpha * zBright * edgeFactor * rimBoost

        const palEntry =
          phase === 'error' ? ERROR_RGB : PARTICLE_PALETTE[colorIdx[i]]
        ctx!.fillStyle = `rgba(${palEntry[0]}, ${palEntry[1]}, ${palEntry[2]}, ${a.toFixed(3)})`
        ctx!.beginPath()
        ctx!.arc(sx, sy, sr, 0, Math.PI * 2)
        ctx!.fill()
      }

      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)

    function onResize() { fitCanvas() }
    window.addEventListener('resize', onResize)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [getFft, phase])

  return (
    <div
      data-phase={phase}
      className="agent-bubble pointer-events-none fixed inset-0"
      aria-hidden
    >
      <canvas
        ref={canvasRef}
        className="agent-bubble__canvas absolute inset-0 w-full h-full"
      />
    </div>
  )
}
