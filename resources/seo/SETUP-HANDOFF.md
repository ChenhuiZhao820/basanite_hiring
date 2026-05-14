# SEO Setup Handoff — what's done, what you need to finish

## Done (in code, ready to deploy)

### Technical SEO foundation
- `web/lib/seo.ts` — shared helpers (`buildMetadata`, JSON-LD builders, site URL constant)
- `web/app/sitemap.ts` — dynamic sitemap (24 routes, lastmod=build time)
- `web/app/robots.ts` — robots.txt with sitemap pointer, GPTBot/ClaudeBot/PerplexityBot allowed, dashboard/auth disallowed
- `web/app/opengraph-image.tsx` — auto-generated 1200×630 OG image with brand
- `web/app/layout.tsx` — Organization + WebSite + SoftwareApplication JSON-LD wired in `<head>`, GA4 hooks gated on env var, Google verification hooked on env var
- `web/middleware.ts` — CSP updated to allow `googletagmanager.com` and `google-analytics.com`
- `web/next.config.js` — AVIF/WebP image formats, long-cache headers for `_next/static`, no `X-Powered-By`

### New trust pages
- `/about` — mission, values, timeline, team, CTA
- `/contact` — multiple channels, founders' LinkedIn, ContactPage JSON-LD
- `/pricing` — three plans, value comparison, pricing FAQ with FAQPage JSON-LD

### Comparison + alternative pages (9 total)
- `/compare/{hackerrank,hirevue,karat,codesignal}-vs-basanite`
- `/alternatives/{hackerrank,hirevue,karat,mercor,codesignal}`

### Blog (1 index + 8 articles)
- `/blog` index page
- `/blog/ai-cheating-in-technical-interviews`
- `/blog/how-to-stop-candidates-cheating-with-ai`
- `/blog/interview-coder-detection`
- `/blog/screening-contract-engineers-2026`
- `/blog/ai-resistant-coding-interview-design`
- `/blog/cv-grounded-interviews`
- `/blog/hiring-engineers-who-can-use-ai`
- `/blog/structured-interview-fairness-ai-era`

### FAQ + privacy + terms + subprocessors
- All updated to use `buildMetadata` (OG + canonical + robots all set)
- FAQ page now emits FAQPage + BreadcrumbList JSON-LD

### Home page
- Nav updated with Pricing / About / Blog / FAQ
- Footer expanded with full sitemap + comparison links
- Marquee logos now lazy-load
- Type-check clean (`npx tsc --noEmit` passes)

### Drafts (in `resources/seo/`)
- `reddit-outreach-drafts.md` — 5 reply templates, target subs, posting protocol
- `directory-listings.md` — 22 directories prioritised, master pitch copy
- `backlink-outreach.md` — 4 outreach email templates, target list method
- `30-60-day-experiment-playbook.md` — weekly cadence, rewrite playbook, refresh playbook

---

## What you need to finish (~30 min total)

### 1. Verify Google Search Console (5 min, after first deploy)

The verification token is already in `web/.env.local`:
```
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=nktAtO3_ZSzqeY4IHKvdgXJQh9y6umgWOc5S4MH5PC8
```

