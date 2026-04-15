export function LogoMark({ size = 28, dark = false }: { size?: number; dark?: boolean }) {
  const bg = dark ? '#1a1a18' : '#2d2b28'
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Dark angular stone */}
      <path d="M4 28 L12 4 L32 6 L30 32 Z" fill={bg} />
      {/* Gold streak — the touchstone test */}
      <path d="M10 24 L26 8" stroke="#c49a2f" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M12 26 L28 10" stroke="#d4a843" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  )
}
