import type { Metadata } from 'next'
import { Fraunces, DM_Serif_Display } from 'next/font/google'
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSerif.variable}`}>
      <body>
        <AuthErrorRedirect />
        {children}
      </body>
    </html>
  )
}