**Steps:**
1. Add this env var to Vercel / your production host (Settings → Environment Variables).
2. Deploy to production.
3. Verify the `<meta name="google-site-verification" ...>` is in the homepage HTML: `curl -s https://basanite.co.uk | grep google-site`
4. Go to https://search.google.com/search-console/welcome
5. Click "Verify" on the basanite.co.uk URL-prefix property (it's already partway set up).
6. Once verified, go to Sitemaps → submit `https://basanite.co.uk/sitemap.xml`

### 2. Finish Google Analytics 4 wizard (5 min)

The GA tab is open at https://analytics.google.com/analytics/web/provision/#/provision/create — Account name "Basanite" and Property name "basanite.co.uk" are already filled.

**To finish:**
1. Click "Next" on the Account creation step (accept all data-sharing defaults or untick as preferred).
2. On Property creation, change Reporting time zone to **United Kingdom** and Currency to **British Pound (£)**. Click Next.
3. Business details: pick any Industry (Jobs & Education works), Business size = Small. Click Next.
4. Business objectives: tick "Generate leads" + "Examine user behavior". Click Next.
5. Data collection: pick **Web** platform.
6. Stream URL: `https://basanite.co.uk` · Stream name: `Basanite Website` · click Create stream.
7. Copy the **Measurement ID** (format `G-XXXXXXXXXX`).
8. Add to `web/.env.local` AND Vercel env:
   ```
   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```
9. Deploy. The `<Script>` tags in `layout.tsx` activate automatically.

### 3. Submit to directories (1-2 hrs, do over a week)

Follow `resources/seo/directory-listings.md` — Tier 1 first (Product Hunt, AlternativeTo, Crunchbase, G2, Capterra), then Tier 2/3. Most are 5-15 min each.

### 4. Reply on Reddit (2-3 hrs/week, ongoing)

Follow `resources/seo/reddit-outreach-drafts.md`. Run the suggested searches each Monday, post max 2 replies/week, never lead with the product mention.

### 5. Backlink outreach (1-2 hrs/week, ongoing)

Follow `resources/seo/backlink-outreach.md`. Build a target list from Google searches for "best AI hiring tools 2026" etc., personalise emails from the templates, send 10-25 per week.

### 6. Weekly SEO review (30 min/week from Day 14)

Follow `resources/seo/30-60-day-experiment-playbook.md`. Once GSC has data:
- Find queries with high impressions, low CTR → rewrite titles/descriptions
- Find queries we rank for that we didn't target → write new articles
- Find pages on page 2 → add depth + internal links to push to page 1

---

## What to expect

| Week | Signal |
|------|--------|
| 1 | Site crawled. Sitemap submitted. 0 impressions yet. |
| 2-3 | First pages indexed. A few impressions on long-tail queries. |
| 4-6 | 100-500 impressions/day. Comparison pages starting to rank for branded queries. |
| 8-12 | First non-branded organic clicks. Blog articles ranking for low-comp keywords. |
| 13-26 | Compounding. Backlinks from directories landing. Article CTR rising as you refresh titles. |
| 26+ | Material organic traffic. Iteration loop in full swing. |

The biggest single multiplier is **getting on existing listicles where competitors are featured** — that's the #1 lever after the foundation is in place. See `resources/seo/backlink-outreach.md`.

---

## Files modified or created

```
NEW:
  web/lib/seo.ts
  web/app/sitemap.ts
  web/app/robots.ts
  web/app/opengraph-image.tsx
  web/app/about/page.tsx
  web/app/contact/page.tsx
  web/app/pricing/page.tsx
  web/app/blog/page.tsx
  web/app/blog/_components/ArticleLayout.tsx
  web/app/blog/{8 article directories}/page.tsx
  web/app/compare/{4 directories}/page.tsx
  web/app/alternatives/{5 directories}/page.tsx
  web/.env.local (with NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION)
  resources/seo/reddit-outreach-drafts.md
  resources/seo/directory-listings.md
  resources/seo/backlink-outreach.md
  resources/seo/30-60-day-experiment-playbook.md
  resources/seo/SETUP-HANDOFF.md  (this file)

MODIFIED:
  web/app/layout.tsx              — metadata + JSON-LD + GA hooks
  web/app/page.tsx                — nav + footer internal links + image lazy-load
  web/app/faq/page.tsx            — FAQPage JSON-LD + buildMetadata
  web/app/privacy/page.tsx        — buildMetadata
  web/app/terms/page.tsx          — buildMetadata
  web/app/legal/subprocessors/page.tsx — buildMetadata
  web/middleware.ts               — CSP allowlist for GA domains
  web/next.config.js              — AVIF/WebP + caching headers
```

---

## To verify locally before deploy

```bash
cd web
npm run dev
# then visit:
#   http://localhost:3000           — home page (check footer)
#   http://localhost:3000/sitemap.xml
#   http://localhost:3000/robots.txt
#   http://localhost:3000/about
#   http://localhost:3000/pricing
#   http://localhost:3000/blog
#   http://localhost:3000/compare/hackerrank-vs-basanite
#   http://localhost:3000/alternatives/hackerrank
# and view-source on any of them to inspect the JSON-LD scripts
```

Then validate the schema at https://validator.schema.org/ by pasting in the homepage HTML.
