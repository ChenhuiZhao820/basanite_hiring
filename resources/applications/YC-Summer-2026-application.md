# Y Combinator — Summer 2026 Application

**Company:** Basanite
**Batch:** Summer 2026 (current batch)
**Saved:** 2026-05-08
**Source:** Final answers as submitted via the YC application portal.

> Demo credentials that were submitted to YC for partner access have been redacted from this file. The submitted version included a working email and password for the live demo — rotate the password before considering this application archived.

---

## Founders

**Aditya Shah** — profile complete
**Chenhui (Lynn) Zhao** — profile complete
**Andrew Robertson** — profile complete

**How long have the founders known one another and how did you meet? Have any of the founders not met in person?**

3 years, we met in 2nd year of university have been best friends since.

**Who writes code, or does other technical work on your product? Was any of it done by a non-founder? Please explain.**

Andrew and Lynn

**Are you looking for a cofounder?**

no

---

## Founder Video

*(uploaded directly to YC; not transcribed here)*

---

## Company

**Company name**

Basanite

**Describe what your company does in 50 characters or less.**

> AI that screens, assesses & negotiates tech hires

**Company URL, if any**

basanite.co.uk

**Demo video**

*(uploaded directly to YC; not transcribed here)*

**Please provide a link to the product, if any.**

basanite.co.uk

*(Demo credentials submitted with the link have been redacted from this file. See notice at top.)*

**What is your company going to make? Please describe your product and what it does or will do.**

> Basanite is an AI agent that runs technical interviews end-to-end, so hirers only spend time on candidates worth meeting.
>
> A hirer pastes a job description and Basanite generates a tailored customisable evaluation framework, including the ability to negotiate salaries and inject specific conversational flows. Each candidate uploads their CV, and the system builds a unique interview from their actual experience. The interview agent probes the depth behind every answer, tracks narrative consistency, and flags AI-assisted responses. It then ranks all applicants with dimension scores, verbatim evidence, and salary compatibility. The hirer gets a shortlist with a briefing document for each candidate telling them exactly where to probe in the final round carried out by humans.
>
> We are currently building our 3rd iteration: a sandboxed coding environment where candidates work alongside an AI coding agent on a real codebase. This lets us measure the one skill no existing interview captures: how effectively an engineer collaborates with AI tooling.

**Where do you live now, and where would the company be based after YC?**

Manchester, UK & Hangzhou, China / San Francisco, USA

**Explain your decision regarding location.**

> San Francisco. That's where our customers, investors, and the people building AI dev tools are. It's also where our problem (candidate inflation) is worst. We're currently split between the UK and China, and distributed early teams ship slower. All three of us will relocate to SF for the batch.

---

## Progress

**How far along are you?**

> We've shipped our second iteration. The product runs end-to-end: ATS coverage across 50+ systems via Merge.dev, personalised interview synthesis from each candidate's CV, and structured reports for hirers. A data analytics team at Virgin Media O2 trialed the platform and gave us strong feedback.
>
> We're now in a verbal commitment for our first paid pilot with Maxwell Bond, a 7-figure recruitment firm, for contracting and part-time technical roles. The contract is worth ~£40k/year.

**How long have each of you been working on this? How much of that has been full-time? Please explain.**

> We started Basanite 6 weeks ago. Lynn (CPO) is full-time. Aditya (CEO) and Drew (CTO) are doing 20-25 hours a week alongside final-year computer science at Manchester. Both graduate in June 2026 and go full-time the day they finish.
>
> We shipped the MVP in week one: technical AI interviews with 100% AI detection on our trial set. In mock interviews, candidates who are genuinely fit for a role consistently rank higher than weaker ones, whether they cheat or not. We did desk research with hiring managers and an occupational psychometricist at Manchester to refine the scoring rubric. We've been accepted onto an internal accelerator at Stripe and have invited to speak at the Digital Futures conference in Manchester on May 7th.

**What tech stack are you using, or planning to use, to build this product? Include AI models and AI coding tools you use.**

