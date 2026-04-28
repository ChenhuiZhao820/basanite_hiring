'use client'

// Full-bleed dark wallpaper for the interview screen. Three layers:
//   1. linear gradient basanite-900 → 950
//   2. soft warm radial halo behind the bubble
//   3. fine film grain via an inline SVG turbulence (overlayed)
// No external assets, no images, no JS work after first paint.

const GRAIN_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>" +
  "<filter id='n'>" +
  "<feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>" +
  "</filter>" +
  "<rect width='100%' height='100%' filter='url(#n)' opacity='0.55'/>" +
  '</svg>'
const GRAIN_URI = `url("data:image/svg+xml;utf8,${encodeURIComponent(GRAIN_SVG)}")`

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
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 45%, rgba(196,154,47,0.14) 0%, rgba(196,154,47,0.04) 40%, transparent 70%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: GRAIN_URI,
          backgroundRepeat: 'repeat',
          mixBlendMode: 'overlay',
          opacity: 0.06,
        }}
      />
    </div>
  )
}
