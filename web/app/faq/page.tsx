// FAQ: questions and answers grounded in the Basanite Product Overview.
//
// Structure: five categories, ~22 questions. Each <details> is server-rendered
// HTML so expand/collapse needs zero JavaScript. Section anchors (#product,
// #assessment, #dimensions, #for-hirers, #for-candidates) make URLs shareable.
//
// Visual language matches the beautified pricing/about pages: dark stone hero
// band, Reveal-on-scroll sections, and the gold-left-border open state on each
// FAQ item. Copy is kept plain and direct: short sentences, no hype.

import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { headers } from 'next/headers'
import { SiteNav } from '@/components/SiteNav'
import { StoneTexture } from '@/components/StoneTexture'
import { Reveal } from '@/components/Reveal'
import { buildMetadata, faqPageJsonLd, breadcrumbJsonLd } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'FAQ',
  description: 'Answers to common questions about Basanite: how the two-round AI interview works, what the eight dimensions measure, how scoring works, and how we keep candidate data private.',
  path: '/faq',
})

type FaqItem = { q: string; a: ReactNode }
type FaqGroup = { id: string; title: string; eyebrow?: string; items: FaqItem[] }

const GROUPS: FaqGroup[] = [
  {
    id: 'product',
    eyebrow: 'The product',
    title: 'What Basanite is, and what it deliberately isn’t.',
    items: [
      {
        q: 'What is Basanite, in one sentence?',
        a: (
          <>
            Basanite tests the technical part of the interview, rebuilt for the AI era. Two rounds measure whether a candidate can do the work, in conversation and at a keyboard next to an AI agent.
          </>
        ),
      },
      {
        q: 'Why do you say the technical interview is broken?',
        a: (
          <>
            Two things broke over the last two years. Coding tests turned into a cheating arms race: AI agents and &ldquo;interview-coder&rdquo; overlays let candidates pass take-homes and live screens without the skill the test is meant to check. And the skill that now matters, working effectively with AI, isn&rsquo;t measured anywhere. Ban AI from the interview and you test unaided coding while ignoring how the job is actually done.
          </>
        ),
      },
      {
        q: 'What is Basanite not?',
        a: (
          <>
            We test the technical layer only. Personality tests, motivation profiles, and culture-fit scoring are out of scope. They&rsquo;re different problems with different evidence and different rules, and bundling them in would weaken all of them. We may build them later as separate products, once the technical layer is solid.
          </>
        ),
      },
      {
        q: 'How is this different from coding tests like HackerRank or Codility?',
        a: (
          <>
            Those tests measure how well you solve isolated puzzles under artificial rules. Basanite measures how you ship complete, well-judged work in a real codebase with an AI agent, the way the job is actually done. Round 2 flips the usual anti-cheating stance: instead of blocking AI, we require it and record how you use it.
          </>
        ),
      },
      {
        q: 'How is this different from AI interview platforms like Maki or HireVue?',
        a: (
          <>
            Most AI interview tools play a fixed set of questions and score the transcript. They don&rsquo;t adapt to what you say, and they can&rsquo;t tell real ability from good interview prep. Basanite asks each candidate different questions that map to the same underlying skills and rubrics. Then it adds a second round in a real coding environment, which no transcript-only tool can match.
          </>
        ),
      },
    ],
  },

  {
    id: 'assessment',
    eyebrow: 'The two rounds',
    title: 'How the interview itself works.',
    items: [
      {
        q: 'How long does the assessment take?',
        a: (
          <>
            Round 1 runs 20–30 minutes. Round 2 is timed by seniority: 35 minutes for junior, 60 for mid, 90 for senior, with an optional 120-minute extension for architecture-heavy senior roles. Both rounds end when the signal is clear, not at a fixed question or task count.
          </>
        ),
      },
      {
        q: 'What is Round 1?',
        a: (
          <>
            A structured conversation. Basanite asks questions grounded in your CV and follows up on anything vague, missing, or unsupported. It picks up the dimensions that come out through how you tell your story: judgment, reasoning, and tacit knowledge.
          </>
        ),
      },
      {
        q: 'What is Round 2?',
        a: (
          <>
            The AI Collaboration Workbench. You get a sandboxed VS Code, a role-matched codebase of several thousand lines, a real ticket set to your seniority, and your choice of AI coding agent. We record keystrokes, agent prompts, git state, and how you verify your work. After the timed session, a 10-minute reflection conversation checks what you did against what you thought you were doing.
          </>
        ),
      },
      {
        q: 'What does the codebase look like? Is it a toy?',
        a: (
          <>
            No. It&rsquo;s a synthetic project of several thousand lines, matched to the role and seniority: a SaaS codebase for backend SaaS roles, an agentic-systems codebase with retrieval and evaluation harnesses for applied-AI roles, a security codebase with seeded vulnerabilities for security roles. Tickets read like the ones you&rsquo;d get in your first week. At senior levels they&rsquo;re deliberately under-specified, so you have to scope the work and sometimes push back on a simulated requester.
          </>
        ),
      },
      {
        q: 'If AI use is required in Round 2, how do you prevent cheating?',
        a: (
          <>
            We flip the usual approach. &ldquo;Did they use AI&rdquo; is no longer a cheating vector: we require it and record it. What&rsquo;s left is someone else doing the work: a third party on the candidate&rsquo;s machine, or a stand-in for the whole session. We handle that with identity checks at the start, behavioural biometrics sampled through the session and compared to a Round 1 baseline, and a random mid-session check-in where you explain a decision you just made. Real candidates explain it easily from memory. Stand-ins don&rsquo;t.
          </>
        ),
      },
      {
        q: 'What does Round 2 deliberately not measure?',
        a: (
          <>
            It&rsquo;s not a hidden algorithm test. There are no LeetCode-style problems. Tickets are ordinary engineering tasks, the kind you&rsquo;d do any day in the role. The question isn&rsquo;t whether you can crack a hard puzzle under artificial limits; it&rsquo;s whether you ship complete, well-judged work the normal way. We also don&rsquo;t reward using AI &ldquo;more&rdquo; or &ldquo;less&rdquo;. We look for judicious use: knowing where the agent helps and where it doesn&rsquo;t.
          </>
        ),
      },
    ],
  },

  {
    id: 'dimensions',
    eyebrow: 'The eight dimensions',
    title: 'What we score, and why these.',
    items: [
      {
        q: 'What are the eight dimensions and where do they come from?',
        a: (
          <>
            <p className="mb-3">
              Each one has a formal definition, an intellectual source, and a reference list. They draw on cognitive science, philosophy of knowledge, decision theory, organisational psychology, and the new research on human–AI collaboration.
            </p>
            <ol className="list-decimal pl-5 space-y-2 marker:text-gold-600">
              <li><strong>Judgment Under Ambiguity</strong>: committing to a defensible course of action when information is incomplete (Knight; Tetlock).</li>
              <li><strong>Tacit-Knowledge Articulation</strong>: surfacing knowledge that lives in practice rather than in text (Polanyi; Nonaka &amp; Takeuchi; Collins).</li>
              <li><strong>Intuition Under Data Scarcity</strong>: recognition-primed judgment that distinguishes real expertise from vocabulary (Klein; Dreyfus &amp; Dreyfus; Kahneman &amp; Klein).</li>
              <li><strong>Psychological Safety &amp; Collective Learning</strong>: the conditions under which errors surface early and dissent is voiced (Edmondson; Project Aristotle).</li>
              <li><strong>Creative Problem Reframing</strong>: recognising when the team is solving the wrong problem (Schön; Dorst).</li>
              <li><strong>Ethical Reasoning in Practice</strong>: feeling the weight of real tradeoffs and navigating them with integrity (Aristotle&rsquo;s phronesis; Rest; AI-ethics applied work).</li>
              <li><strong>Transformative Learning From Experience</strong>: updating prior beliefs in proportion to disconfirming evidence (Flavell; Kolb; Mezirow; Argyris &amp; Schön).</li>
              <li><strong>Human&ndash;AI Collaboration Intelligence</strong>: the calibrated orchestration of AI tooling (Mollick; Dell&rsquo;Acqua et al.&rsquo;s &ldquo;jagged technological frontier&rdquo;).</li>
            </ol>
          </>
        ),
      },
      {
        q: 'Why these dimensions, and not raw coding throughput?',
        a: (
          <>
            These are the traits that separate strong engineers in complex, AI-era work, and the ones standard technical interviews can&rsquo;t see. You can&rsquo;t look them up. They come from real experience and only show up to evaluators who know what to watch for. As AI takes over more of the execution, the human contribution moves toward judgment, synthesis, and collaborative intelligence. Raw throughput is the part AI is replacing fastest.
          </>
        ),
      },
      {
        q: 'How do scores get assigned?',
        a: (
          <>
            Every dimension is scored on a behaviourally-anchored scale. <strong>No dimension scores above 3 without a specific quote from the candidate cited as evidence</strong>, from the Round 1 transcript, the Round 2 reflection, or an observable pattern in the Round 2 trace. Scores rest on what was actually said and done, not on a general impression.
          </>
        ),
      },
    ],
  },

  {
    id: 'for-hirers',
    eyebrow: 'For hirers',
    title: 'Calibration, reports, and integration.',
    items: [
      {
        q: 'How does Basanite calibrate to seniority?',
        a: (
          <>
            Three bands: junior (≈ L3 / 0–3 yrs), mid (≈ L4–L5 / 3–7 yrs), senior (≈ L6+ / 7+ yrs). We don&rsquo;t try to split sub-bands, say L4 from L5, or Staff from Senior Staff. That&rsquo;s a job for the final human round, and we don&rsquo;t claim AI does it well.
          </>
        ),
      },
      {
        q: 'Does Basanite recommend hire / no-hire?',
        a: (
          <>
            No. The decision is yours; we give you better evidence. The hirer report is a briefing for your final human interview: scores backed by quotes, a map of where the candidate has real depth vs surface fluency vs blind spots, and a cheating-risk kept separate from ability.
          </>
        ),
      },
      {
        q: 'Which roles and verticals does Basanite support?',
        a: (
          <>
            25+ representative roles across ten verticals: Consumer Internet &amp; SaaS, Cloud Infrastructure &amp; DevOps, AI / ML / Data, Cybersecurity, Fintech &amp; Financial Services Tech, HealthTech &amp; BioTech, Hardware &amp; Semiconductors, Robotics &amp; Autonomous Systems, Gaming &amp; Interactive Media, and Developer Tools &amp; Languages. Each role and band is its own calibration. The map keeps growing: we add new verticals (quantum software, BCI engineering) and roles (agent-platform engineer) as their markets get big enough to justify dedicated calibration.
          </>
        ),
      },
      {
        q: 'Roles outside that map?',
        a: (
          <>
            Sales, marketing, operations, legal, and executive hiring are out of scope for now. Adding non-technical roles would weaken the technical evaluation. Universities, graduate employers, and training programmes are in scope: their assessment centres cost £500–2,000 per candidate in assessor time, venue, and coordination, and that&rsquo;s the cost Basanite replaces most cleanly.
          </>
        ),
      },
      {
        q: 'Does Basanite integrate with our ATS?',
        a: (
          <>
            Yes. We connect to Greenhouse, Lever, Ashby, Workday, Bullhorn, and 50+ other ATS providers through Merge.dev. Candidates flow into Basanite automatically when they reach a mapped role, and results push back to their ATS record as a structured note plus a link to the full report PDF. Recruiters stay in their ATS.
          </>
        ),
      },
      {
        q: 'How rigorous is the underlying methodology?',
        a: (
          <>
            Round 1 uses a documented set of 22 named techniques across structure, questioning, depth, consistency, anti-cheating, and scoring, including Narrative Anchoring, Boundary Condition Probing, Counterfactual Pressure, Progressive Excavation, Vagueness Targeting, Honest Failure Elicitation, Predict-Your-Own-Error, Narrative Consistency Tracking, Cognitive Priority Testing, Information Gap Injection, AI Output Signal Detection, Cognitive Load Escalation, Latency Awareness, and Tacit Knowledge Consistency Testing. Round 2 adds six sub-dimensions scored from the trace: Delegation Calibration, Prompt Quality and Decomposition, Verification Rigor, Override Judgment, Engineering Taste, and Solution Completeness. Validation (construct, content, concurrent, and predictive) is ongoing and pre-registered.
          </>
        ),
      },
    ],
  },

  {
    id: 'for-candidates',
    eyebrow: 'For candidates',
    title: 'What the experience is like, and what we do with your data.',
    items: [
      {
        q: 'Will I be told what is being evaluated?',
        a: (
          <>
            The methodology is public: the eight dimensions, the design thinking, this page. What we don&rsquo;t reveal during the interview is which question maps to which dimension. If every question were labelled, you could optimise for the score instead of showing the real signal. What we measure is transparent. Which question measures what is not.
          </>
        ),
      },
      {
        q: 'Can I use AI?',
        a: (
          <>
            In Round 1, no: it&rsquo;s a conversation, not a coding task. In Round 2, yes, and it&rsquo;s required. Bring your own tool (Claude Code, Cursor, Copilot, Aider, a local agent). We&rsquo;re testing whether you ship well-judged work with AI in the loop, not whether you can work without it.
          </>
        ),
      },
      {
        q: 'What if I don’t know the answer to a question?',
        a: (
          <>
            Saying &ldquo;I don&rsquo;t know&rdquo; with real awareness is treated differently from a confident but empty answer. We don&rsquo;t penalise honest uncertainty. Research on expert judgment treats knowing the limits of your knowledge as a sign of expertise, not a lack of it.
          </>
        ),
      },
      {
        q: 'Will I get feedback?',
        a: (
          <>
            Yes. Every candidate gets a personal feedback report, whatever the outcome. It&rsquo;s a short, plain-language summary: what you did well, where to develop, and a few concrete suggestions. It&rsquo;s useful without being reverse-engineerable, so you can&rsquo;t use it to game a future Basanite assessment.
          </>
        ),
      },
      {
        q: 'What about my privacy?',
        a: (
          <>
            Before any recording starts, a consent screen tells you what we capture (voice and transcript in Round 1; keystrokes, agent dialogue, git state, and time-on-task in Round 2), where it goes (Anthropic, ElevenLabs, Supabase, all listed on our <a href="/legal/subprocessors" className="underline text-gold-600">sub-processors page</a>), and how long we keep it (recordings 6 months; transcripts and reports 12 months, then deleted automatically). You can access, export, or erase your data any time at <a href="/data-rights" className="underline text-gold-600">basanite.co.uk/data-rights</a>. We don&rsquo;t sell candidate data, and we don&rsquo;t use it to train AI models. Full detail in our <a href="/privacy" className="underline text-gold-600">Privacy Notice</a>.
          </>
        ),
      },
      {
        q: 'Is the interview AI? Can I ask for a human to review my result?',
        a: (
          <>
            Yes. AI conducts and scores the interview. Under UK GDPR Article 22, you have the right not to be subject to a decision made solely by automated processing. A tickbox on the consent screen, and a self-serve form at <a href="/data-rights" className="underline text-gold-600">basanite.co.uk/data-rights</a>, flag your assessment so the hirer must apply human review before acting on the score.
          </>
        ),
      },
    ],
  },
]

