'use client'

type Props = {
  onClick: () => void
  visible: boolean
}

// Header-placed end button. The header handles its position; this component is
// just the visual + interaction. Ghost outline that turns warm-red on hover.
export default function EndButton({ onClick, visible }: Props) {
  if (!visible) return null
  return (
    <button
      onClick={onClick}
      className="text-[10px] sm:text-xs uppercase tracking-[0.18em] text-earth-200/60 hover:text-red-200 border border-earth-200/20 hover:border-red-500/60 px-3 py-1.5 transition-colors duration-150"
    >
      End
    </button>
  )
}
