// FAQ — questions and answers grounded in Basanite Product Overview V2.1.
//
// Structure: five categories, ~22 questions. Each <details> is server-rendered
// HTML so expand/collapse needs zero JavaScript. Section anchors (#product,
// #assessment, #dimensions, #for-hirers, #for-candidates) make URLs shareable.
//
// Source-of-truth: every claim below ties back to a section of V2.1. Anything
// drift-y or unsupported should be flagged in code review.

import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { LogoMark } from '@/components/Logo'

export const metadata: Metadata = { title: 'FAQ' }

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
            Basanite is the technical layer of the interview, rebuilt for the AI era. We run a two-round assessment that measures whether a candidate can actually do the work — both in conversation and at a keyboard, alongside an AI agent.
          </>
        ),
      },
      {
        q: 'Why do you say the technical interview is broken?',
        a: (
          <>
            Two breakdowns crystallised over the past 24 months. Coding tests have collapsed into a cheating arms race: capable AI agents and &ldquo;interview-coder&rdquo; overlays make take-homes and live-coding screens trivial to pass without exercising the underlying skill. And the capability that <em>does</em> matter — engineering effectiveness in an AI-augmented workflow — isn&rsquo;t measured anywhere. Banning AI from the interview selects for unaided coding while leaving the AI-orchestration skill entirely untested.
          </>
        ),
      },
      {
        q: 'What is Basanite *not*?',
        a: (
          <>
            Basanite addresses the technical layer of the interview only. Psychometric assessment (personality structure, motivational profile) and culture-fit / values-alignment evaluation are explicitly out of scope. They&rsquo;re different problems with different evidentiary bases, regulatory surfaces, and commercial dynamics — bundling them in would dilute the rigor of each. We may revisit them as separate product lines once the technical layer is at production quality.
          </>
        ),
      },
      {
        q: 'How is this different from coding tests like HackerRank or Codility?',
        a: (
          <>
            Conventional coding tests measure how well a candidate solves isolated puzzles under artificial constraints. Basanite measures how a candidate ships calibrated, complete work in a real codebase, alongside an AI agent — the way the actual job is done. Round 2 deliberately inverts the standard anti-cheating posture: rather than preventing AI use, we require and instrument it.
          </>
        ),
      },
      {
        q: 'How is this different from AI interview platforms like Maki or HireVue?',
        a: (
          <>
            Existing AI interview tools deliver pre-configured question sequences and score the transcript. They don&rsquo;t adapt follow-ups based on what the candidate actually says, and they have no mechanism for distinguishing genuine capability from interview preparedness. Basanite uses Construct-Templated Adaptive Interviewing: different questions per candidate, identical underlying constructs and scoring rubrics — plus a second round in a real coding environment that no transcript-based tool can replicate.
          </>
        ),
      },
    ],
  },

  {
    id: 'assessment',
    eyebrow: 'The two-round assessment',
    title: 'How the interview itself works.',
    items: [
      {
        q: 'How long does the assessment take?',
        a: (
          <>
            Round 1 (conversational) typically runs 20–30 minutes. Round 2 (AI Collaboration Workbench) is time-boxed by seniority: 35 minutes for junior, 60 for mid, 90 for senior, with an optional 120-minute extension for architecture-heavy senior roles. Both rounds terminate on signal saturation, not question or task count.
          </>
        ),
      },
      {
        q: 'What is Round 1?',
        a: (
          <>
            A structured conversational assessment. Basanite asks adaptive, CV-grounded questions and follows up on vagueness, gaps, and unsupported claims. It generates signal across the cognitive, judgmental, and tacit-knowledge dimensions — the things that surface through narrative.
          </>
        ),
      },
      {
        q: 'What is Round 2?',
        a: (
          <>
            The AI Collaboration Workbench. We provision the candidate with a sandboxed VS Code environment, a multi-thousand-line role-matched codebase, a real ticket calibrated to their seniority, and their choice of AI coding agent. We instrument keystrokes, agent prompts, git state, and verification behaviour. After the timed session, a 10-minute reflection conversation cross-references what the candidate <em>did</em> against what they understood themselves to be doing.
          </>
        ),
      },
      {
        q: 'Which AI coding agent can a candidate use?',
        a: (
          <>
            The candidate&rsquo;s choice — Claude Code, Cursor, Copilot, Aider, or a local CLI agent. Basanite is tooling-agnostic. Forcing candidates into a custom UI distorts the signal; we let them work the way they actually work.
          </>
        ),
      },
      {
        q: 'What does the codebase look like? Is it a toy?',
        a: (
          <>
            It&rsquo;s not a toy. It&rsquo;s a multi-thousand-line synthetic project calibrated to the target vertical and seniority — a SaaS codebase for backend SaaS roles, an agentic-systems codebase with retrieval and evaluation harnesses for applied-AI roles, a security-engineering codebase with seeded vulnerabilities for security roles. Tickets are written in the style and granularity the candidate would receive on day one, with deliberate under-specification at senior bands so the candidate has to scope and (sometimes) negotiate with a simulated requester.
          </>
        ),
      },
      {
        q: 'If AI use is required in Round 2, how do you prevent cheating?',
        a: (
          <>
            We invert the standard posture. The &ldquo;did the candidate use AI&rdquo; cheating vector is gone — we require it and we instrument it. The risks that remain (a third party operating the candidate&rsquo;s machine, someone else completing the session) are addressed through identity verification at session start, behavioural biometrics sampled across the session and compared against a Round 1 baseline, and a randomised in-session check-in where the candidate is asked mid-session to explain a specific decision they just made. Genuine candidates explain fluently from working memory; substituted operators don&rsquo;t.
          </>
        ),
      },
      {
        q: 'What does Round 2 deliberately *not* measure?',
        a: (
          <>
            Round 2 is not an algorithmic-puzzle test in disguise. The codebase contains no LeetCode-style problems. Tickets are routine engineering tasks — the kind of work the candidate would do every day in the role. The point isn&rsquo;t whether the candidate can solve a hard, isolated problem under artificial constraints; it&rsquo;s whether they can ship calibrated, complete work the way the actual job is done. We also don&rsquo;t test whether the candidate uses AI &ldquo;more&rdquo; or &ldquo;less&rdquo; — the target is <em>judicious</em> use, calibrated to where the agent helps and where it doesn&rsquo;t.
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
              Each dimension has a formal construct definition, intellectual provenance, and an empirical reference list. They draw from cognitive science, philosophy of knowledge, behavioural decision theory, organisational psychology, and the emerging human–AI collaboration literature.
            </p>
            <ol className="list-decimal pl-5 space-y-2 marker:text-gold-600">
              <li><strong>Judgment Under Ambiguity</strong> — committing to a defensible course of action when information is incomplete (Knight; Tetlock).</li>
              <li><strong>Tacit-Knowledge Articulation</strong> — surfacing knowledge that lives in practice rather than in text (Polanyi; Nonaka & Takeuchi; Collins).</li>
              <li><strong>Intuition Under Data Scarcity</strong> — recognition-primed judgment that distinguishes real expertise from vocabulary (Klein; Dreyfus & Dreyfus; Kahneman & Klein).</li>
              <li><strong>Psychological Safety & Collective Learning</strong> — the conditions under which errors surface early and dissent is voiced (Edmondson; Project Aristotle).</li>
              <li><strong>Creative Problem Reframing</strong> — recognising when the team is solving the wrong problem (Schön; Dorst).</li>
              <li><strong>Ethical Reasoning in Practice</strong> — feeling the weight of real tradeoffs and navigating them with integrity (Aristotle&rsquo;s phronesis; Rest; AI-ethics applied work).</li>
              <li><strong>Transformative Learning From Experience</strong> — updating prior beliefs in proportion to disconfirming evidence (Flavell; Kolb; Mezirow; Argyris & Schön).</li>
              <li><strong>Human–AI Collaboration Intelligence</strong> — the calibrated orchestration of AI tooling (Mollick; Dell&rsquo;Acqua et al.&rsquo;s &ldquo;jagged technological frontier&rdquo;).</li>
            </ol>
          </>
        ),
      },
      {
        q: 'Why these dimensions, and not raw coding throughput?',
        a: (
          <>
            These are the qualities that distinguish high performers in complex, AI-era engineering work — and the ones conventional technical-interview instruments structurally cannot detect. They cannot be retrieved from a knowledge base. They are forged through real experience and legible only to evaluators who know what to look for. As AI handles more execution-layer tasks, the residual human contribution shifts toward judgment, synthesis, and collaborative intelligence; raw throughput is the skill AI is replacing fastest.
          </>
        ),
      },
      {
        q: 'How do scores get assigned?',
        a: (
          <>
            Every dimension is scored against a behaviourally-anchored rating scale. <strong>No dimension may receive a score above 3 without a specific verbatim statement from the candidate cited as evidence</strong>, drawn either from the Round 1 transcript or the Round 2 reflection conversation, or from observable patterns in the Round 2 trace. Scores are grounded in what was actually said and done, not overall impression.
          </>
        ),
      },
    ],
  },

  {
    id: 'for-hirers',
    eyebrow: 'For hirers',
    title: 'Configuration, calibration, and what the report contains.',
    items: [
      {
        q: 'How does Basanite calibrate to seniority?',
        a: (
          <>
            We use a three-band model — junior (≈ L3 / 0–3 yrs), mid (≈ L4–L5 / 3–7 yrs), senior (≈ L6+ / 7+ yrs). The same role at different bands weights the eight dimensions differently and uses a different sandbox library. Sub-band calibration (distinguishing L4 from L5, or Staff from Senior Staff) is deliberately out of scope — that&rsquo;s a final-round human responsibility, and we don&rsquo;t claim AI can do it well.
          </>
        ),
      },
      {
        q: 'Does Basanite recommend hire / no-hire?',
        a: (
          <>
            No. We produce evidence; the human interviewer makes the decision. The hirer report is designed as a briefing document for the final human-led interview: dimension-by-dimension scores grounded in candidate quotes, a technical capability map (areas of demonstrated depth vs surface fluency vs blind spots), and a cheating-risk assessment scored independently of capability.
          </>
        ),
      },
      {
        q: 'What does the hirer report look like?',
        a: (
          <>
            A composite document integrating both rounds. Where the rounds agree, the signal is reinforced. Where they disagree — a candidate who articulates strong principles in Round 1 but ships sloppily in Round 2, or vice versa — the disagreement is itself flagged for the human interviewer to probe. The report explicitly identifies cross-round discrepancies and recommends interview directions to resolve them.
          </>
        ),
      },
      {
        q: 'Which roles and verticals does Basanite support?',
        a: (
          <>
            We calibrate for 25+ representative roles across nine verticals: Consumer Internet & SaaS, Cloud Infrastructure & DevOps, AI / ML / Data, Cybersecurity, Fintech & Financial Services Tech, HealthTech & BioTech, Hardware & Semiconductors, Robotics & Autonomous Systems, Gaming & Interactive Media, and Developer Tools & Languages. Each role × seniority band is a distinct calibration profile. The map is a living artifact — new verticals (e.g. quantum software, BCI engineering) and new roles (e.g. agent-platform engineer) are added as their job markets reach the volume threshold at which dedicated calibration is justified.
          </>
        ),
      },
      {
        q: 'Roles outside that map?',
        a: (
          <>
            Sales, marketing, operations, legal, and executive hiring are out of scope at this stage. Bundling non-technical roles into a technical-evaluation product would dilute the rigor of both. Universities, graduate employers, and professional training programmes are in scope — their assessment-centre infrastructure (£500–2,000 per candidate in assessor time, venue, coordination) is the cost surface Basanite displaces most cleanly.
          </>
        ),
      },
      {
        q: 'Does Basanite integrate with our ATS?',
        a: (
          <>
            Yes. We connect to Greenhouse, Lever, Ashby, and 50+ other ATS providers via Merge.dev. Candidates flow into Basanite assessments automatically as they enter a mapped role, and results push back to the candidate&rsquo;s ATS record as a structured note plus a link to the full report PDF. Recruiters never have to leave their ATS.
          </>
        ),
      },
      {
        q: 'How is pricing structured?',
        a: (
          <>
            Tier-based, with the commercial argument shaped to your pipeline. For high-volume technical recruiters running 30–40+ technical hires per year, the displacement maths is clean: one Basanite deployment can replace the screening and first-round assessment work of one to three full-time recruiters. For SMEs without dedicated talent functions, pricing is structured as infrastructure rather than labour substitution — you get the evaluation sophistication of a much larger company at a fraction of the cost of hiring a Head of Talent. Specific rates are agreed per engagement; reach out via the waitlist to start that conversation.
          </>
        ),
      },
      {
        q: 'How rigorous is the underlying methodology?',
        a: (
          <>
            Round 1 deploys a documented inventory of structural, questioning, depth, consistency, anti-cheating, and scoring techniques — 22 named methods including Narrative Anchoring, Boundary Condition Probing, Counterfactual Pressure, Progressive Excavation, Vagueness Targeting, Honest Failure Elicitation, Predict-Your-Own-Error, Narrative Consistency Tracking, Cognitive Priority Testing, Information Gap Injection, AI Output Signal Detection, Cognitive Load Escalation, Latency Awareness, and Tacit Knowledge Consistency Testing. Round 2 adds six observable sub-dimensions scored from the trace: Delegation Calibration, Prompt Quality and Decomposition, Verification Rigor, Override Judgment, Engineering Taste, and Solution Completeness. Validation work — construct, content, concurrent, and predictive — is ongoing and pre-registered.
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
            The methodology is openly documented. The eight dimensions, the design philosophy, this FAQ — all public. What we don&rsquo;t disclose during the interview itself is which specific question maps to which dimension. That&rsquo;s a structural opacity choice: if every question were tagged, candidates could optimise their performance toward the score rather than toward the underlying signal. <em>What</em> is being measured is transparent; <em>which question is measuring what</em> is concealed.
          </>
        ),
      },
      {
        q: 'Can I use AI?',
        a: (
          <>
            In Round 1, no — Round 1 is a conversation, not a coding task. In Round 2, yes — required. Bring your tool of choice (Claude Code, Cursor, Copilot, Aider, local agent). We&rsquo;re testing whether you ship calibrated work with AI in the loop, not whether you can avoid AI.
          </>
        ),
      },
      {
        q: 'What if I don’t know something?',
        a: (
          <>
            Saying &ldquo;I don&rsquo;t know&rdquo; with genuine awareness is treated differently from a confident but hollow answer. Basanite doesn&rsquo;t penalise candidates for acknowledging uncertainty — the literature on calibrated expert judgment treats appropriate uncertainty as evidence of genuine expertise, not its absence.
          </>
        ),
      },
      {
        q: 'Will I get feedback?',
        a: (
          <>
            Every candidate receives a personal feedback report regardless of outcome. It&rsquo;s a brief, neutral plain-language summary: what you demonstrated well, areas for development, constructive suggestions. It&rsquo;s deliberately designed to be useful without being reverse-engineerable — you can&rsquo;t use it to game a future Basanite assessment.
          </>
        ),
      },
      {
        q: 'What about my privacy?',
        a: (
          <>
            Before any recording starts you&rsquo;ll see a consent screen explaining what we capture (voice and transcript in Round 1; keystrokes, agent dialogue, git state, and time-on-task in Round 2), where it goes (Anthropic, ElevenLabs, Supabase — listed in full on our <a href="/legal/subprocessors" className="underline text-gold-600">sub-processors page</a>), and how long it&rsquo;s kept (recordings 6 months, transcripts and reports 12 months, then automatically deleted). You can access, export, or erase your data at any time at <a href="/data-rights" className="underline text-gold-600">basanite.co.uk/data-rights</a>. We don&rsquo;t sell candidate data and we don&rsquo;t use it to train AI models. Full details in our <a href="/privacy" className="underline text-gold-600">Privacy Notice</a>.
          </>
        ),
      },
      {
        q: 'Is the interview AI? Can I ask for a human to review my result?',
        a: (
          <>
            Yes — the interview is conducted and scored by AI. Under UK GDPR Article 22 you have the right not to be subject to a decision based solely on automated processing. There&rsquo;s a tickbox on the consent screen before the interview, and a self-serve form at <a href="/data-rights" className="underline text-gold-600">basanite.co.uk/data-rights</a>, that flags your assessment so the hirer must apply human review before acting on the score.
          </>
        ),
      },
    ],
  },
]