> The product is a Next.js frontend on Vercel and a FastAPI backend on Render, with Supabase for database, auth, and recording storage. Interviews are run by an ElevenLabs voice agent driven by Claude Sonnet 4.6. A parallel Claude Opus 4.7 supervisor watches the live transcript and emits tactical directives to lift question depth. Haiku 4.5 handles CV extraction and report generation. ATS integrations go through Merge.dev. Transactional email via Resend.
>
> We are an AI Native company, if we had the budget to token max, we would. Our dev stack includes 2xClaude Max, 1xClaude Pro, Ottr premium. We created custom tooling for in-house automations: outreach, web interaction, competitor analysis. All of which utilise Claude Code context engineering in our private Github repo.

**Optional: attach a coding agent session you're particularly proud of.**

A real Claude Code session diagnosing and fixing a Content Security Policy regression on the deployed login page, then evolving the candidate interview UI from a text-overlay chat to a voice-only audio-reactive bubble. Edited transcript follows.

````text
▐▛███▜▌ Claude Code v2.1.121
▝▜█████▛▘ Opus 4.7 · Claude Max
▘▘ ▝▝ ~/dev/Basanite

❯ I get this error on the deployed webpage.

login:1 Executing inline script violates the following Content Security
Policy directive 'script-src 'self' 'nonce-aVIEz1Xdj2//XIXqvMwm1A==' blob:'.
Either the 'unsafe-inline' keyword, a hash
('sha256-Le/0Kco7DjsaALkVzqohNsD6cbdzUcLuUzCsy0M1JPU='), or a nonce
('nonce-...') is required to enable inline execution. The action has been
blocked.
[four further repetitions of the same CSP error with different SHA hashes]
a4eb85eb8d3fddf9.js?dpl=dpl_HJe72oX4ME2KSA7vFLN9mXFGY5vR:1 Uncaught (in
promise) Error: Connection closed.

Searched for 5 patterns, read 4 files, listed 1 directory.

⏺ The CSP nonce flow is set up in middleware, but the root layout never reads
headers(), so Next.js is statically rendering pages — meaning its inline
bootstrap/hydration scripts get emitted at build time without the nonce
attribute. When the request hits and CSP is enforced with a nonce, those
nonceless inline scripts get blocked.

The fix is to opt routes into dynamic rendering by reading the x-nonce header
in the root layout. Once Next.js sees both the request-side
Content-Security-Policy header and the route is dynamic, it automatically
stamps its framework inline scripts with the matching nonce.

