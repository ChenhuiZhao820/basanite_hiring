import type { Metadata } from 'next'
import { Inter, DM_Serif_Display } from 'next/font/google'
import { AuthErrorRedirect } from '@/components/AuthErrorRedirect'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const dmSerif = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Basanite — Test Genuine Technical Capability',
  description: 'AI-powered technical interviews that assess real capability, not performed competence. Depth over breadth. Signal over noise.',
  openGraph: {
    title: 'Basanite — Test Genuine Technical Capability',
    description: 'AI-powered technical interviews that assess real capability, not performed competence. Depth over breadth. Signal over noise.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSerif.variable}`}>
      <body>
        <AuthErrorRedirect />
        {children}
      </body>
    </html>
  )
}
