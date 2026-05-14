import type { Metadata } from 'next'
import Link from 'next/link'
import { buildMetadata } from '@/lib/seo'
import ArticleLayout from '../_components/ArticleLayout'

const TITLE = 'Hiring Engineers Who Can Actually Use AI: The New Core Skill'
const DESCRIPTION =
  'Harvard and BCG ran 758 consultants through GPT-4. The ones who used it well outperformed the ones who used it badly by a wider margin than the average performance gap between consultants. No mainstream interview measures this skill.'
const SLUG = 'hiring-engineers-who-can-use-ai'
const DATE_PUBLISHED = '2026-05-07'

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: `/blog/${SLUG}`,
  keywords: [
    'hiring engineers AI skill',
    'AI orchestration interview',
    'jagged frontier',
    'BCG GPT-4 study',
    'AI productivity engineering',
    'measuring AI use',
    'human-AI collaboration',
  ],
})

export default function Page() {
  return (
    <ArticleLayout
      title={TITLE}
      description={DESCRIPTION}
      datePublished={DATE_PUBLISHED}
      slug={SLUG}
      author="Aditya Shah"
    >
      <p>
        In September 2023, Harvard Business School, MIT Sloan, Wharton, and the Boston Consulting Group ran one of the cleanest experiments published to date on what happens when knowledge workers are given access to generative AI. Seven hundred and fifty-eight BCG consultants were randomised into three groups: a control group with no AI access, a group given GPT-4 with a brief tutorial, and a group given GPT-4 with no tutorial. They were asked to complete 18 realistic consulting tasks.
      </p>

      <p>
        The headline finding got circulated widely: consultants with GPT-4 were 25.1% faster and produced 40% higher-quality output on tasks where AI helped. But the more interesting finding, buried deeper in the paper, was about the variance between consultants. Among the AI-enabled group, the gap between the most effective and least effective use of GPT-4 was wider than the gap between the strongest and weakest consultants in the control condition. The AI did not raise everyone equally. It magnified existing differences, and it created new ones based on how well each person could orchestrate the tool.
      </p>

      <p>
        Dell’Acqua and his co-authors called this region the “jagged technological frontier.” The frontier is the irregular boundary between tasks where current AI helps and tasks where it doesn’t. The skill of operating on that frontier — knowing when to trust the model, when to verify, when to override — turns out to be the largest source of variance in AI-augmented work. And no mainstream technical interview measures it.
      </p>

      <h2>What the study actually said</h2>

      <p>
        The granular findings are worth understanding because they shape what an interview ought to measure.
      </p>

      <p>
        On tasks <em>inside</em> the frontier — tasks the model could meaningfully help with — consultants using GPT-4 produced output 40% higher in quality. The effect was largest for below-average consultants: the model lifted them more, because they had more room to grow. This is the “levelling-up” effect that gets cited in every AI-productivity argument.
      </p>

      <p>
        On tasks <em>outside</em> the frontier — tasks where the model produced confident, plausible, but subtly wrong answers — consultants using GPT-4 were <em>19 percentage points more likely</em> to produce wrong answers than the control group. The model didn’t just fail to help; it actively misled them. The effect was strongest for above-average consultants, who tended to trust the model where they shouldn’t have because the model’s output looked credible.
      </p>

      <p>
        The dimension that separated effective AI users from ineffective ones was not raw skill at the underlying task. It was meta-cognitive: whether the consultant could correctly identify which tasks fell inside vs outside the frontier, calibrate their trust accordingly, and verify the model’s output on tasks where verification was cheap.
      </p>

      <p>
        We are calling this dimension Human–AI Collaboration Intelligence in our own work. Mollick calls it the centaur skill. Dell’Acqua calls it frontier discrimination. Whatever you call it, it is a distinct, measurable, and currently un-measured property of high-performing knowledge workers.
      </p>

      <h2>Why this is now the core engineering skill</h2>

      <p>
        The argument generalises from consulting to engineering, but the magnitudes change in interesting ways. Engineering tasks are more verifiable than consulting deliverables. The compiler will tell you the code doesn’t parse. The test suite will tell you the function returns the wrong value in edge cases. The deployment will fail if you missed a configuration step.
      </p>

      <p>
        These verification mechanisms ought, in theory, to make AI use in engineering safer than in consulting. The model produces a plausible-but-wrong solution; the test suite catches it; the engineer iterates. In practice, this works only if the engineer actually runs the tests, reads the failure output carefully, and trusts the test result over the model’s confident assurance that it has fixed the bug.
      </p>

      <p>
        What we see in practice — and this is consistent across the candidates we have observed in our own pilot, the engineers we talk to as users, and the published literature — is that engineers vary enormously in how much they trust models, how much they verify, and how willing they are to override the model when its confident output disagrees with their own intuition. The variance is at least as large as the BCG study found in consulting, possibly larger because the cost of an unverified solution in engineering can be a production outage.
      </p>

      <h2>The sub-skills that actually matter</h2>

      <p>
        Watching candidates work alongside an agent in an instrumented sandbox, we see Human–AI Collaboration Intelligence break down into six recognisable sub-skills. We score on all six in our Round 2 design (covered in <Link href="/blog/ai-resistant-coding-interview-design">our piece on AI-resistant interview design</Link>); even if you don’t formalise them this way, they are useful to recognise.
      </p>

      <ul>
        <li>
          <strong>Delegation Calibration.</strong> Knowing which tasks to delegate to the agent and which to do yourself. A weak signal: the candidate delegates everything, including tasks the agent doesn’t do well (architectural choices, reading unfamiliar code, choosing the right level of abstraction). A strong signal: the candidate delegates the verbose execution-layer work and keeps the judgment-layer work for themselves.
        </li>
        <li>
          <strong>Prompt Quality and Decomposition.</strong> The ability to break a task into prompt-shaped sub-tasks. Weak: one giant prompt that asks the agent to do the whole ticket. Strong: a sequence of focused prompts, each scoped to one concrete change with clear acceptance criteria.
        </li>
        <li>
          <strong>Verification Rigor.</strong> Whether the candidate verifies the agent’s output before accepting it. Weak: the candidate accepts the first plausible-looking output and moves on. Strong: the candidate runs the test, reads the output, manually checks edge cases, and rejects work that doesn’t survive verification — even when the agent insists it’s correct.
        </li>
        <li>
          <strong>Override Judgment.</strong> When to trust the agent vs override it. Weak: the candidate defers to the agent even when their own intuition disagrees, or they override based on superstition rather than evidence. Strong: the candidate overrides when they have a specific reason, accepts when they don’t, and is explicit about which case they’re in.
        </li>
        <li>
          <strong>Engineering Taste.</strong> Whether the candidate’s choices fit the codebase’s prevailing style. Weak: the candidate accepts the agent’s suggestion to introduce a new abstraction, dependency, or pattern that doesn’t match the codebase. Strong: the candidate constrains the agent to work within the codebase’s existing patterns, even when the agent suggests something more “elegant.”
        </li>
        <li>
          <strong>Solution Completeness.</strong> Whether the candidate ships work that runs end-to-end, or work that compiles but doesn’t pass the actual acceptance criteria. Weak: the candidate ships happy-path code. Strong: the candidate handles edge cases, tests the integration, and verifies the full feature works.
        </li>
      </ul>

      <p>
        These six are correlated but not identical. The strongest candidates in our pilot data are strong on all six. Weaker candidates are typically strong on two or three and weak on the others, and the specific pattern of weakness predicts the kind of work they’ll struggle with.
      </p>

      <h2>What this means for what you should be measuring</h2>

      <p>
        If Human–AI Collaboration Intelligence is the largest source of variance in modern engineering performance — and the data we have, plus the published literature, points strongly that way — then the most important thing your hiring process can do is measure it. Most processes don’t.
      </p>

      <p>
        The reason most processes don’t is that the dominant interview formats are structurally blind to it. A LeetCode-style algorithmic interview measures unaided coding throughput. A system-design interview measures design vocabulary. A behavioural interview measures past-narrative articulation. None of them put the candidate in front of an AI agent and watch them work.
      </p>

      <p>
        The fix is straightforward in concept and modestly elaborate in execution: give the candidate a real codebase, a real ticket, an AI agent of their choice, and instrument what they do. Score the six sub-skills above. The hardest part is the instrumentation; we covered the engineering considerations in <Link href="/blog/ai-resistant-coding-interview-design">the AI-resistant interview piece</Link>.
      </p>

      <h2>Implications for who you should hire</h2>

      <p>
        Once you start measuring this dimension, two things become visible that weren’t before.
      </p>

      <p>
        First, there is a population of senior engineers who score high on traditional dimensions (clean code, strong system design, deep technical knowledge) but score low on AI collaboration. They tend to refuse to use AI agents at all, or to use them as glorified autocomplete. They produce excellent unaided work. Their throughput against the modern engineering workload is meaningfully lower than peers who delegate well. Whether you hire them depends on the role: there is still genuine value in deep unaided expertise, but the percentage of roles where that is the highest-value profile is shrinking.
      </p>

      <p>
        Second, there is a population of mid-level engineers who score moderately on traditional dimensions but score very high on AI collaboration. They effectively punch above their experience band because they can orchestrate an agent productively. These engineers are systematically undervalued by traditional hiring processes — they don’t do as well on whiteboard interviews, they don’t look as impressive in system-design conversations, but they ship significantly more real work per unit of senior engineering oversight. Hiring processes that include an instrumented AI-collaboration round surface this population. Hiring processes that don’t, miss them.
      </p>

      <p>
        The most valuable hires, of course, are the engineers who score high on both. They are rarer than either single-strong-axis profile. But they are findable, and they are exactly the engineers who will define the next decade of technical work.
      </p>

      <h2>What this doesn’t mean</h2>

      <p>
        Three things this argument doesn’t imply.
      </p>

      <p>
        It does not imply that deep unaided technical skill is obsolete. The candidates who score high on AI collaboration almost universally also have strong underlying technical skill, because verifying an agent’s output requires understanding what good output looks like. The two skills are complements, not substitutes. The error mode that the BCG study documented — confidently shipping wrong answers — is most acute for candidates with weak technical foundations who over-trust the model. Measuring AI collaboration without also probing underlying technical depth would produce hires who are confident at the wrong things.
      </p>

      <p>
        It does not imply that you should bias your pipeline toward candidates who have public AI-tooling experience. The skill we are describing is generic — calibrated delegation, verification, override judgment — and travels across specific tools. A candidate who has used Cursor for a year and a candidate who has used Claude Code for a year are equally well-positioned to demonstrate the skill, and a candidate who has used neither but has a strong meta-cognitive instinct will pick up either tool in a week.
      </p>

      <p>
        It does not imply that AI-assisted coding tests are now sufficient on their own. Round-two coding work is one half of a complete signal. The other half is conversational — calibration, judgment, narrative articulation, ethical reasoning, the things that surface through structured talk rather than instrumented action. We discussed the complementary round-one design in <Link href="/blog/cv-grounded-interviews">our piece on CV-grounded interviews</Link>.
      </p>

      <h2>Where to start</h2>

      <p>
        The practical first move is to look at your current technical interview pipeline and ask: at any point in our process, do we put the candidate in front of an AI agent and watch them work? For most companies in 2026, the answer is no. That gap is the easiest place to make an immediate change.
      </p>

      <p>
        You don’t need to build the full Basanite-style instrumented sandbox to start. You can run a manual version where a senior engineer screen-shares with the candidate, asks them to complete a routine ticket using their preferred AI agent, and observes the six sub-skills informally. The signal is weaker than the instrumented version, but it is dramatically stronger than not measuring the dimension at all. After a quarter of running interviews this way, you will have an intuition for what good looks like, and you can decide whether to invest in formal instrumentation or stay with the manual version.
      </p>

      <p>
        If you want to read further: <Link href="/blog/ai-resistant-coding-interview-design">our piece on AI-resistant coding interview design</Link> covers the round-two design in more depth, and <Link href="/blog/structured-interview-fairness-ai-era">our piece on structured interview fairness</Link> covers how to think about the rubric structure. The <Link href="/faq">FAQ</Link> documents how Basanite specifically scores Human–AI Collaboration Intelligence.
      </p>
    </ArticleLayout>
  )
}