// ─── Page ────────────────────────────────────────────────────────────────

// FAQ entries flattened to plain text for FAQPage JSON-LD. Google reads only
// `text` values, so we strip JSX to a single string per answer.
function faqEntriesForSchema() {
  return [
    { question: 'What is Basanite, in one sentence?', answer: 'Basanite tests the technical part of the interview, rebuilt for the AI era. Two rounds measure whether a candidate can do the work, in conversation and at a keyboard next to an AI agent.' },
    { question: 'Why do you say the technical interview is broken?', answer: 'Coding tests turned into a cheating arms race: AI agents and interview-coder overlays let candidates pass take-homes and live screens without the skill the test is meant to check. And the skill that now matters, working effectively with AI, is not measured anywhere.' },
    { question: 'How is this different from coding tests like HackerRank or Codility?', answer: 'Those tests measure how well you solve isolated puzzles under artificial rules. Basanite measures how you ship complete, well-judged work in a real codebase with an AI agent, the way the job is actually done. Round 2 flips the usual anti-cheating stance: instead of blocking AI, we require it and record how you use it.' },
    { question: 'How is this different from AI interview platforms like Maki or HireVue?', answer: 'Most AI interview tools play a fixed set of questions and score the transcript. They do not adapt to what you say, and they cannot tell real ability from good interview prep. Basanite asks each candidate different questions that map to the same underlying skills and rubrics, then adds a second round in a real coding environment that no transcript-only tool can match.' },
    { question: 'How long does the assessment take?', answer: 'Round 1 runs 20 to 30 minutes. Round 2 is timed by seniority: 35 minutes for junior, 60 for mid, 90 for senior, with an optional 120-minute extension for architecture-heavy senior roles. Both rounds end when the signal is clear, not at a fixed question or task count.' },
    { question: 'If AI use is required in Round 2, how do you prevent cheating?', answer: 'We flip the usual approach. "Did they use AI" is no longer a cheating vector: we require it and record it. What is left is someone else doing the work, and we handle that with identity checks at the start, behavioural biometrics compared to a Round 1 baseline, and a random mid-session check-in where the candidate explains a decision they just made.' },
    { question: 'Does Basanite recommend hire or no-hire?', answer: 'No. The decision is yours; we give you better evidence. The hirer report is a briefing for your final human interview.' },
    { question: 'Does Basanite integrate with our ATS?', answer: 'Yes. We connect to Greenhouse, Lever, Ashby, and 50+ other ATS providers through Merge.dev. Candidates flow into Basanite automatically when they reach a mapped role, and results push back to their ATS record.' },
    { question: 'Will I get feedback as a candidate?', answer: 'Yes. Every candidate gets a personal feedback report, whatever the outcome. It is a short, plain-language summary: what you did well, where to develop, and a few concrete suggestions.' },
    { question: 'What about my privacy?', answer: 'Before any recording starts, a consent screen tells you what we capture, where it goes (Anthropic, ElevenLabs, Supabase), and how long we keep it (recordings 6 months; transcripts and reports 12 months, then deleted automatically). You can access, export, or erase your data at any time. We do not sell candidate data and we do not use it to train AI models.' },
    { question: 'Is the interview AI? Can I ask for human review?', answer: 'Yes. AI conducts and scores the interview. Under UK GDPR Article 22 you have the right not to be subject to a decision made solely by automated processing. A tickbox on the consent screen, and a self-serve form, flag your assessment so the hirer must apply human review before acting on the score.' },
  ]
}

