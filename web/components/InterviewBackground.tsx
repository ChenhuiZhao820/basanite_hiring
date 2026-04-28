'use client'

// Full-bleed dark wallpaper for the interview screen. Three layers:
//   1. linear gradient basanite-900 → 950
//   2. faint warm radial vignette behind the bubble (very soft, low alpha)
//   3. repeating X-cross pattern in earth tone, ~5% opacity
// No external assets, no images, no JS work after first paint.

// Staggered X pattern. Each X is identical and centred (no broken segments),
// but the tile contains two rows offset by half horizontally so the overall
// pattern reads as a brick scatter, not a grid.
const X_TILE = 576            // larger tile = more breathing room between X's
const X_HALF = 57             // tail length −5% (was 60)
const X_GAP_HALF = 9.45       // central gap +5% (was 9)
const X_STROKE = 'rgba(232, 226, 216, 0.09)'

function xLines(cx: number, cy: number): string {
  // ╲ diagonal
  const tl = `<line x1='${cx - X_HALF}' y1='${cy - X_HALF}' x2='${cx - X_GAP_HALF}' y2='${cy - X_GAP_HALF}'/>`
  const br = `<line x1='${cx + X_GAP_HALF}' y1='${cy + X_GAP_HALF}' x2='${cx + X_HALF}' y2='${cy + X_HALF}'/>`
  // ╱ diagonal
  const tr = `<line x1='${cx + X_HALF}' y1='${cy - X_HALF}' x2='${cx + X_GAP_HALF}' y2='${cy - X_GAP_HALF}'/>`
  const bl = `<line x1='${cx - X_GAP_HALF}' y1='${cy + X_GAP_HALF}' x2='${cx - X_HALF}' y2='${cy + X_HALF}'/>`
  return tl + br + tr + bl
}

// Brick stagger: top row at y = quarter, bottom row at y = three-quarters,
// shifted half-tile horizontally.
const Q = X_TILE / 4   // 108
const X_POSITIONS: [number, number][] = [
  [Q,        Q],         // top row, col 1
  [Q * 3,    Q],         // top row, col 2
  [Q * 2,    Q * 3],     // bottom row, col 1 (staggered by half-tile)
  [X_TILE,   Q * 3],     // bottom row, col 2 sits on the right edge…
  [0,        Q * 3],     // …and its wrap partner on the left edge, so the
                         // tails that would otherwise be clipped reappear in
                         // the next tile and the X reads complete on the seam.
]

const X_SVG =
  `<svg xmlns='http://www.w3.org/2000/svg' width='${X_TILE}' height='${X_TILE}'>` +
  `<g stroke='${X_STROKE}' stroke-width='1' stroke-linecap='round'>` +
  X_POSITIONS.map(([cx, cy]) => xLines(cx, cy)).join('') +
  `</g>` +
  `</svg>`
const X_URI = `url("data:image/svg+xml;utf8,${encodeURIComponent(X_SVG)}")`

export default function InterviewBackground() {
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #1a1a18 0%, #0f0f0e 100%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: X_URI,
          backgroundRepeat: 'repeat',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(196,154,47,0.06) 0%, transparent 70%)',
        }}
      />
    </div>
  )
}
