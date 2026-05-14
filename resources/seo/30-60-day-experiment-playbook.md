# 30-60 Day SEO Experiment Playbook — Basanite

Once Google Search Console (GSC) has 14-30 days of data, you have signal to act on. This is the repeatable weekly cycle to compound returns from the foundation we built.

---

## Week-by-week cadence

| Week | Focus |
|------|-------|
| 0-2 | Wait. Submit sitemap. Watch indexing. Don't change anything. |
| 3-4 | First data review. Look at impressions by query and by page. |
| 5-8 | Improve the top 10 highest-impression / lowest-CTR pages. |
| 9-12 | Refresh anything that dropped in rank. Write 2-3 new articles based on observed query gaps. |
| Every 4 weeks after | Repeat the cycle. Audit and prune underperformers every quarter. |

---

## Weekly 30-minute SEO review

Run every Monday morning. Block 30 minutes. Open these tabs:

1. GSC Performance → Last 28 days
2. GSC Coverage / Pages report → check for new errors
3. GA4 Traffic Acquisition → Organic Search
4. Ahrefs/SEMrush (free version) for domain authority + new backlinks

### What to look at

**1. Pages by impressions.** Sort descending. Eyeball top 20. Three signals:

- **High impressions, low CTR (<2%)** → title/description is the problem. Rewrite.
- **High impressions, average rank 8-15** → on page 2. Add depth + internal links to push to page 1.
- **High impressions, average rank 4-10** → on page 1 but not top 3. Improve substance, build backlinks.

**2. Queries we appear for that we DIDN'T target.** Open GSC Queries report, sort by impressions. Anything we rank for that we didn't intentionally write about? That's a topic to expand into a dedicated article.

**3. Queries with falling impressions WoW.** Sort by week-over-week delta. Pages that are losing impressions are usually competitor pages overtaking us or content that's gone stale. Refresh them.

**4. New backlinks.** Any new referring domain? Send a thank-you email if it's a real publication. Maintain reputation; it pays back in future placements.

---

## The "high impressions, low CTR" rewrite playbook

This is the highest-leverage move once you have 30 days of data. Pages already ranking well for queries getting clicks lifted from 1% to 3% is a 3× traffic gain with zero new content.

### Process

1. Open the query in incognito Google. Look at our title and meta description as they appear.
2. Look at the top 3 results. What words do they emphasise that we don't? What value prop do they lead with?
3. Rewrite the title (60 chars max, keyword early, value prop second):
   - Before: `HackerRank vs Basanite — Comparison`
   - After: `HackerRank vs Basanite (2026): Which One Catches AI Cheating?`
4. Rewrite the description (155 chars max, action verb + concrete differentiator + soft CTA):
   - Before: `Compare HackerRank and Basanite — features, pricing, and use cases.`
   - After: `HackerRank can't catch AI-assisted candidates. Basanite gives every candidate a unique CV-based interview. See the side-by-side.`

5. Update the page's `buildMetadata` call. Deploy. Wait 7-14 days for Google to recrawl + remeasure.

### Tracking template

Maintain `resources/seo/title-experiments.csv`:
`page, original_title, new_title, original_ctr, ctr_after_14d, ctr_after_28d, impressions_change, decision (keep/revert)`

Keep the change if CTR went up by ≥30% relative. Revert otherwise.

---

## Article-refresh playbook (every 90 days)

Articles age. Refresh the top 5 best-performing blog posts every quarter. Process:

1. Re-read it from a 2026 hiring manager's perspective. What's stale?
2. Add 200-400 words of new substance — a new section, a fresh stat, a new comparison.
3. Update the `dateModified` in the article JSON-LD via `articleJsonLd`.
4. Add 1-2 new internal links to articles published since.
5. Ping the URL in GSC → Inspect URL → Request indexing.

---

## Adding new articles (the "I notice we rank for X" loop)

Once GSC has data, you'll see queries you didn't target. The flywheel:

