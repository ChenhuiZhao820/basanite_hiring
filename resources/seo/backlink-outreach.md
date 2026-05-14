# Backlink Outreach — Listicles & Competitor Placements

The single highest-ROI backlink play in 2026 isn't building new content — it's getting Basanite added to existing top-ranking lists where competitors are already featured. Each placement is a do-follow link from a page Google already trusts.

---

## Step 1 — find the target list pages

Run these searches in Google. For each result, check: is Basanite missing from the list? Is at least one competitor (HackerRank, HireVue, Karat, Mercor, CodeSignal) featured? If yes, it's a target.

```
"best AI hiring tools" 2026
"best technical interview platforms"
"top AI recruiting software"
"HackerRank alternatives"
"HireVue alternatives"
"Karat alternatives"
"Mercor alternatives"
"best video interview platforms"
"AI interview software comparison"
"top coding assessment tools"
"recruitment automation tools 2026"
"AI screening tools for engineers"
"alternatives to take-home tests"
"AI tools for recruiters"
"HR tech tools 2026"
```

For each query, look at the top 10 results. Open every "best of" listicle that includes one of our competitors.

---

## Step 2 — qualify each target

Open the page. Check three things:

1. **Last updated date** — anything older than 12 months and they probably won't update.
2. **Comments / contact info** — is there a name, email, or "submit your tool" form?
3. **Domain Rating** — use Ahrefs free DR checker. DR ≥ 30 is worth our time. DR < 20 is mostly noise.

Keep a target list at `resources/seo/backlink-targets.csv` with columns: url, list_title, competitors_featured, last_updated, contact_email, DR, status (todo/contacted/reply/added/declined), date_contacted.

---

## Step 3 — outreach templates

Send from `aditya@basanite.co.uk` or `hello@basanite.co.uk`. Plain text, no HTML signatures. Always personalised — the writer's name, the article title, one specific observation about their list.

### Template A — "we should be on this list" (warm)

Subject: `Quick suggestion for [Article Title]`

> Hi [first name],
>
> Came across your [Article Title] — useful framing, especially [one genuine observation about something in their piece, e.g. "the point about Karat scaling poorly past 10 hires/month was the right way in"].
>
> Wondered if you'd consider adding Basanite. We're a year-old AI-native technical interview platform out of Manchester. The differentiation versus the tools you've covered:
>
> - Every candidate gets a unique conversation built from their own CV — so leaked answer banks stop working, which is the failure mode HackerRank / CodeSignal can't solve.
> - For the coding round, we invert the problem: candidates use their own AI agent (Claude Code, Cursor, etc.) in a sandboxed VS Code, and we score how well they collaborate with it. That's the dimension HireVue/Karat don't capture.
> - Every score in the hirer report cites the exact sentence the candidate said. Auditable, GDPR-ready.
>
> Live at basanite.co.uk if you want to poke around. Happy to send a 60-second product walkthrough if useful. No worries either way.
>
> Thanks for the writing,
> Aditya
> Co-founder, Basanite

### Template B — "found a factual error" (firmer)

Use when their listicle has stale info on a competitor (e.g. they claim HireVue still uses facial analysis — HireVue dropped that in 2021).

Subject: `Factual update for your [Article] piece`

> Hi [first name],
>
> Reading [Article Title] — one note: the section on [competitor] mentions [stale fact]. They actually [corrected fact, with source].
>
> Worth a quick update — the piece otherwise reads well.
>
> While I'm here, would you consider adding Basanite to the list? We're a Manchester-based AI-native technical interview platform. Founded 2026. The angle nobody else has is [one-sentence differentiator]. Live at basanite.co.uk.
>
> Either way, thanks for the careful writing on the rest.
>
> Aditya
> Co-founder, Basanite

### Template C — broken-link replacement

Use when their listicle links to a tool that's been acquired/shut down. Find broken outbound links with Screaming Frog or a free broken-link checker.

Subject: `Broken link in [Article Title]`

> Hi [first name],
>
> Quick heads-up: the link to [defunct tool] in [Article Title] is returning a 404 / redirecting to [acquirer]. Worth either updating to point at [acquirer] or replacing with something current.
>
> Speaking of which — if you're updating, we'd love to be considered. Basanite, AI-native technical interview platform out of Manchester. We're the most direct replacement for the [defunct tool] use case if it was about [their angle]. basanite.co.uk
>
> Either way, the broken link was the main reason for the email.
>
> Aditya
> Co-founder, Basanite

### Template D — guest post / contributed piece

For publications that take pitches (UKTN, TechRound, Recode, etc.) — not directory listings.

Subject: `Pitch — AI is breaking technical hiring, and "ban AI" isn't the answer`

> Hi [first name],
>
> I'd like to pitch a 1200-word piece for [publication]. Working title: "The technical interview has collapsed. Banning AI from it makes the problem worse."
>
> The argument: as of late 2025, 35% of technical interviews show evidence of AI assistance (Fabric, Dec 2025). Most teams are responding by banning AI from the interview process. But the Harvard / BCG 700-consultant study from 2023 already showed that knowing when NOT to use AI is the differentiator that separates strong from weak performers — and banning AI from the interview means you can't measure that.
>
> I'd cover: (1) what the data actually says about cheating, (2) why banning AI is the wrong response, (3) what an AI-augmented interview should measure, (4) what comes after take-homes.
>
> Background: I'm a co-founder of Basanite, an AI-native technical interview platform out of Manchester. We've talked to ~100 hiring managers and surveyed >1000 interviews. Happy to send a sample piece if useful.
>
> Thanks for considering,
> Aditya

---

## Step 4 — follow up exactly once

If no reply after 5 working days, send a one-line follow-up:

> Hi [first name] — circling back on the suggestion below in case it got buried. No reply needed if it's not a fit.

If no reply after another 5 days, drop it. Don't send a third email.

---

## Step 5 — track and measure

CSV columns at `resources/seo/backlink-outreach.csv`:
`date, target_url, target_DR, contact, template_used, follow_up_sent, reply_received, outcome, backlink_url, anchor_text`

Review monthly. Patterns to watch:
- Subject lines under 50 chars get 2× the open rate of long ones
- Reply rate is usually 5-15%. Conversion to actual backlink is 30-50% of replies. So expect 1-2 backlinks per 25 emails.
- Template B (factual error) gets the highest reply rate but the lowest backlink rate. Template C (broken link) gets the highest backlink rate but the lowest reply rate.

---

## Realistic targets

| Time horizon | Target backlinks (DR 30+) |
|--------------|---------------------------|
| 30 days | 3-5 |
| 90 days | 10-15 |
| 180 days | 25-40 |
| 365 days | 60-100 |

A high-quality DR-50+ listicle backlink is worth ~10× a Tier-3 directory listing. Prioritise accordingly.

---

## What NOT to do

- Don't buy backlinks. Google's penalty signal is sharper than ever — one paid-link cluster can kill a young domain.
- Don't mass-blast the same template. Personalisation rate caps your reply rate; cold-mail at scale gets you marked as spam.
- Don't trade backlinks. PBNs are detected and penalised.
- Don't ask for a backlink in the first sentence. Lead with the observation; the ask is the third paragraph at earliest.
