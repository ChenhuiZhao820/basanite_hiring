import { formatDimensionKey } from '@/lib/format'

// Static, server-rendered spider chart over real dimension scores.
// Sister to SpiderChart.tsx (which is the decorative animated version
// used on the landing page). This one takes the candidate's actual
// scores and renders deterministic SVG — same chart shows in the web
// view and inside the WeasyPrint PDF.

interface ScoreInput {
  dimension_key: string
  score: number | null
}

interface Props {
  scores: ScoreInput[]
}

const VB = 480
const CENTER = VB / 2
const R = 168
const LABEL_R_FACTOR = 1.18
const GRID_RINGS = [0.2, 0.4, 0.6, 0.8, 1.0]
const TAU = Math.PI * 2

const angleOf = (i: number, n: number) => (i / n) * TAU - Math.PI / 2

const pointOnAxis = (i: number, n: number, s: number) => ({
  x: CENTER + Math.cos(angleOf(i, n)) * R * s,
  y: CENTER + Math.sin(angleOf(i, n)) * R * s,
})

function anchorFor(i: number, n: number): 'start' | 'middle' | 'end' {
  const c = Math.cos(angleOf(i, n))
  if (c > 0.35) return 'start'
  if (c < -0.35) return 'end'
  return 'middle'
}

function baselineFor(i: number, n: number): 'auto' | 'middle' | 'hanging' {
  const s = Math.sin(angleOf(i, n))
  if (s < -0.35) return 'auto'
  if (s > 0.35) return 'hanging'
  return 'middle'
}

export function ScoreSpider({ scores }: Props) {
  // Need at least 3 axes to render a polygon; fall back to a placeholder.
  const valid = scores.filter(s => typeof s.score === 'number' && s.score > 0)
  if (valid.length < 3) {
    return (
      <p className="text-sm text-basanite-400 dark:text-earth-500 italic text-center py-8">
        Not enough scored dimensions to render the profile.
      </p>
    )
  }

  const n = valid.length
  // Scores arrive on the 1-5 rubric; normalise to 0-1 against the full
  // axis so a perfect 5 reaches the outer ring.
  const normalised = valid.map(s => Math.max(0, Math.min(1, ((s.score as number) - 1) / 4)))
  const points = normalised
    .map((s, i) => {
      const p = pointOnAxis(i, n, Math.max(s, 0.02))
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`
    })
    .join(' ')

  return (
    <svg
      viewBox={`0 0 ${VB} ${VB}`}
      preserveAspectRatio="xMidYMid meet"
      overflow="visible"
      className="w-full max-w-[460px] mx-auto h-auto"
      role="img"
      aria-label="Candidate score profile across evaluated dimensions"
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

      {Array.from({ length: n }, (_, i) => {
        const p = pointOnAxis(i, n, 1)
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

      {normalised.map((s, i) => {
        const p = pointOnAxis(i, n, Math.max(s, 0.02))
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill="#c49a2f"
            aria-hidden="true"
          />
        )
      })}

      {valid.map((s, i) => {
        const p = pointOnAxis(i, n, LABEL_R_FACTOR)
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor={anchorFor(i, n)}
            dominantBaseline={baselineFor(i, n)}
            fontSize="13"
            fill="#3d3a36"
            style={{
              fontFamily: 'var(--font-body)',
              letterSpacing: '0.01em',
            }}
          >
            {formatDimensionKey(s.dimension_key)}
          </text>
        )
      })}
    </svg>
  )
}
