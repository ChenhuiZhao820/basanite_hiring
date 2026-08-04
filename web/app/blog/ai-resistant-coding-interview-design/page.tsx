import type { Metadata } from 'next'
import Link from 'next/link'
import { buildMetadata } from '@/lib/seo'
import ArticleLayout from '../_components/ArticleLayout'

const TITLE = 'Designing an AI-Resistant Coding Interview (That Still Tests Real Skill)'
const DESCRIPTION =
  'There are exactly two stable equilibria for a 2026 coding interview: questions that an AI cannot help with, or questions where AI use is required and instrumented. Everything in between is a slow-motion failure.'
const SLUG = 'ai-resistant-coding-interview-design'
const DATE_PUBLISHED = '2026-05-09'

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: `/blog/${SLUG}`,
  keywords: [
    'AI resistant coding interview',
    'interview design 2026',
    'coding interview AI cheating',
    'AI Collaboration Workbench',
    'CV grounded interview',
    'technical interview design',
    'structured interview',
  ],
})

export default function Page() {
  return (
    <ArticleLayout
      title={TITLE}
      description={DESCRIPTION}
      datePublished={DATE_PUBLISHED}
      slug={SLUG}
      author="Lynn Zhao"
    >
      <p>
        The right way to think about designing a coding interview in 2026 is to start from the cheating equilibrium and work backwards. Every coding interview question sits somewhere on a spectrum from “an LLM can answer this perfectly with no human help” to “an LLM cannot meaningfully help with this at all.” Where your question sits on that spectrum is the single most important design decision. Almost everything else — proctoring, time limits, language choice — is downstream of it.
      </p>

      <h2>The spectrum</h2>

      <p>
        Map a few canonical interview formats against the spectrum:
      </p>

      <ul>
        <li>
          <strong>LeetCode algorithmic puzzle, two-hour take-home.</strong> Cheating cost: near zero. The candidate pastes the problem into an agent and gets a working, tested solution back in three minutes. The format produces functionally no signal in 2026.
        </li>
        <li>
          <strong>LeetCode-style problem, live screen-shared, AI use forbidden.</strong> Cheating cost: a £60/month Cluely subscription and 90 minutes of practice. Detection rate against current overlay tooling is single-digit. The format produces some signal, but the signal is dominated by which candidates are willing to cheat rather than which candidates can solve the problem.
        </li>
        <li>
          <strong>System-design interview, live conversation.</strong> Cheating cost: moderate. A candidate using a voice overlay can produce structured responses, but the conversational latency and the inability to maintain consistency across follow-ups gives the game away with a competent interviewer. Signal: high, when run by a skilled interviewer; lower when run by a generalist recruiter.
        </li>
        <li>
          <strong>Behavioural interview about past projects.</strong> Cheating cost: high. An LLM has no privileged access to what the candidate actually did. The candidate would have to fabricate a coherent narrative under real-time follow-up pressure, which most candidates cannot do convincingly. Signal: high when probed properly.
        </li>
        <li>
          <strong>Live coding against a real repo, AI use required and instrumented.</strong> Cheating cost: not applicable — there is no cheating because AI use is the point. Signal: high, because what you are measuring is exactly the skill the candidate would use on the job.
        </li>
        <li>
          <strong>In-person whiteboard, company office.</strong> Cheating cost: prohibitive. Signal: high, but with significant collateral cost (geographic exclusion, bias toward candidates who present well at whiteboards).
        </li>
      </ul>

      <p>
        Two formats produce reliable signal in the current environment: the AI-required instrumented coding task and the in-person whiteboard. They sit at opposite ends of the spectrum but they are both stable. Everything in between is decaying.
      </p>

      <h2>Equilibrium A: AI use is structurally impossible</h2>

      <p>
        In-person interviews at a company office still work. The cost is high enough that they will never be the dominant filter in the funnel, but for final-round senior hires they are a reasonable choice. The design considerations are well-understood and haven’t changed in 30 years — whiteboard hygiene, calibration across panels, structured rubrics, consistent question banks.
      </p>

      <p>
        The interesting development is that some companies that publicly committed to remote-first hiring two years ago have quietly walked the policy back specifically for final rounds. The driver is exactly the cheating wave we wrote about in <Link href="/blog/ai-cheating-in-technical-interviews">our piece on AI cheating in interviews</Link>. It is rational, but it has real costs: the strongest remote candidates often decline to fly for a final round, and the cohort that does fly skews toward people who live near hubs or who can take an unpaid travel day.
      </p>

      <p>
        For most companies, equilibrium A is a final-round design at best. It does not scale to early-funnel triage.
      </p>

      <h2>Equilibrium B: AI use is required and instrumented</h2>

      <p>
        The interesting design space is equilibrium B. The premise is that you stop trying to prevent AI use and start measuring AI orchestration directly. Done well, this produces a richer signal than any unaided coding test ever did, because what you are measuring is exactly what the candidate will be doing on the job.
      </p>

      <p>
        The four design properties that distinguish a well-built AI-required interview from a poorly-built one:
      </p>

      <h3>Real codebase, not a toy</h3>

      <p>
        Toy problems are the wrong test bed. A candidate working in a 50-line file with no surrounding context can solve almost anything. The skill that matters on the job is operating inside a multi-thousand-line repo where the code has existing patterns, the database schema is fixed, the deployment is constrained, and the change has to land cleanly inside a real engineering culture.
      </p>

      <p>
        The minimum size for a useful candidate codebase is somewhere around 3,000–10,000 lines. Below that, the candidate is essentially writing greenfield code, which is the easiest setting for an agent to operate in. Above that, the candidate has to do real archaeology — read the existing patterns, find the right place to make the change, anticipate what they might break.
      </p>

      <p>
        The codebase should be representative of the kind of work the candidate will do. A backend SaaS role gets a SaaS-shaped codebase. An applied-AI role gets a codebase with retrieval, prompt orchestration, and evaluation infrastructure. A security role gets a codebase with deliberately seeded vulnerabilities of varying realism. Generic templates produce generic signal.
      </p>

      <h3>Real ticket, with deliberate under-specification</h3>

      <p>
        The ticket the candidate works on should look like a real ticket, not a problem statement. Real tickets have ambiguity. Real tickets reference past decisions you have to discover. Real tickets sometimes specify the wrong thing and require the engineer to push back on the requester.
      </p>

      <p>
        Junior tickets should be well-specified but technically substantive. Mid-level tickets should have specification gaps the candidate has to fill in. Senior tickets should be under-specified enough that the candidate has to scope the work themselves — and sometimes negotiate with a simulated requester to clarify the actual goal.
      </p>

      <p>
        The under-specification matters because it is one of the dimensions on which an over-confident agent fails most visibly. A candidate who pastes the ticket into Claude Code without scoping it themselves will get a confident, plausible, and often wrong solution. A candidate who scopes the work first, then delegates the implementation, gets a much better result. The difference is one of the most diagnostic signals in the entire interview.
      </p>

      <h3>Instrumentation that captures decision behaviour, not just keystrokes</h3>

      <p>
        Keystroke logging is the easy part. The signal you want is upstream: what did the candidate prompt the agent with, what did they accept, what did they reject, where did they override, and what did they verify before declaring the task done.
      </p>

      <p>
        At Basanite we capture six sub-dimensions from the round-two trace: Delegation Calibration (do they delegate the right things), Prompt Quality and Decomposition (how cleanly do they break the task down), Verification Rigor (do they actually test what they ship), Override Judgment (when do they trust the agent vs override it), Engineering Taste (do their choices fit the codebase), and Solution Completeness (do they ship something that runs, or just something that compiles). Other reasonable people will draw the lines differently. The principle is that you need the prompts and the override behaviour, not just the final code.
      </p>

      <p>
        Some practical instrumentation tips. Capture the candidate’s agent prompts at the system level rather than the application level, because different agents store prompt history differently and you want a uniform record. Snapshot git state every 30 seconds so you can reconstruct the chronology of the work. Optionally record voice if the candidate is narrating; many candidates do this without prompting, and the narration is highly diagnostic.
      </p>

      <h3>Post-task reflection conversation</h3>

      <p>
        The most important load-bearing piece of the design is the reflection conversation that happens after the timed task. Ten minutes, voice or video. The interviewer (or AI interviewer) picks two or three specific decisions visible in the trace and asks the candidate to explain why they made them.
      </p>

      <p>
        Genuine candidates explain fluently from working memory. They reference specific lines of code, recall what the agent suggested before they overrode it, and have a coherent story about why they made the trade-off they made. Substitute operators — someone else doing the task on the candidate’s behalf — cannot reproduce this. They pause. They hedge. Their answers don’t match the trace. We covered this and related anti-substitution controls in <Link href="/blog/how-to-stop-candidates-cheating-with-ai">the anti-cheating playbook</Link>.
      </p>

      <p>
        The reflection conversation is also where the deepest dimensional signal emerges. A candidate explaining a decision is producing exactly the kind of narrative that surfaces tacit knowledge, calibration, and self-awareness. It is also where you catch the cases where the work is technically correct but the candidate doesn’t actually understand why — increasingly common when candidates over-delegate to the agent.
      </p>

      <h2>The conversational round you also need</h2>

      <p>
        An instrumented coding task on its own is not a complete interview. It tells you whether the candidate can ship work alongside an agent. It doesn’t tell you whether they can hold a coherent technical conversation, surface tacit knowledge, exercise judgment under ambiguity, or reason ethically about technical decisions.
      </p>

      <p>
        For that you need a conversational round. The conversational round is also where the cheating-resistance property comes from a structurally different place — not from the difficulty of using an LLM, but from the difficulty of using one in real time under follow-up pressure. We have a full piece on this in <Link href="/blog/cv-grounded-interviews">CV-grounded interviews</Link>.
      </p>

      <p>
        Together, the conversational round and the AI-required coding round form what we call a two-round assessment. The two rounds measure different things, surface different signals, and catch different failure modes. The combined signal is much higher than either round alone.
      </p>

      <h2>What not to do</h2>

      <p>
        A few designs we see teams reach for that do not survive:
      </p>

      <ul>
        <li>
          <strong>Coding tests on a vendor platform with “AI detection” enabled.</strong> The detection layer does not work against current overlay tooling. We benchmarked the major vendors in <Link href="/blog/interview-coder-detection">our piece on interview-coder detection</Link>.
        </li>
        <li>
          <strong>Take-home with mandatory video recording and pledge.</strong> Pledges work in communities with strong norms and skin in the game. Anonymous candidates competing for a job don’t satisfy either condition.
        </li>
        <li>
          <strong>Algorithm puzzles that are “designed to be too hard for AI.”</strong> They are not. LeetCode-style problems are the single easiest category of question for current LLMs. Picking a “hard” one does not change the equilibrium.
        </li>
        <li>
          <strong>Forcing candidates into a custom IDE that blocks LLM access.</strong> First, you cannot reliably block it — anything running on the candidate’s machine can be circumvented. Second, the candidate who would succeed with their own tooling is now being measured on whether they can perform in unfamiliar tooling, which is the wrong test.
        </li>
        <li>
          <strong>Pair-programming interviews with a senior engineer over Zoom.</strong> Mostly still work, but expensive (£80–150 per candidate-hour in interviewer time) and you can run far fewer of them than the funnel needs.
        </li>
      </ul>

      <h2>Calibrating across candidates</h2>

      <p>
        One concern that often comes up: if every candidate gets a slightly different question (because the CV-grounded round produces unique questions, and the coding round uses a different ticket against the same codebase), how do you calibrate scores across candidates?
      </p>

      <p>
        The answer is that you score the construct, not the question. The questions vary; the rubric does not. A behaviourally-anchored rating scale defines what a 1, 3, or 5 looks like on each dimension. Two candidates being asked different questions are still scored against the same rubric, by the same scoring function, with the same evidentiary requirements (we require a verbatim quote from the candidate to support any score above 3 on any dimension). The comparison is fair even when the surface stimulus differs.
      </p>

      <p>
        This is the same principle that structured behavioural interviewing has always used — Schmidt and Hunter’s meta-analyses on structured interviewing are clear that the structure lives in the rubric, not in the surface questions. We dug into the underlying research in <Link href="/blog/structured-interview-fairness-ai-era">our piece on structured interviews in the AI era</Link>.
      </p>

      <h2>The summary table</h2>

      <p>
        For a hiring manager looking at this for the first time, here is the compressed version. The four design properties that distinguish a serious 2026 coding interview from a theatre piece:
      </p>

      <ol>
        <li>The candidate works in a real codebase, not a toy problem.</li>
        <li>The ticket has under-specification appropriate to the seniority band.</li>
        <li>AI use is required and instrumented at the system level.</li>
        <li>A reflection conversation cross-references decisions visible in the trace.</li>
      </ol>

      <p>
        Pair that round with a structured conversational round that probes the candidate’s actual past work, and you have a defensible assessment that doesn’t collapse on contact with current cheating tooling.
      </p>

      <p>
        The version we have built is documented in our <Link href="/faq">FAQ</Link> and compared against the major coding-test vendors in <Link href="/compare/hackerrank-vs-basanite">HackerRank vs Basanite</Link> and <Link href="/compare/codesignal-vs-basanite">CodeSignal vs Basanite</Link>. The version you build yourself can look different. The four design properties above are the load-bearing ones.
      </p>
    </ArticleLayout>
  )
}
