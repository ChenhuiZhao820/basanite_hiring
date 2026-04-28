'use client'

type Props = {
  message: string
}

export default function ErrorToast({ message }: Props) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="fixed top-6 left-1/2 -translate-x-1/2 z-30 max-w-[90vw] sm:max-w-md bg-basanite-900/85 backdrop-blur-md border border-red-500/40 text-earth-100 text-sm px-4 py-3 shadow-lg shadow-black/40"
    >
      <div className="flex items-start gap-3">
        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
        <div className="flex-1">
          <p className="leading-relaxed">{message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-1 text-[11px] uppercase tracking-widest text-gold-400 hover:text-gold-300"
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  )
}
