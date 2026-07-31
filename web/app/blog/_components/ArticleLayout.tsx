// Shared layout for individual blog articles.
//
// Server-only. Renders the slim nav (same look as /faq), the article body
// with prose styles tuned to the Basanite design tokens, the Article and
// BreadcrumbList JSON-LD schemas, and a closing CTA + footer.
//
// Keep this file purely structural; per-article copy lives in each slug's
// page.tsx so the schema description and the visible intro stay close together.

import Link from 'next/link'
import type { ReactNode } from 'react'
import { headers } from 'next/headers'
import { SiteNav } from '@/components/SiteNav'
import { articleJsonLd, breadcrumbJsonLd } from '@/lib/seo'
import { REGISTER_INTEREST_URL } from '@/lib/links'

type Props = {
  title: string
  description: string
  datePublished: string
  dateModified?: string
  author?: string
  slug: string
  children: ReactNode
}

export default async function ArticleLayout({
  title,
  description,
  datePublished,
  dateModified,
  author,
  slug,
  children,
}: Props) {
  const nonce = (await headers()).get('x-nonce') ?? undefined

  const ldArticle = articleJsonLd({
    title,
    description,
    path: `/blog/${slug}`,
    datePublished,
    dateModified,
    author,
  })

  const ldCrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: title, path: `/blog/${slug}` },
  ])

  const displayDate = new Date(datePublished).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-earth-50 text-basanite-900">
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldArticle) }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldCrumbs) }}
      />

      <SiteNav />

      <main className="max-w-3xl mx-auto px-6 pt-24 pb-24">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-10 text-xs text-basanite-500 uppercase tracking-[0.18em]">
          <Link href="/" className="hover:text-basanite-900 transition-colors">Home</Link>
          <span className="px-2 text-basanite-400">/</span>
          <Link href="/blog" className="hover:text-basanite-900 transition-colors">Blog</Link>
        </nav>

        <header className="mb-12 border-b border-earth-200 pb-10">
          <p className="text-gold-700 text-[11px] font-semibold uppercase tracking-[0.25em] mb-4">
            Field notes
          </p>
          <h1 className="font-display text-4xl sm:text-5xl leading-[1.1] mb-6 text-basanite-900">
            {title}
          </h1>
          <p className="text-basanite-600 text-lg leading-relaxed mb-6">
            {description}
          </p>
          <div className="text-xs text-basanite-500 uppercase tracking-[0.18em] flex items-center gap-3">
            <time dateTime={datePublished}>{displayDate}</time>
            <span className="text-basanite-300">·</span>
            <span>{author ?? 'Basanite'}</span>
          </div>
        </header>

        <article
          className="
            text-basanite-700 text-base sm:text-[17px] leading-[1.75] max-w-none
            [&_h2]:font-display [&_h2]:text-basanite-900 [&_h2]:text-2xl sm:[&_h2]:text-3xl [&_h2]:mt-14 [&_h2]:mb-5 [&_h2]:leading-tight
            [&_h3]:font-display [&_h3]:text-basanite-900 [&_h3]:text-xl sm:[&_h3]:text-2xl [&_h3]:mt-10 [&_h3]:mb-4 [&_h3]:leading-snug
            [&_h4]:font-display [&_h4]:text-basanite-900 [&_h4]:text-lg [&_h4]:mt-8 [&_h4]:mb-3
            [&_p]:mb-6
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-6 [&_ul]:space-y-2 [&_ul]:marker:text-gold-600
            [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-6 [&_ol]:space-y-2 [&_ol]:marker:text-gold-600
            [&_li]:leading-relaxed
            [&_strong]:text-basanite-900 [&_strong]:font-semibold
            [&_em]:italic
            [&_a]:text-gold-700 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-gold-600
            [&_blockquote]:border-l-2 [&_blockquote]:border-gold-500 [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-basanite-600 [&_blockquote]:my-8
            [&_code]:font-mono [&_code]:text-sm [&_code]:bg-earth-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded
            [&_hr]:my-12 [&_hr]:border-earth-200
          "
        >
          {children}
        </article>

        <ClosingCta />
      </main>

      <BlogFooter />
    </div>
  )
}

function ClosingCta() {
  return (
    <section className="mt-20 border-t border-earth-200 pt-12">
      <p className="text-gold-700 text-[11px] font-semibold uppercase tracking-[0.25em] mb-4">
        What this means for you
      </p>
      <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-4 leading-tight">
        See it in your own pipeline.
      </h2>
      <p className="text-basanite-600 text-base leading-relaxed mb-6 max-w-2xl">
        Basanite runs a two-round assessment that gives every candidate a unique conversation built from their own CV — and a second round where they ship a real ticket alongside an AI agent. Twenty minutes with us is usually enough to know whether it fits your pipeline.
      </p>
      <div className="flex flex-wrap gap-3">
        <a
          href={REGISTER_INTEREST_URL}
          className="inline-block px-6 py-3 bg-basanite-900 text-white text-sm font-medium hover:bg-gold-600 transition-colors"
        >
          Register interest
        </a>
        <Link
          href="/faq"
          className="inline-block px-6 py-3 border border-basanite-900 text-basanite-900 text-sm font-medium hover:bg-basanite-900 hover:text-earth-50 transition-colors"
        >
          Read the FAQ
        </Link>
      </div>
    </section>
  )
}

function BlogFooter() {
  return (
    <footer className="border-t border-earth-200 bg-white">
      <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-basanite-500">
        <p>&copy; {new Date().getFullYear()} Basanite.</p>
        <div className="flex items-center gap-5">
          <Link href="/" className="hover:text-basanite-900 transition-colors">Home</Link>
          <Link href="/blog" className="hover:text-basanite-900 transition-colors">Blog</Link>
          <Link href="/faq" className="hover:text-basanite-900 transition-colors">FAQ</Link>
          <Link href="/login" className="hover:text-basanite-900 transition-colors">Sign in</Link>
        </div>
      </div>
    </footer>
  )
}
