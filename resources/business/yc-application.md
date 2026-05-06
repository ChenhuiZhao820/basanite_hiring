# Basanite — YC Summer 2026 Application

**Status:** Working draft. Fields marked **[BRACKETED]** need real numbers/personal info before submit.

---

## Pre-submit checklist

1. Replace 50-char description (below)
2. Rewrite "Why did you pick this idea" — current draft has typos
3. Rewrite "How do you make money" — current draft is one line
4. Rewrite "What convinced you to apply to YC" — kill the "7%" line
5. Fill all Unanswered fields (drafts below)
6. **Record the 1-minute founder video** — non-negotiable, currently missing
7. **Convert at least 1 paid pilot before submit** — flips "revenue: no" to "yes"
8. Verify Lynn/Drew have no IP agreements from internships that overlap with Basanite
9. Fill real numbers (months working, users, customers) honestly — partners will ask

---

## SHARPEN — existing answers that hurt as written

### Describe what your company does in 50 characters or less

**Current:** `AI interviewing` (15 chars — too generic)

**Replace with:**

`AI interviews that vet technical talent` (39 chars)

Or, sharper:

`Vet technical hires in 10 minutes, not days` (43 chars)

---

### Why did you pick this idea to work on?

**Replace with:**

> Too many people cheat interviews. Too many companies hire people who can't actually do the work. About 75% of firms don't run structured technical assessments, and roughly half of new hires underperform — that's the gap we live in.
>
> Between the three of us we've sat through over a thousand interviews — Jane Street, Virgin Media O2, technical screens at consultancies, even game shows. We've been the candidate; we know exactly what a screening interview misses.
>
> On the other side, we've spoken with 100+ hiring managers, senior engineers, and psychometricians who design assessments professionally. Two patterns came back consistently: (1) hiring managers know their current screening process is unreliable, but every alternative they've tried adds more time, not less; (2) the dimensions that actually predict performance — judgment, tacit knowledge, capacity to learn — are exactly the ones a 30-minute human screen can't excavate.
>
> We're not guessing whether people need this. They've told us, repeatedly, in their own words.

---

### How do or will you make money? How much could you make?

**Replace with:**

> Monthly subscription with credit-based usage. Customers buy a monthly plan that includes a set allocation of assessment credits. One credit equals one assessment. If they exceed their monthly allocation they top up with additional credits at a higher per-credit price.
>
> Three tiers (working numbers, to be tightened before submit):
>
> - **Starter**: [£200] per month, [10] credits included, top-ups at [£25] each. Founders and small agencies hiring contractors monthly.
> - **Growth**: [£600] per month, [40] credits included, top-ups at [£20] each. Ops leads at 30 to 80 person companies running consistent technical hiring.
> - **Enterprise**: custom contracts. Staffing firms, BPOs and scale-ups running thousands of assessments per year, taking individual contracts to £30K to £300K in ARR.
>
> Why this works. Credits behave like a monthly procurement line item, which finance teams understand and recurring SaaS budgets already accommodate. The fixed monthly subscription gives us predictable revenue. The top-up mechanism handles the lumpy shape of hiring without forcing customers into a tier they do not need.
>
> A typical Growth customer running 40 assessments per month is £7,200 per year with effectively zero CAC once they are in. A Starter customer doing 10 a month is £2,400 per year. Our target is to land customers on Growth or higher within 90 days of acquisition.
>
> Market size. The global hiring tech market is $30B+. The contingent and staffing vetting layer alone is $400M+ ARR (Toptal). Capturing 1% of either is a $300M+ ARR business. We do not need to win the whole market. We need to be the trust layer for a single customer segment first, and let the product compound from there.

*(The bracketed numbers are placeholders. Confirm with Drew and Lynn before submitting.)*

---

### What convinced you to apply to Y Combinator?

**Replace with:**

> We're at the inflection point where the product works, the conviction is real, and the question is no longer "can we build this?" but "can we move faster than the incumbents notice?" YC compresses 18 months of GTM learning into 12 weeks — and the network of founders who hire continuously is the single best customer-development resource for what we do. Every YC startup is a potential pilot. That's not a small advantage; that's the product-market-fit accelerant we've been optimising the last six months toward.
>
> We've watched past Demo Days, read PG's essays for years, and modelled our customer-discovery discipline on the Mom Test framework YC has championed. Applying now, with revenue starting and the wedge sharpened, is the right time.

---

## UNANSWERED — drafts to fill in

### Where do you live now, and where would the company be based after YC?

> Manchester, UK / San Francisco, US (during YC) / **[London or Manchester]** afterward.

### Explain your decision regarding location.

