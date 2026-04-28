import type { Metadata } from 'next'
import { Fraunces, DM_Serif_Display } from 'next/font/google'
import { headers } from 'next/headers'
import { AuthErrorRedirect } from '@/components/AuthErrorRedirect'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const dmSerif = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Basanite, Test Genuine Technical Capability',
  description: 'AI powered technical interviews that assess real capability, not performed competence. Depth over breadth. Signal over noise.',
  openGraph: {
    title: 'Basanite, Test Genuine Technical Capability',
    description: 'AI powered technical interviews that assess real capability, not performed competence. Depth over breadth. Signal over noise.',
    type: 'website',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading the per-request nonce from middleware opts the tree into dynamic
  // rendering, which is required for Next.js to attach the matching nonce to
  // its framework inline scripts. Without this, hydration scripts ship without
  // a nonce and the strict CSP blocks them.
  await headers()
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSerif.variable}`}>
      <body>
        <AuthErrorRedirect />
        {children}
      </body>
    </html>
  )
}
