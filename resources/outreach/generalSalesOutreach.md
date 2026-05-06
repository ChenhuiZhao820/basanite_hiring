# Basanite — General Sales Outreach Template

Use this for outbound outreach to potential customers, channel partners, and recruiters who could buy or recommend Basanite. For academic validation / supervisor / advisory outreach, use `scholarOutreachTemplate.txt` instead.

---

## Two-stage approach (important)

The **first** email is **not a sales pitch**. It is a warm invitation to try the product and share an honest reaction. We are explicitly *not* selling on first touch.

- **First email** — opens the relationship. Frame it like the academic outreach: their perspective is what we're after, the product is the carrier. Ask softly. Low-pressure ask for a 15 minute call. **No pricing, no offer language, no "pilot" framing.** "Would value your take" is the tone.
- **After the call** — once they have used it or seen it, that is when the sales conversation happens. Pricing, scoping, paid pilot, contracts. That is a different email and a different mode.

This file covers the **first email**. If we get a follow-up call and the conversation goes well, we then move to a sharper proposal email — that is drafted ad hoc, not from a template.

---

## How to use

1. Fill in the inputs below.
2. Paste this whole file into Claude.
3. Generate a tailored email. Always re-read it for tone before sending.

---

## Inputs

**Who are you emailing?**
- Name:
- Title:
- Company:
- Company segment: (e.g. UK staffing agency, US scaleup, in-house TA lead, agency owner)
- About them: (LinkedIn headline, recent post they made, an open role they're hiring for, a press release)
- Personalisation hook: (specific recent activity — open role post, funding round, hiring sprint, contract pain quote, award, content they wrote)

**What is the soft ask?**
The ask is always some flavour of "would value your take, and a 15 minute call to walk through it". Variants:

- **Try it themselves** — for hands-on practitioners (recruiters, hiring managers). Offer a no-charge run on a real candidate they're working with, in exchange for an honest reaction afterwards.
- **Walk through it on a call** — for senior buyers / leaders who won't run a tool themselves. Skip the trial, ask for 15 minutes to show it and hear their read.
- **A short demo first** — escape hatch when a call feels like too much. Offer a 90 second video.

---

## About Basanite (use this when introducing the company)

The second paragraph of every sales email should use the same framing as the canonical "About Basanite" block in `basanite_cold_email_prompt.md`. Mission-led, abstract, honest about stage. Do not list product details, dimensions, scoring, or pricing in this paragraph — that level of detail is for the call, not the cold email.

**Canonical introduction (paste-ready, adapted for body copy with no colons):**

> I am one of three co-founders at Basanite (basanite.co.uk), an early-stage AI-native technical hiring platform that evaluates genuine working capability rather than interview performance. We are three final-year Computer Science students at the University of Manchester (Aditya as CEO, Drew as CTO, Lynn as CPO and AI Lead), currently at concept validation stage.

**Reference facts** *(for context when answering follow-up questions on a call, not for the cold email body)*:

- **Product detail** — voice interviews, 10 to 20 minutes, quote-grounded hirer report scored on judgement under ambiguity, tacit knowledge, technical depth, capacity for change and four other dimensions.
- **Stage** — MVP live at basanite.co.uk. First paid pilots in May 2026. Full-time on Basanite from June 2026.
- **Pricing** — monthly subscription with credit-based usage. Customers receive a set allocation of assessment credits each month and top up at a per-credit price if they exceed it. **Do not quote specifics in the first email.**

---

## Prompt to give Claude

> I need to write a cold first-touch email to **[Name]**, **[Title]** at **[Company]**. This is a warm validation-style email, not a sales pitch — we want their perspective, not a deal on first contact.
>
> Here is what I know about them:
> [Paste bio / LinkedIn headline / recent post / open role / hook]
>
> The soft ask is: [try it themselves / walk through it on a call / short demo first].
>
> Use the Basanite facts above. Apply the structure and style rules below. Keep it under 280 words.

---

## Structure

1. **Open on them, not us.** Reference the specific personalisation hook in the first line. Do not open with "My name is" or "I'm reaching out".
2. **Acknowledge their perspective.** One short sentence connecting their day-to-day work to *why their take specifically would be useful to us*. This is the move that separates a warm validation email from a sales email — we are saying "you've done this longer than us and you'd see things we miss".
3. **Introduce Basanite in one short paragraph.** Honest about stage. Plain language. Quote-grounded reports as the differentiator if relevant. **No pricing.** **No "pilot" or "trial" framing if it sounds transactional.**
4. **Soft offer.** "We could set you up to run Basanite on a real candidate you're working with (no charge, no commitment), and afterwards I'd be keen to hear where it was useful, where it missed and whether it could fit alongside how you work today." Or, if they are a senior buyer who won't get hands-on, skip the trial and offer the call directly.
5. **Permission to be honest.** "An honest reaction, including reasons not to use it, is far more useful than polite interest." This is the line that re-anchors the email as validation, not sales.
6. **Low-pressure ask for 15 minutes.** "If that is something you'd be open to, happy to find a 15 minute call this week or next."
7. **Close with the signature block.**

---

## Signature

```
Many thanks,
Aditya Shah
Co-founder, Basanite
basanite.co.uk
```

---

## Writing rules

- **UK English.** Organise, behaviour, judgement, programme, recognise.
- **No em dashes.** Use commas, full stops, or rephrase.
- **No colons in subject lines or body copy.** They read as AI-generated. Use commas, full stops, or rephrase. (Colons inside lists or headers in *internal* docs are fine; in outbound email they are not.)
- **No Oxford comma.** "Speed, depth and signal" not "speed, depth, and signal".
- **No AI-sounding phrases.** Avoid "in today's fast-paced world", "streamline your process", "leverage AI", "delve into", "robust solution".
- **No "it's not just X, it's Y".** No "from X to Y". No rule-of-three flourishes.
- **No flattery, no hype.** "I noticed your post" beats "I love what you're doing".
- **No pricing on first touch.** Save for the follow-up after a call.
- **No "free pilot" / "we'll front the credits" framing.** Reads transactional. Use "we could set you up to run it on a real candidate" instead.
- **Be honest about stage.** We are early. Pretending otherwise is the fastest way to lose credibility with experienced operators.
- **Specific over generic, every time.** "Your Senior Cloud Engineer post yesterday" beats "your hiring activity".
- **Warm, not transactional.** The voice should sound like a thoughtful student-founder asking an experienced practitioner for their read. Not a sales rep working an account.
- **Don't drop the "I" before verbs.** Write "I saw your post" or "I noticed your post", not "Saw your post" or "Noticed your post". Subjectless openings read as curt and Twitter-y, which is the opposite of warm.

---

## Subject line patterns

Pick one. All under 60 characters. No colons.

- `Would value your take on what we are building at Basanite`
- `Following our LinkedIn connection, a quick ask`
- `Saw your [role] post, would value your perspective`
- `Curious for your read on something we are building`
- `Quick ask from a Manchester student team`

Avoid clickbait, avoid colons, avoid all-caps, avoid emoji.

---

## Worked example (first-touch email — sent 5 May 2026, Picture More)

**To** — Gabriella Mee, Resource Specialist at Picture More Recruitment (legal/IT/security)
**Hook** — Connected on LinkedIn earlier same day; recent posts on the Senior AI Security Architect (£110-132.5k, Central London) and SecOps Engineer roles for London law firms.
**Soft ask** — Try it themselves.

**Subject** — `Would value your take on what we are building at Basanite`

> Hi Gabriella,
>
> I saw your Senior AI Security Architect post (£110-132.5k, Central London) and your earlier SecOps Engineer one. Vetting senior security hires for law firms looks like the kind of work where you have a strong, hard-earned read on what separates a real candidate from a polished one, and that is exactly the perspective we are short on right now.
>
> I am one of three co-founders at Basanite (basanite.co.uk), an early-stage AI-native technical hiring platform that evaluates genuine working capability rather than interview performance. We are three final-year Computer Science students at the University of Manchester (Aditya as CEO, Drew as CTO, Lynn as CPO and AI Lead), currently at concept validation stage.
>
> What I would really value is your take. We could set you up to run Basanite on a real candidate you are working with (no charge, no commitment), and afterwards I would be keen to hear where the report was useful, where it missed and whether it could actually fit alongside how you and the team at Picture More vet for law-firm clients today. An honest reaction, including reasons not to use it, is far more useful to us at this stage than polite interest.
>
> If that is something you would be open to, happy to find a 15 minute call this week or next.
>
> Many thanks,
> Aditya Shah
> Co-founder, Basanite
> basanite.co.uk

---

## When to use the short-form template instead

If the prospect is on LinkedIn and has recently posted an open role you can hook off in one sentence, use `linkedinOutreach.txt` instead. That template is for hiring-pain DMs, not full email pitches.

---

## After the call (the actual sales conversation)

This is not a templated email. After a call goes well, the follow-up is bespoke and includes:

- Pricing (£30 to £75 per assessment, no subscriptions)
- The specific use case the call surfaced
- A concrete proposal — the next 1 to 3 candidates they want to run, the rough timing, who else needs to be in the loop
- Onboarding next step (we'll set up the role today, link in 24 hours)
- Permission to forward to whoever else makes the call

Save the harder edges (pricing, scope, contracts) for this stage. The first email earns the right to have this conversation; this email closes it.