> We'd relocate to the Bay Area for the duration of the batch — in-person at the YC office is non-negotiable for getting the maximum from the program. Post-batch, we'd be based in **[London — closer to the UK staffing market and easier to maintain a UK customer base in our first 12 months / SF — closer to capital and US enterprise customers]**, with the option to set up a US entity if customer concentration shifts that way.

*(Pick one. Different answers signal different things.)*

### How far along are you?

> The MVP is live and end-to-end working. Hirers can create roles with custom evaluation dimensions; candidates take a live 10–20 minute voice interview powered by Claude Sonnet 4.6 + ElevenLabs Conversational AI; and dual reports — hirer and candidate — are generated with quote-grounded scoring across our eight default dimensions. Auth, role management, candidate portal, interview SSE streaming, CV extraction, and report generation are all shipped.
>
> We have early users running real interviews, and we're converting the first paid pilots over the next 14 days. Repositioning the GTM around technical hiring (with contract/freelance as our initial wedge) is the focus of the next 30 days.

### How long have each of you been working on this? How much of that has been full-time? Please explain.

> **[X months]** total, of which **[Y months]** has been intense iteration on the product itself.
>
> All three of us are final-year students at the University of Manchester, graduating June 2026. Until then we are part-time on Basanite and full-time on degrees — but practically we are spending 25–35 hours/week each on the company, with shipped product to show for it. From June 2026 onward all three of us are full-time, and we are committing to full-time on the company immediately if accepted to YC (deferring final-year obligations to do so).