// ─── Page ────────────────────────────────────────────────────────────────

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-earth-50 text-basanite-900">
      <FaqNav />

      <main className="max-w-4xl mx-auto px-6 pt-24 pb-32">
        <header className="mb-16">
          <p className="text-gold-700 text-[11px] font-semibold uppercase tracking-[0.25em] mb-4">
            Questions and answers
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[1.1] mb-6">
            Everything we&rsquo;d expect you to ask.
          </h1>
          <p className="text-basanite-600 text-lg leading-relaxed max-w-2xl">
            Grounded in our latest product overview. If we&rsquo;ve missed something, the founder&rsquo;s inbox is open — see the bottom of this page.
          </p>

          <nav aria-label="FAQ sections" className="mt-10 flex flex-wrap gap-2 sm:gap-3">
            {GROUPS.map(g => (
              <a
                key={g.id}
                href={`#${g.id}`}
                className="text-xs uppercase tracking-[0.18em] text-basanite-700 hover:text-basanite-900 border border-earth-200 hover:border-gold-500 px-3 py-1.5 transition-colors"
              >
                {g.eyebrow ?? g.title}
              </a>
            ))}
          </nav>
        </header>

        <div className="space-y-20">
          {GROUPS.map(g => (
            <section key={g.id} id={g.id} className="scroll-mt-24">
              <div className="mb-8">
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
                    <summary className="cursor-pointer list-none py-5 flex items-start justify-between gap-6 hover:bg-earth-100/40 transition-colors -mx-3 px-3">
                      <span className="font-display text-basanite-900 text-base sm:text-lg leading-snug">
                        {item.q}
                      </span>
                      <span
                        aria-hidden="true"
                        className="shrink-0 mt-1 text-gold-600 transition-transform duration-200 group-open:rotate-45 text-2xl leading-none"
                      >
                        +
                      </span>
                    </summary>
                    <div className="text-basanite-600 text-base leading-relaxed pb-6 pr-10 max-w-3xl">
                      {item.a}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Closing nudge */}
        <section className="mt-24 border-t border-earth-200 pt-12 text-center">
          <h2 className="font-display text-2xl text-basanite-900 mb-3">
            Still have questions?
          </h2>
          <p className="text-basanite-600 text-base mb-6 max-w-xl mx-auto">
            Drop your details and we&rsquo;ll be in touch.
          </p>
          <Link
            href="/#request-access"
            className="inline-block px-6 py-3 bg-basanite-900 text-white text-sm font-medium hover:bg-gold-600 transition-colors"
          >
            Request access
          </Link>
        </section>
      </main>

      <FaqFooter />
    </div>
  )
}