⏺ Update(web/app/layout.tsx)
  +import { headers } from 'next/headers'
  +export default async function RootLayout(...) {
  +  // Reading the per-request nonce from middleware opts the tree into
  +  // dynamic rendering, which is required for Next.js to attach the
  +  // matching nonce to its framework inline scripts.
  +  await headers()

⏺ Fixed. Root cause:

web/middleware.ts does the CSP nonce setup correctly — generates a per-request
nonce, attaches it to the request as x-nonce, and sets Content-Security-Policy
on both the request and response. But for Next.js to actually stamp that nonce
onto its framework inline scripts (hydration, streaming, RSC payload), the
route has to be dynamically rendered. Without that, Next.js statically
pre-renders the HTML at build time with inline scripts that have no nonce —
and those are exactly what your browser is blocking.

❯ this was working fine for ages why did it randomly fail?

⏺ It didn't randomly fail — the strict CSP itself is brand new. It landed in
commit a704b9e (yesterday, "chore: security hardening, resources, and logos"),
which is also the commit that introduced web/middleware.ts. The commit message
even says it explicitly: "middleware: per-request CSP nonce, broaden matcher
to attach CSP to every HTML/API response".

Before that commit there was no CSP header on responses, so Next.js's inline
hydration scripts loaded fine. The new middleware turned on a strict
script-src 'self' 'nonce-…' policy, but the static-rendering side of the
change (reading headers() in the layout to opt routes into dynamic rendering)
wasn't done — so Next.js was emitting nonceless inline scripts that the
brand-new CSP then blocked.

❯ push the changes to prod

⏺ git push origin main
   To https://github.com/NeoDrew/basanite.git
      a704b9e..4b38884  main -> main

Pushed 4b38884 to origin/main. Vercel should pick it up and start a production
build automatically.

❯ /effort max

❯ /plan I want to change the conversation from a text message system to free
speech and an AI 'bubble' which moves on the AI's voice pitch and tone. Kind
of like the NCS music videos. I want no text on the screen and a pattern in
the background, kinda like wallpaper. Video is still there but the
conversation happens between you and a Bubble.

⏺ Plan mode active. Researching the current interview UI to understand exactly
what's there before proposing a redesign.

⏺ Explore(Map current candidate interview UI)
   25 tool uses, 77.0k tokens

⏺ Solid reconnaissance. Before moving to design, the load-bearing technical
unknown is: does @elevenlabs/react v0.7.1 expose any audio analysis surface
for the agent's output stream? The reconnaissance says it doesn't visibly
expose one, but I want to confirm by checking the actual SDK API rather than
just current usage. That decides whether the bubble can be voice-pitch-
reactive or has to fall back to a synthetic envelope driven by isSpeaking.

⏺ The SDK exposes exactly what we need: getOutputByteFrequencyData() (FFT bins
of agent's output audio), getOutputVolume(), plus an onAudio callback and
onVadScore voice-activity events. The bubble can genuinely react to AI voice
pitch and tone in real time — no synthetic fallback needed.

⏺ Plan(Design bubble interview UI plan)
   8 tool uses, 41.9k tokens

[Plan delivered, approved by user with: "Dark Background yes, Just react to AI
voice Yes, Mobile native too, yes."]

⏺ Voice-only Interview UI — Audio-reactive Bubble

Component architecture: refactor VoiceInterview.tsx into a thin host that owns
the SDK + lifecycle + recorder + timer + director, plus three new
presentational children (AgentBubble, InterviewBackground, SelfView).
VoiceInterview keeps its useConversation() instance, captures it in a ref, and
passes a stable getter to the bubble:

  type FftSnapshot = { freq: Uint8Array | undefined; volume: number;
                       isSpeaking: boolean }
  const getFft: () => FftSnapshot

Bubble visualization: SVG path with 36 control points around base radius 110.
Each frame, pull FFT bins via getOutputByteFrequencyData(), split into low
(bins 0-3), mid (4-15), high (16-31) bands, normalize 0-1. Per control point,
blend the three bands by angle (lows widen the whole shape, mids ripple at 6
lobes, highs ripple at 12), plus a slow inline simplex-noise term for organic
quality. Low-pass smooth radii frame-to-frame. Build d with closed quadratic
Béziers between midpoints. Fill: radial gradient basanite-700 → gold-500.
Glow: feGaussianBlur driven by a CSS variable --bubble-glow set per frame
from getOutputVolume().

[Five new components written: AgentBubble.tsx, InterviewBackground.tsx,
SelfView.tsx, EndButton.tsx, ErrorToast.tsx. VoiceInterview.tsx refactored:
all hooks, refs, timers, transcript-capture, finalize logic preserved
exactly — only the JSX returned during the live phase changes. ~80 lines of
old chat UI removed, replaced by 6 lines of new bubble UI.]

⏺ Plan complete. Build executed across 5 new components and one targeted
refactor of VoiceInterview.tsx. All load-bearing logic (timers, director,
transcript capture, finalize, recording upload, route push) untouched.
````

---

**Are people using your product?**

Yes

**How many active users or customers do you have? How many are paying? Who is paying you the most, and how much do they pay you?**

> We're starting our first paid pilot this week with Maxwell Bond, a 7-figure recruitment firm, for contracting and part-time technical roles.
>
> Before that, 50 trial users tested the product to shape our first iteration: computer science students at the University of Manchester, data engineers at Virgin Media O2, and Manchester-based tech recruiters.

**Do you have revenue?**

no

**If you are applying with the same idea as a previous batch, did anything change? If you applied with a different idea, why did you pivot and what did you learn from the last idea?**

Unanswered

**If you have already participated or committed to participate in an incubator, "accelerator" or "pre-accelerator" program, please tell us about it.**

> We have been accepted into an internal accelerator program by Stripe VC. We are currently onboarding onto the program.

---

## Idea

**Why did you pick this idea to work on? Do you have domain expertise in this area? How do you know people need what you're making?**

> We work in this industry and we see the problem first hand. All three of us have watched how trivially these systems break: AI overlays, leaked question banks, friends coasting through Hackerrank, capable people filtered out by a process that doesn't actually measure anything useful. In November, 150 students at our university were caught cheating on an ARM Hackerrank assessment. This is happening everywhere.
>
> We've spoken to hiring managers and senior engineers. The message is consistent: first-round technical screens waste the most time and produce the weakest signal. One engineering manager told us he rejects 80% of candidates at the live interview stage who passed the coding screen.
>
> We're candidates today and interviewers tomorrow. We know what's broken because we've been on both ends of it.

**Who are your competitors? What do you understand about your business that they don't?**

> We have categorised our competitors into three groups and each has a different blind spot.
>
> First, coding assessment platforms such as HackerRank and CodeSignal. They assess for standardised problems that tools like ChatGPT and Cluely solves trivially. They test pattern-matching on leaked question banks. The signal has collapsed.
>
> Second, AI interview tools, examples are HireVue, Karat, and Mercor. These are automated versions of static structured interviews. Questions from the same question bank for every candidate, same leakability, just delivered faster. Mercor is closest to us but runs a generic interview not personalised to the candidate's experience, so it can't probe depth.
>
> Third, traditional screens, for example Greenhouse and manual phone screens. They can't run consistent, deep first-round interviews at volume and requires senior engineers to lose hours on candidates who shouldn't be there.
>
> What we understand: in a world where AI can answer any static question, the only defensible screen generates each interview from the candidate's actual experience and probes the reasoning behind their answers. Static question banks, however AI-delivered, are a dead instrument.

**How do or will you make money? How much could you make?**

> We run a subscription credit model. Companies buy a monthly credit allowance sized to their headcount and top up if they run out or hit a busy hiring period. Gross margin is currently over 50%.
>
> We're starting with specialist recruitment agencies, plus startups and SMBs that are too understaffed to screen candidates properly.
>
> The Maxwell Bond contract will generate ~£40k/year at ~£20k gross profit. UK TAM across agencies and in-house teams is £350-500m. US TAM approaches $2B.

**Which category best applies to your company?**

B2B SaaS

**If you had any other ideas you considered applying with, please list them. One may be something we've been waiting for. Often when we fund people it's to do something they list here and not in the main application.**

> We also considered going wider into a full agentic hiring platform (posting, screening, scheduling, offers). We narrowed to first-round interviews because that's where the signal failure is worst.
>
> Another more different idea is Git for Doc. While working as a team we tried to build a knowledge base, but when documents evolve, it's hard to keep up with what changed, why, or who decided it. We want a collaborative document editor where every saved version carries a commit message, a full diff, and a breakdown of each contributor's changes. Approvers can accept or reject versions with written reasoning, creating a traceable record of how a team's knowledge actually develops over time. It can then be integrated with AI as a knowledge graph to serve as an LLM Wiki for AI-native companies.

---

## Equity

**Have you formed ANY legal entity yet?**

no

**If you have not formed the company yet, describe the planned equity ownership breakdown among the founders, employees and any other proposed stockholders.**

> Aditya Shah (CEO): 33.3%
> Andrew Robertson (CTO): 33.3%
> Lynn Zhao (CPO): 33.3%
>
> We plan to create a 10% option pool from dilution at our first fundraise, not from existing equity.

**Have you taken any investment yet?**

no

**Are you currently fundraising?**

no

---

## Curious

**What convinced you to apply to Y Combinator? Did someone encourage you to apply? Have you been to any YC events?**

> Every YC company is hiring engineers, often urgently and often with weak screening. The batch itself is one of the highest-density customer pools we could be inside. Beyond that, we're moving from product to go-to-market and the YC network has the highest concentration of founders and investors who've solved the exact problems we're about to hit.

**How did you hear about Y Combinator?**

> Social media. We've followed YC and some of its best investor's content for years.

---

## Batch Preference

**What batch do you want to apply for?**

current
