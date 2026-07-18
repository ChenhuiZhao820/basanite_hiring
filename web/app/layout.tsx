import type { Metadata, Viewport } from 'next'
import { Fraunces, DM_Serif_Display } from 'next/font/google'
import { headers } from 'next/headers'
import Script from 'next/script'
import { AuthErrorRedirect } from '@/components/AuthErrorRedirect'
import {
  SITE_URL,
  SITE_NAME,
  SITE_DEFAULT_DESCRIPTION,
  organizationJsonLd,
  websiteJsonLd,
  softwareApplicationJsonLd,
} from '@/lib/seo'
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
  metadataBase: new URL(SITE_URL),
  title: {
    // Server pages set `title: 'X'` and the rendered title becomes "Basanite - X".
    // Client pages set `useDocumentTitle('X')` from `lib/useDocumentTitle.ts`.
    template: `${SITE_NAME} — %s`,
    default: `${SITE_NAME}, Know Your Candidates Better`,
  },
  description: SITE_DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: 'Aditya Shah' }, { name: 'Andrew Robertson' }, { name: 'Lynn Zhao' }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  keywords: [
    'AI technical interview',
    'AI hiring platform',
    'technical screening',
    'engineer hiring',
    'coding interview alternative',
    'HackerRank alternative',
    'HireVue alternative',
    'Karat alternative',
    'AI cheating detection',
    'contract engineer screening',
    'CV-grounded interview',
    'voice AI interviewer',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    title: `${SITE_NAME}, Know Your Candidates Better`,
    description: SITE_DEFAULT_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME}, Know Your Candidates Better`,
    description: SITE_DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? undefined,
  },
  category: 'technology',
}

export const viewport: Viewport = {
  themeColor: '#1a1a18',
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading the per-request nonce from middleware opts the tree into dynamic
  // rendering, which is required for Next.js to attach the matching nonce to
  // its framework inline scripts. Without this, hydration scripts ship without
  // a nonce and the strict CSP blocks them.
  const nonce = (await headers()).get('x-nonce') ?? undefined
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

  const ldGraph = {
    '@context': 'https://schema.org',
    '@graph': [organizationJsonLd(), websiteJsonLd(), softwareApplicationJsonLd()],
  }

  return (
    <html lang="en-GB" className={`${fraunces.variable} ${dmSerif.variable}`}>
      <head>
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ldGraph) }}
        />
      </head>
      <body>
        <AuthErrorRedirect />
        {children}
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
              nonce={nonce}
            />
            <Script id="ga4-init" strategy="afterInteractive" nonce={nonce}>
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}', { anonymize_ip: true });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  )
}