// ─── Slim nav (logo + back-to-home + sign-in) ─────────────────────────────

function FaqNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-earth-50/85 backdrop-blur-md border-b border-earth-200/60">
      <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark size={26} dark />
          <span className="font-display text-basanite-900 text-lg">Basanite</span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-5 text-sm text-basanite-600">
          <Link href="/#how-it-works" className="hidden sm:inline hover:text-basanite-900 transition-colors">
            How it works
          </Link>
          <Link href="/#research" className="hidden sm:inline hover:text-basanite-900 transition-colors">
            Research
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-basanite-900 border border-basanite-900 px-4 py-2 hover:bg-basanite-900 hover:text-earth-50 transition-colors duration-200"
          >
            Sign in
          </Link>
        </div>
      </div>
    </nav>
  )
}

function FaqFooter() {
  return (
    <footer className="border-t border-earth-200 bg-white">
      <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-basanite-500">
        <p>Built in Manchester by Drew, Lynn and Aditya.</p>
        <div className="flex items-center gap-5">
          <Link href="/" className="hover:text-basanite-900 transition-colors">Home</Link>
          <Link href="/#research" className="hover:text-basanite-900 transition-colors">Research</Link>
          <Link href="/login" className="hover:text-basanite-900 transition-colors">Sign in</Link>
        </div>
      </div>
    </footer>
  )
}