export default async function FaqPage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  const ldFaq = faqPageJsonLd(faqEntriesForSchema())
  const ldCrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'FAQ', path: '/faq' },
  ])

  return (
    <div className="min-h-screen bg-earth-50 text-basanite-900">
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldFaq) }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldCrumbs) }}
      />
      <SiteNav />

      {/* Hero: dark stone band, matching the pricing/about pages so the page
          opens with depth rather than flat cream. The section nav lives here,
          styled for the dark surface. */}
      <header className="relative overflow-hidden bg-basanite-900 pt-32 pb-16 px-6">
        <StoneTexture />
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="hero-in">
            <p className="hero-item text-gold-400 text-[11px] font-semibold uppercase tracking-[0.25em] mb-5" style={{ ['--d' as string]: '0ms' }}>
              Questions and answers
            </p>
            <h1 className="hero-item font-display text-earth-50 text-4xl sm:text-5xl md:text-6xl leading-[1.05] mb-6" style={{ ['--d' as string]: '100ms' }}>
              Everything we&rsquo;d expect you to ask.
            </h1>
            <p className="hero-item text-earth-200 text-lg leading-relaxed max-w-2xl mb-10" style={{ ['--d' as string]: '220ms' }}>
              Straight answers on how the two rounds work, what we measure, and what happens to your data. If we&rsquo;ve missed something, book a call at the bottom of the page.
            </p>

            <nav aria-label="FAQ sections" className="hero-item flex flex-wrap gap-2 sm:gap-3" style={{ ['--d' as string]: '340ms' }}>
              {GROUPS.map(g => (
                <a
                  key={g.id}
                  href={`#${g.id}`}
                  className="text-[11px] uppercase tracking-[0.18em] text-earth-200 hover:text-earth-50 border border-earth-50/15 hover:border-gold-400 px-3 py-1.5 transition-colors"
                >
                  {g.eyebrow ?? g.title}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-16 pb-28">
        <div className="space-y-16">
          {GROUPS.map(g => (
            <Reveal as="section" key={g.id} id={g.id} className="scroll-mt-24">
              <div className="mb-6">
                {g.eyebrow && (
                  <p className="text-gold-700 text-[11px] font-semibold uppercase tracking-[0.25em] mb-2">
                    {g.eyebrow}
                  </p>
                )}
                <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 leading-tight">
                  {g.title}
                </h2>
              </div>

              <div className="border-t border-earth-200">
                {g.items.map((item, i) => (
                  <details
                    key={i}
                    className="group border-b border-earth-200 [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="cursor-pointer list-none py-5 flex items-start justify-between gap-6 hover:bg-earth-100/40 transition-colors -mx-3 px-3 border-l-2 border-transparent group-open:border-gold-500">
                      <span className="font-display text-basanite-900 text-base sm:text-lg leading-snug group-open:text-gold-700 transition-colors">
                        {item.q}
                      </span>
                      <span
                        aria-hidden="true"
                        className="shrink-0 mt-1 text-gold-600 transition-transform duration-200 group-open:rotate-45 text-2xl leading-none"
                      >
                        +
                      </span>
                    </summary>
                    <div className="text-basanite-600 text-base leading-relaxed pb-6 pr-10 pl-3 max-w-3xl">
                      {item.a}
                    </div>
                  </details>
                ))}
              </div>
            </Reveal>
          ))}
        </div>

        {/* Closing CTA: dark stone band, echoing the homepage and pricing
            closing sections. */}
        <Reveal as="section" className="mt-20">
          <div className="relative overflow-hidden bg-basanite-900 border border-gold-500/30 p-8 sm:p-10">
            <StoneTexture />
            <div className="relative z-10 flex flex-col sm:flex-row gap-6 sm:gap-10 items-start sm:items-center">
              <div className="flex-1">
                <p className="text-gold-400 text-[10px] font-semibold uppercase tracking-[0.22em] mb-3">Still curious</p>
                <h2 className="font-display text-2xl sm:text-3xl text-earth-50 mb-2">Still have questions?</h2>
                <p className="text-earth-200 text-sm leading-relaxed">
                  Book a 20-minute call with the team, or send us a note through the contact page.
                </p>
              </div>
              <div className="shrink-0 flex flex-col sm:flex-row gap-3">
                <a
                  href="https://cal.eu/basanite/intro"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-center px-6 py-3 bg-gold-500 text-basanite-900 text-sm font-semibold hover:bg-gold-400 transition-colors"
                >
                  Book a call
                </a>
                <Link
                  href="/contact"
                  className="inline-block text-center px-6 py-3 border border-earth-50/25 text-earth-50 text-sm font-medium hover:border-gold-400 transition-colors"
                >
                  Contact us
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </main>

      <FaqFooter />
    </div>
  )
}


function FaqFooter() {
  return (
    <footer className="border-t border-earth-200 bg-white">
      <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-basanite-500">
        <p>&copy; {new Date().getFullYear()} Basanite.</p>
        <div className="flex items-center gap-5">
          <Link href="/" className="hover:text-basanite-900 transition-colors">Home</Link>
          <Link href="/#research" className="hover:text-basanite-900 transition-colors">Research</Link>
          <Link href="/login" className="hover:text-basanite-900 transition-colors">Sign in</Link>
        </div>
      </div>
    </footer>
  )
}
