import type { Metadata } from 'next'

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basanite.co.uk').replace(/\/$/, '')
export const SITE_NAME = 'Basanite'
export const SITE_TAGLINE = 'Know Your Candidates Better'
export const SITE_DEFAULT_DESCRIPTION =
  'Basanite is an AI-native technical interview platform built to improve hiring accuracy. Every candidate gets a bespoke interview built from their own CV, and hirers get evidence-backed briefings on strengths, limitations, and technical depth — your hiring decision, with better evidence, in fewer rounds.'

export function absoluteUrl(path: string): string {
  if (!path.startsWith('/')) return `${SITE_URL}/${path}`
  return `${SITE_URL}${path}`
}

type BuildMetadataInput = {
  title: string
  description?: string
  path: string
  image?: string
  noindex?: boolean
  keywords?: string[]
}

export function buildMetadata({
  title,
  description,
  path,
  image,
  noindex,
  keywords,
}: BuildMetadataInput): Metadata {
  const url = absoluteUrl(path)
  const desc = description ?? SITE_DEFAULT_DESCRIPTION
  const ogImage = image ?? `${SITE_URL}/opengraph-image`

  return {
    title,
    description: desc,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      title: typeof title === 'string' ? title : SITE_NAME,
      description: desc,
      url,
      siteName: SITE_NAME,
      type: 'website',
      locale: 'en_GB',
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${SITE_NAME} — ${SITE_TAGLINE}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: typeof title === 'string' ? title : SITE_NAME,
      description: desc,
      images: [ogImage],
    },
    robots: noindex
      ? { index: false, follow: false }
      : {
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
  }
}

export function organizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    legalName: 'Basanite',
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/icon.jpeg`,
      width: 512,
      height: 512,
    },
    description: SITE_DEFAULT_DESCRIPTION,
    foundingDate: '2026',
    founders: [
      { '@type': 'Person', name: 'Aditya Shah', jobTitle: 'CEO', sameAs: 'https://www.linkedin.com/in/adityashah100/' },
      { '@type': 'Person', name: 'Lynn Zhao', jobTitle: 'CPO', sameAs: 'https://www.linkedin.com/in/lynn-zhao-59a198292/' },
    ],
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Manchester',
      addressCountry: 'GB',
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        email: 'aditya.shah@basanite.co.uk',
        url: `${SITE_URL}/contact`,
        areaServed: ['GB', 'EU', 'US'],
        availableLanguage: ['en'],
      },
      {
        '@type': 'ContactPoint',
        contactType: 'privacy',
        email: 'privacy@basanite.co.uk',
        url: `${SITE_URL}/privacy`,
      },
    ],
    sameAs: [
      'https://www.linkedin.com/company/basanite',
      'https://x.com/basanite_ai',
    ],
  }
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description: SITE_DEFAULT_DESCRIPTION,
    publisher: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'en-GB',
  }
}

export function softwareApplicationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${SITE_URL}/#software`,
    name: SITE_NAME,
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'HR Software',
    operatingSystem: 'Any (web-based)',
    description: SITE_DEFAULT_DESCRIPTION,
    url: SITE_URL,
    publisher: { '@id': `${SITE_URL}/#organization` },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'GBP',
      availability: 'https://schema.org/InStock',
      description: 'Free pilot for qualifying teams. Paid plans from £200/month.',
    },
    featureList: [
      'AI voice interviewer built from candidate CV',
      'Two-round assessment: conversational + AI Collaboration Workbench',
      'Quote-grounded scoring across 8 metacognitive dimensions',
      'ATS integration via Merge.dev (Greenhouse, Lever, Ashby + 50 more)',
      'GDPR-ready with right to human review',
    ],
    aggregateRating: undefined,
  }
}

type FaqEntry = { question: string; answer: string }

export function faqPageJsonLd(entries: FaqEntry[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map(e => ({
      '@type': 'Question',
      name: e.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: e.answer,
      },
    })),
  }
}

type BreadcrumbItem = { name: string; path: string }

export function breadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

type ArticleInput = {
  title: string
  description: string
  path: string
  datePublished: string
  dateModified?: string
  author?: string
  image?: string
}

export function articleJsonLd({
  title,
  description,
  path,
  datePublished,
  dateModified,
  author,
  image,
}: ArticleInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    datePublished,
    dateModified: dateModified ?? datePublished,
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(path) },
    image: image ?? `${SITE_URL}/opengraph-image`,
    author: {
      '@type': 'Person',
      name: author ?? 'Basanite',
      url: SITE_URL,
    },
    publisher: { '@id': `${SITE_URL}/#organization` },
  }
}
