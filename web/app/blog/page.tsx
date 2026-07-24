// Blog index — server component, lists all published articles in reverse-chron.
//
// Source of truth for the article list is right here. When a new post ships,
// add an entry to ARTICLES below AND to BLOG_PAGES in `web/app/sitemap.ts` so
// the page gets crawled. Slugs in both must match.
//
// No client JS — every link is a regular <Link>, every transition is CSS.

import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { SiteNav } from '@/components/SiteNav'
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'Blog',
  description:
    'Field notes on AI cheating in technical interviews, interview design in the AI era, and how to screen engineers when traditional coding tests have stopped working.',
  path: '/blog',
})

type Article = {
  slug: string
  title: string
  date: string // ISO yyyy-mm-dd
  excerpt: string
  readingTime: string
}

const ARTICLES: Article[] = [
  {
    slug: 'ai-cheating-in-technical-interviews',
    title: 'AI Cheating in Technical Interviews: What’s Actually Happening in 2026',
    date: '2026-05-12',
    readingTime: '9 min read',
    excerpt:
      'A Capterra survey put the rate at 47%. The University of Manchester caught 150 students in a single November sweep. Here is what the data shows about how candidates are cheating with AI — and what most hiring teams still get wrong about it.',
  },
  {
    slug: 'how-to-stop-candidates-cheating-with-ai',
    title: 'How to Stop Candidates From Cheating With AI (Without Banning AI Entirely)',
    date: '2026-05-12',
    readingTime: '9 min read',
    excerpt:
      'You cannot stop a competent candidate from running an AI overlay during a take-home. The defensible move is to design assessments where AI use is either impossible or expected and instrumented. Here is the practical playbook.',
  },
  {
    slug: 'interview-coder-detection',
    title: 'Interview Coder & Cluely: The Tools Candidates Use to Cheat — and How to Spot Them',
    date: '2026-05-11',
    readingTime: '8 min read',
    excerpt:
      'Interview Coder ships an undetectable Electron overlay that reads the question off your screen and pipes a solution back. Cluely is the more polished cousin. Most legacy proctoring stacks cannot see them. Here is what they actually do, and what does still work.',
  },
  {
    slug: 'screening-contract-engineers-2026',
    title: 'Screening Contract Engineers in 2026: A Hiring Manager’s Playbook',
    date: '2026-05-10',
    readingTime: '10 min read',
    excerpt:
      'A paid trial week for a senior contractor costs you £4,000–8,000 before you know whether to keep them. AI has broken the take-home as a triage filter. Toptal charges a 30% markup to do the triage for you. There is a third path.',
  },
  {
    slug: 'ai-resistant-coding-interview-design',
    title: 'Designing an AI-Resistant Coding Interview (That Still Tests Real Skill)',
    date: '2026-05-09',
    readingTime: '9 min read',
    excerpt:
      'There are exactly two stable equilibria for a 2026 coding interview: questions that an AI cannot help with, or questions where AI use is required and instrumented. Everything in between is a slow-motion failure.',
  },
  {
    slug: 'cv-grounded-interviews',
    title: 'CV-Grounded Interviews: Why They Beat Standardised Question Banks',
    date: '2026-05-08',
    readingTime: '8 min read',
    excerpt:
      'Identical constructs, unique questions. A CV-grounded interview keeps the rubric structured — so the scoring is fair across candidates — while the surface questions stay unique enough that leaked answer keys do not work.',
  },
  {
    slug: 'hiring-engineers-who-can-use-ai',
    title: 'Hiring Engineers Who Can Actually Use AI: The New Core Skill',
    date: '2026-05-07',
    readingTime: '8 min read',
    excerpt:
      'Harvard and BCG ran 758 consultants through GPT-4. The ones who used it well outperformed the ones who used it badly by a wider margin than the average performance gap between consultants. No mainstream interview measures this skill.',
  },
  {
    slug: 'structured-interview-fairness-ai-era',
    title: 'Structured Interviews in the AI Era: Fairness, Bias, and What Actually Works',
    date: '2026-05-06',
    readingTime: '10 min read',
    excerpt:
      'Schmidt and Hunter’s 85-year meta-analysis is still the cleanest empirical answer to “what predicts job performance.” Structure wins. AI can add more structure than any human panel ever could. It can also amplify bias if you do not design for that explicitly. Both are true.',
  },
]

export default async function BlogIndexPage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  const ldCrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
  ])

  const ordered = [...ARTICLES].sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <div className="min-h-screen bg-earth-50 text-basanite-900">
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldCrumbs) }}
      />

      <SiteNav />

      <main className="max-w-4xl mx-auto px-6 pt-24 pb-32">
        <header className="mb-16">
          <p className="text-gold-700 text-[11px] font-semibold uppercase tracking-[0.25em] mb-4">
            Field notes
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[1.1] mb-6">
            Notes from the technical interview, post-2026.
          </h1>
          <p className="text-basanite-600 text-lg leading-relaxed max-w-2xl">
            Long-form arguments on AI cheating, interview design, and what it now takes to actually measure technical capability. Written for hiring managers, talent leaders, and engineers who are tired of the theatre.
          </p>
        </header>

        <ul className="space-y-12 border-t border-earth-200 pt-12">
          {ordered.map(article => (
            <li key={article.slug} className="border-b border-earth-200 pb-12 last:border-b-0">
              <article>
                <div className="flex items-center gap-3 text-xs text-basanite-500 uppercase tracking-[0.18em] mb-3">
                  <time dateTime={article.date}>
                    {new Date(article.date).toLocaleDateString('en-GB', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                  <span className="text-basanite-300">·</span>
                  <span>{article.readingTime}</span>
                </div>

                <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 leading-tight mb-3">
                  <Link href={`/blog/${article.slug}`} className="hover:text-gold-700 transition-colors">
                    {article.title}
                  </Link>
                </h2>

                <p className="text-basanite-600 text-base leading-relaxed mb-4 max-w-3xl">
                  {article.excerpt}
                </p>

                <Link
                  href={`/blog/${article.slug}`}
                  className="text-sm font-medium text-gold-700 hover:text-gold-600 transition-colors uppercase tracking-[0.18em]"
                >
                  Read article &rarr;
                </Link>
              </article>
            </li>
          ))}
        </ul>

        <section className="mt-24 border-t border-earth-200 pt-12 text-center">
          <h2 className="font-display text-2xl text-basanite-900 mb-3">
            Want to talk about your own pipeline?
          </h2>
          <p className="text-basanite-600 text-base mb-6 max-w-xl mx-auto">
            We do 20-minute intros where we listen first. No deck.
          </p>
          <a
            href="https://cal.eu/basanite/intro"
            target="_blank"
            rel="noreferrer"
            className="inline-block px-6 py-3 bg-basanite-900 text-white text-sm font-medium hover:bg-gold-600 transition-colors"
          >
            Book a call
          </a>
        </section>
      </main>

      <BlogIndexFooter />
    </div>
  )
}

function BlogIndexFooter() {
  return (
    <footer className="border-t border-earth-200 bg-white">
      <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-basanite-500">
        <p>&copy; {new Date().getFullYear()} Basanite.</p>
        <div className="flex items-center gap-5">
          <Link href="/" className="hover:text-basanite-900 transition-colors">Home</Link>
          <Link href="/faq" className="hover:text-basanite-900 transition-colors">FAQ</Link>
          <Link href="/login" className="hover:text-basanite-900 transition-colors">Sign in</Link>
        </div>
      </div>
    </footer>
  )
}
