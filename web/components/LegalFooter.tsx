import Link from 'next/link'

// Minimal footer that always carries the GDPR-required links: privacy
// notice, terms, sub-processors list, data-rights self-serve.
// Mounted at the bottom of every public + candidate-facing page.

type Props = {
  /** When true, renders against a dark surface (candidate flow's dark theme). */
  dark?: boolean
  className?: string
}

export function LegalFooter({ dark = false, className = '' }: Props) {
  const text = dark ? 'text-earth-200/60 hover:text-earth-100' : 'text-basanite-500 hover:text-basanite-900'
  const sep = dark ? 'text-earth-200/30' : 'text-basanite-300'
  return (
    <footer className={`text-xs flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-6 ${className}`}>
      <Link href="/privacy" className={text}>Privacy</Link>
      <span className={sep}>·</span>
      <Link href="/terms" className={text}>Terms</Link>
      <span className={sep}>·</span>
      <Link href="/legal/subprocessors" className={text}>Sub-processors</Link>
      <span className={sep}>·</span>
      <Link href="/data-rights" className={text}>Your data rights</Link>
      <span className={sep}>·</span>
      <span className={dark ? 'text-earth-200/40' : 'text-basanite-400'}>© Basanite</span>
    </footer>
  )
}
