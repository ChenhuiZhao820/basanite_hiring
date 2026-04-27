# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this directory is

The **business and outreach workspace** for Basanite — not the product codebase. No build, lint, or test commands apply here. The product (Next.js + FastAPI + Supabase) lives one level up at `/Users/andrewrobertson/dev/Basanite/` and has its own `CLAUDE.md` covering tech stack, architecture, and the 8 evaluation dimensions.

Use this directory for: business docs, outreach campaigns, sales/prospect data, team bios, meeting transcripts, brand assets. When Claude is invoked here, the expected work is typically **drafting emails, updating lead JSON, summarising PDFs/transcripts, or producing new outreach batches** — not code.

## Layout and what each area is for

- `business/` — Canonical business PDFs: `Basanite Product Overview V1.0.pdf`, `Basanite Marketing Strategy.pdf`, GSTACK analysis, David Hughes briefing/explainer, `basanite.pdf` (original pitch). Treat these as the current source of truth for how Basanite is positioned externally. Read the relevant PDF before writing new outward-facing copy.
- `claudeMVP/Basanite Interview Prompt.md` — 638-line interview agent prompt, **the canonical product logic reference** (also referenced from the parent repo's CLAUDE.md). `Test Vantix Systems.pdf` is a sample candidate CV used for testing.
- `outreach/` — Active outreach workflow (see next section).
- `meetings/` — Raw meeting transcripts (e.g. `postDavidInterviewMeet.txt`). Long, verbatim, unsummarised; speaker-labelled. When asked about a meeting, read and summarise rather than skimming.
- `team/` — Short Markdown bios for the three co-founders: Aditya Shah (CEO), Andrew/Drew Robertson (CTO), Lynn Zhao (CPO/AI Lead). Use when a prospect asks "who's on the team" or when personalising outreach.
- `pictures/` — Team profile pics (`drewPfp.png`, `adityaPfp.png`, `lynnPfp.png`), `icon.jpeg`, and `videos/` (mp4s gitignored).

## Outreach workflow

This is the main active workflow. Claude was historically driven here with the Gmail MCP to create drafts; the JSON files are the durable record.

**Templates** (`outreach/*.txt`):
- `reachoutEmailTemplate.txt` — "Cold Email Generator Prompt". A meta-prompt, not a filled template. Feeds in name/title/org, bio, and a goal (coffee chat / validation / partnership / pilot / investor intro). Hard style rules: **UK English, no em dashes, no AI-sounding phrases, not salesy, low-pressure ask.** Used for `template: "long_form"` leads (academic/validation/partnership angle).
- `linkedinOutreach.txt` — Short LinkedIn DM template, hiring-pain hook ("I saw you're still looking for {role}... we made a tool to automate screenings..."). Used for `template: "short_form"` leads.

**Lead files** (`outreach/*.json`, `outreach/prospects.csv`):
- `leads.json` — primary long-form campaign (founders/execs at AI-adjacent scaleups + academic validation targets).
- `leads_batch_A.json`, `leads_batch_C.json` — short-form hiring-hook batches (UK/US startup CEOs with open eng roles).
- `prospects.csv` — US scaleup prospects scraped from Wellfound/careers pages with `intent_score`, `open_tech_roles`, `funding_stage`, `ats_detected`, and a pre-written `outreach_subject` / `outreach_body` per row.

**Lead schema** (JSON — keep new entries consistent):
```
id, name, title, company, company_domain, company_segment,
email, alt_email, email_pattern, email_confidence,
source_url, source_type, personalisation_hook, subject,
draft_id, alt_draft_id (or superseded_draft_id),
draft_status, created_at, template
```
- `draft_id` / `alt_draft_id` are Gmail draft IDs created via the Gmail MCP. `superseded_draft_id` is an older draft that was replaced — keep it, don't overwrite.
- `company_segment` values seen so far: `uk_startup`, `us_scaleup`, `uk_scaleup_recruiter`. Add new segments sparingly and consistently.
- `email_confidence` is `inferred_medium` for pattern-guessed addresses; mark higher confidence explicitly if verified.
- `template` is `long_form` or `short_form` and dictates which text template to use.

**When adding leads**: append to the right file, use the next `id` in sequence (zero-padded 4 digits), set `created_at` to today's date in `YYYY-MM-DD`, and only set `draft_status: "created"` once a Gmail draft actually exists.

## Writing style (applies to all outward copy)

From `reachoutEmailTemplate.txt` and observed patterns in existing leads:
- **UK English**, no em dashes, no "it's not just X, it's Y" constructions, no rule-of-three, no AI tells.
- Open with something specific to the recipient (a raise, a hire, a paper, a product decision) — never a generic compliment.
- Be honest about stage: early, customer/concept validation. Do **not** oversell.
- Ask for **critical or commercial perspective**, not endorsement.
- Low-pressure close. "Worth a 15-min call?" is the observed short-form close.

## Brand (cross-reference)

Name, domain, colours, fonts, and the 8 evaluation dimensions are defined in the parent `CLAUDE.md` at `/Users/andrewrobertson/dev/Basanite/CLAUDE.md`. Don't duplicate that content here — read it if positioning/product questions come up.