*(Fill in real months. Don't lie — partners will ask.)*

### What tech stack are you using, or planning to use, to build this product? Include AI models and AI coding tools you use.

> **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS
>
> **Backend:** Python, FastAPI, asyncio, SSE for real-time streaming
>
> **Database & auth:** Supabase (Postgres with RLS, Supabase Auth)
>
> **AI models:**
> - Claude Sonnet 4.6 (`claude-sonnet-4-6`) for the core interview agent — 64K-character system prompt, cached via Anthropic prompt caching to keep marginal cost per interview <$0.50
> - Claude Haiku 4.5 for CV extraction, dimension recommendation, and other auxiliary tasks where speed and cost beat reasoning depth
> - ElevenLabs Conversational AI for voice — the candidate speaks live to the agent, full duplex, ~10-minute cap
>
> **AI coding tools:** Claude Code is the primary development environment. We use Cursor for in-line edits and Claude Sonnet for architecture/refactoring discussions. Most of the codebase has been written or co-written with Claude.

### How many active users or customers do you have? How many are paying? Who is paying you the most, and how much do they pay you?

> **[Honest answer with real numbers.]** Template:
>
> *"X candidates have completed real interviews on the platform. Y companies have created live roles. We are converting our first paid pilots in the next 14 days; targeting 5–10 paid customers at £30–£300 each by end of May."*

### If you are applying with the same idea as a previous batch, did anything change?

> N/A — first YC application.

### If you have already participated or committed to participate in an incubator, "accelerator" or "pre-accelerator" program, please tell us about it.

> **[N/A — or list any. Be honest. Frame any prior accelerator as "early validation, learned X."]**

### What's new about what you're making? What substitutes do people resort to because it doesn't exist yet?

> What's new: every score in our hirer report traces back to a specific sentence the candidate said. No other AI hiring tool produces that audit trail. Combined with our 64K-character interview prompt — which is structurally larger and more carefully crafted than what a typical chatbot can sustain — we extract signal on dimensions like judgment under ambiguity and tacit knowledge that competitors and human screens both miss.
>
> Substitutes people use today, in declining order of cost:
> - **Toptal** — vets human-by-human, charges 30%+ markup on every contractor placed. The market admits this is worth paying for.
> - **Paid trial weeks** — companies bring contractors on at £100/hr for a week to "see if they can actually do the work," typically £4,000–£8,000 per trial.
> - **Take-home assignments** — chronically uncompleted, gameable with AI, signal-to-noise terrible.
> - **30-minute Zoom screen by an engineering manager** — the £150-an-hour senior IC's time, burned on a process every party admits is a coin flip.
> - **Just hiring from the founder's network** — works to about 20 hires, then breaks.
>
> Each substitute either costs more, takes longer, or produces worse signal. We replace all of them with a 10–20 minute structured AI conversation that produces an audit-grade report.

### Who are your competitors, and who might become competitors? Who do you fear most?

**Keep your existing "what we understand" three-bucket answer**, then add:

> We fear Mercor most. They're a YC company doing AI-conducted interviews end-to-end, well-funded, and they have the founder velocity to ship fast. Their model is marketplace-driven (interview → match candidates to companies), which we think is structurally weaker than ours (interview → produce assessment artefact), but if they pivot to assessment-as-a-service before we have logos, the competitive window narrows fast.
>
> Beyond Mercor: Greenhouse and HireVue both have the distribution and the engineering bench to ship "scores with citations" once they decide to. Their organisational gravity makes them slow now; that won't be true forever.

### How will you get users?

> **First 100 customers (next 6 months):**
>
> 1. **Cold outbound to a sharp wedge** — founders and ops leads at 5–80 person companies actively hiring contract or technical talent. We identify them via recent LinkedIn posts ("looking for a freelance React dev"), Indie Hackers / RevGenius / Demand Curve communities, and YC alumni networks. 100 cold DMs/week → 5–10 paid pilots/week is our target.
>
> 2. **Candidate-side flywheel** — when a candidate completes a Basanite interview, they get a portable, shareable report. Contractors compete on credibility; a high-scoring Basanite report becomes a LinkedIn post, which surfaces hirers who ask "where did you get assessed?" That inverts CAC.
>
> 3. **YC alumni network** — every YC startup is a potential customer. We'd offer the batch free pilots in exchange for testimonials, then convert to paid as they scale.
>
> **Scale (months 6–18):**
>
> - Inbound content: agency-founder-targeted blog ("I ran 47 technical screens last quarter — here's the signal data"), LinkedIn thought leadership from each of us.
> - Integrations with ATS platforms (Greenhouse, Ashby, Workable) so we appear inside the workflows hirers already use.
> - Earned media around the EU AI Act / NYC AEDT compliance angle — we are structurally the easiest AI hiring tool to comply with audit requirements, and that becomes the procurement moat as enterprises move.

### Are any of the founders covered by noncompetes or intellectual property agreements that overlap with your project?

> No. None of the three of us are covered by noncompetes or IP agreements that overlap with Basanite. All work to date has been done outside any employer's scope and time.

*(Verify this is true. Lynn and Drew may have signed paperwork at past internships — check.)*

### Have you received any government grants?

> No.

*(Or list any UK Innovate, Northern Powerhouse, university grants if applicable.)*

### Is there anything else we should know about your company?

> All three of us are graduating from the University of Manchester in June 2026 and are committed to full-time on Basanite from that point — earlier if accepted to YC. We have no pending lawsuits, no founders who have left, no outstanding obligations to other entities, and the cap table is clean.

### Tell us something surprising or amusing that one of you has discovered.

**Pick the one closest to truth, or replace with a real anecdote:**

> Aditya: While building the interview prompt, I tested it on myself by pretending to be a candidate I'd reject in real life. The agent caught me out — three times in a 12-minute conversation, on dimensions I would have insisted I was strong on. It's an unsettling experience to be quietly downgraded by the thing you built. It also became the moment I knew the product worked: it had become better at evaluating me than I was at evaluating myself.

*(Replace with a real anecdote. Authentic > polished. Honest weird story wins this question.)*

### How did you hear about Y Combinator?

> **[Honest — Hacker News, friend in YC (name them), PG essays, Demo Day livestreams. Do NOT say "googled accelerators" — signals low intentionality.]**

---

## MISSING ENTIRELY — must do before submit

### Founder Video (1-minute, unlisted YouTube)

**Currently: not uploaded. Non-negotiable for YC.**

Format that works:
- Aditya, Lynn, and Drew on camera, one after the other.
- 60 seconds total — ~20 seconds each.
- No slides, no editing tricks.
- Each says: name, role, one specific thing about why you're the right person for this.
- Filmed on a phone, well-lit, in one take if you can.
- Don't read from a script. Talk to the camera like you're explaining the company to a friend.

### Demo video

You have a YouTube link from earlier (`oTahLEX3NXo`) but the form shows "No video uploaded." Either re-add the link, or record a fresh 90-second screen recording showing: hirer creates a role → candidate enters interview → hirer sees the report. No talking-head intro; product in action only.

---

## ALREADY GOOD (leave as-is)

- Company name: Basanite
- URL: basanite.co.uk
- Founders met: 3 years, all met at Manchester, best friends since
- Technical work: Drew engineering, Lynn architecture
- Looking for cofounder: No
- Are people using the product: Yes
- Revenue: No (flip to Yes if you close a pilot before submit)
- Competitors — three-bucket analysis (Direct AI / Skills / Vetting marketplaces) and the "what we understand they don't" three-point answer
- Category: B2B SaaS
- Other ideas: AI-Native Hiring Company (good answer — shows discipline of choosing tools over services)
- Legal entity: No
- Equity: 33/33/33 + 10% reserved for early hires & academics
- Investment / fundraising: No / No
- Batch: Summer 2026
