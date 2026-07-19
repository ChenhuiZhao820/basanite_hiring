// ─── Decorative: Stone texture background ────────────────────────────────
// Shared fractal-noise grain used on dark "stone" surfaces (the ROI band and
// the closing CTA). Rendered as an absolutely-positioned overlay, so the
// parent must be `relative`.
export function StoneTexture() {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#noise)" />
    </svg>
  )
}
