'use client'

type Props = {
  onClick: () => void
  visible: boolean
}

export default function EndButton({ onClick, visible }: Props) {
  if (!visible) return null
  return (
    <button
      onClick={onClick}
      className="fixed left-1/2 -translate-x-1/2 z-20 text-[11px] sm:text-xs uppercase tracking-[0.2em] text-earth-200/40 hover:text-earth-100 border border-earth-200/15 hover:border-gold-500/60 px-5 py-3 sm:py-2 transition-colors duration-200 backdrop-blur-sm bg-basanite-950/30"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)',
      }}
    >
      End interview
    </button>
  )
}
