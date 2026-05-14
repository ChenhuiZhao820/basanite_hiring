import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

type Entry = {
  path: string
  lastModified?: string | Date
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

const PUBLIC_PAGES: Entry[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/faq', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/legal/subprocessors', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/pricing', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/blog', changeFrequency: 'weekly', priority: 0.7 },
]

const COMPARISON_PAGES: Entry[] = [
  { path: '/compare/hackerrank-vs-basanite', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/compare/hirevue-vs-basanite', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/compare/karat-vs-basanite', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/compare/codesignal-vs-basanite', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/alternatives/hackerrank', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/alternatives/hirevue', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/alternatives/karat', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/alternatives/mercor', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/alternatives/codesignal', changeFrequency: 'monthly', priority: 0.7 },
]

const BLOG_PAGES: Entry[] = [
  { path: '/blog/ai-cheating-in-technical-interviews', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/blog/how-to-stop-candidates-cheating-with-ai', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/blog/interview-coder-detection', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/blog/screening-contract-engineers-2026', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/blog/ai-resistant-coding-interview-design', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/blog/cv-grounded-interviews', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/blog/hiring-engineers-who-can-use-ai', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/blog/structured-interview-fairness-ai-era', changeFrequency: 'monthly', priority: 0.6 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [...PUBLIC_PAGES, ...COMPARISON_PAGES, ...BLOG_PAGES].map(e => ({
    url: `${SITE_URL}${e.path}`,
    lastModified: e.lastModified ?? now,
    changeFrequency: e.changeFrequency,
    priority: e.priority,
  }))
}