1. Find a high-impression query you didn't write for.
2. Check if you have ANY page that ranks for it. If yes, expand that page. If no, write a new article.
3. Use the keyword in the H1, the URL slug, the meta description, and at least 2 H2 headings.
4. Cross-link from the closest existing articles + the home/about/comparison pages.
5. Add to `app/sitemap.ts`.
6. Ping GSC.

Target: **1 new article per week** in months 2-3, dropping to **2 per month** thereafter once you have a stable ~30-50 article corpus.

---

## Indexing checklist (do this weekly)

GSC → Indexing → Pages

- **Indexed without issues:** count should grow weekly. Target 30+ by month 2.
- **Crawled — currently not indexed:** quality signal. Improve the page or merge into a stronger one.
- **Discovered — currently not indexed:** crawl budget signal. Improve internal links to the page.
- **Soft 404s:** something on the page is too thin. Add substance.

Re-submit the sitemap every time you publish 3+ new pages.

---

## What NOT to optimise prematurely

In the first 30 days, do NOT:
- Change page URLs (kills any nascent ranking signals)
- Delete pages because they have 0 impressions (give them 90 days)
- Aggressively keyword-stuff existing content (Google's quality signals are sharper than ever)
- Spend on paid backlinks (will trip a manual action and kill momentum)

In the first 60 days, do NOT:
- Build a 50-article content farm. Quality compounds. Quantity flattens.
- Pivot to a new keyword strategy if signals are mixed. Give the current strategy 90 days before judging.

---

## Quarterly audit

Every 90 days, run a full audit:

1. **Lighthouse on top 10 pages.** Target: LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms on mobile.
2. **Mobile usability** in GSC. Anything flagged? Fix immediately.
3. **Core Web Vitals** in GSC. Same.
4. **Schema validation** at https://validator.schema.org/ for the homepage, FAQ, and one blog post.
5. **Broken internal links.** Run Screaming Frog (free for ≤500 URLs) or a Next.js link checker.
6. **Stale dates.** Anything with a 2024 datePublished that's still publicly active? Update or remove.
7. **Underperformers.** Pages with 0 impressions after 6 months? Decide: rewrite, merge into a stronger page, or delete + 301 redirect.

---

## What "doubling down on what works" looks like

After 60-90 days you'll have signal for which content type / which keyword cluster is winning. Concretely:

| If this works best | Double down by |
|--------------------|----------------|
| Comparison pages getting ranked | Build 3-5 more for niche competitors (Triplebyte, Otta, Toptal, Mercor) |
| Blog articles getting backlinks | Write 2-3 more in same topical cluster |
| Specific keyword family (e.g. "AI cheating in interviews") | Build a hub page + 5 satellite articles |
| GSC shows "alternative" queries growing | Build remaining `/alternatives/<name>` pages |
| Reddit posts driving traffic | Increase posting cadence + write subreddit-specific helpful long-form |
| Backlinks from a single niche (e.g. UK HR press) | Pitch 3-5 more in that niche |

If none of the above is clearly working after 90 days, the issue is usually one of three things:
1. Domain authority is too low — focus on backlinks, not new content.
2. Pages don't actually answer the query well enough — read them fresh, compare to top result.
3. Wrong query targets — pick lower-competition variants.

---

## Tools to install / accounts to maintain

| Tool | Purpose | Cost |
|------|---------|------|
| Google Search Console | Index status, query performance | free |
| Google Analytics 4 | Behaviour analytics, conversion tracking | free |
| Ahrefs Free | Domain rating, backlink monitoring | free |
| Screaming Frog SEO Spider | Crawl audit | free for ≤500 URLs |
| Schema validator | Validate JSON-LD | free |
| PageSpeed Insights | Performance audit | free |
| GSC URL Inspector | Request indexing of new pages | free |
| Cloudflare Web Analytics | Privacy-friendly page-level analytics | free |

No paid tools needed for the first 6 months. Add Ahrefs ($99/mo) only if you grow to 200+ targeted pages and need backlink monitoring at scale.
