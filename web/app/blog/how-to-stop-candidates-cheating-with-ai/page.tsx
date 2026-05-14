import type { Metadata } from 'next'
import Link from 'next/link'
import { buildMetadata } from '@/lib/seo'
import ArticleLayout from '../_components/ArticleLayout'

const TITLE = 'How to Stop Candidates From Cheating With AI (Without Banning AI Entirely)'
const DESCRIPTION =
  'You cannot stop a competent candidate from running an AI overlay during a take-home. The defensible move is to design assessments where AI use is either impossible or expected and instrumented. Here is the practical playbook.'
const SLUG = 'how-to-stop-candidates-cheating-with-ai'
const DATE_PUBLISHED = '2026-05-12'

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: `/blog/${SLUG}`,
  keywords: [
    'stop AI cheating interviews',
    'anti-cheating interview design',
    'AI interview policy',
    'CV-grounded interview',
    'behavioural biometrics',
    'live coding interview',
    'AI Collaboration Workbench',
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
        Every conversation we have with a head of talent in 2026 starts in the same place: they have just lost confidence in their take-home filter, they don’t know what to replace it with, and they would like to know whether banning AI from interviews is a serious option. The honest answer to the last question is no — but for reasons that turn out to be useful rather than depressing. This piece walks through what does work, what doesn’t, and what the trade-offs are.
      </p>

      <h2>The two stable equilibria</h2>

      <p>
        There are exactly two assessment designs that survive contact with current AI tooling. Everything else is on a continuum between them, decaying over time toward one or the other.
      </p>

      <p>
        <strong>Equilibrium A: AI use is structurally impossible.</strong> The candidate is in a room you control, on hardware you control, observed by a human or by trustworthy instrumentation. Whiteboard interviews at the company office are the canonical example. The cost is high — flights, hotels, two days of senior engineering time per candidate — and the experience is hostile to candidates who are remote, neurodivergent, or simply nervous on a whiteboard. But it does work, and it explains the recent quiet return of in-person final rounds at companies that publicly committed to remote-first hiring two years ago.
      </p>

      <p>
        <strong>Equilibrium B: AI use is expected, required, and instrumented.</strong> The candidate is told to bring whatever AI tooling they normally use. The task is calibrated for someone working with an agent. You measure how well the candidate orchestrates the agent: their prompts, their verification behaviour, their willingness to override the agent when it’s wrong. The cheating vector evaporates because there is no cheating to do — the AI use is the point. We call this design pattern the AI Collaboration Workbench, and it is one half of how Basanite is structured. The other half — the voice conversation — sits in a different category we will get to below.
      </p>

      <p>
        The middle ground — a remote coding test where AI is forbidden and the candidate is asked to honour-system their way through — is the design that has collapsed. Honour systems work in groups with strong shared norms and skin in the game. Anonymous candidates competing for a job they want do not satisfy either condition. We covered the specific tooling that has collapsed this assumption in <Link href="/blog/interview-coder-detection">our piece on interview-coder and Cluely</Link>.
      </p>

      <h2>Live voice conversation as a structurally different defence</h2>

      <p>
        There is a third design that doesn’t fit cleanly into either equilibrium but is robust in its own way: a structured live conversation about the candidate’s past work. The robustness comes from three properties at once.
      </p>

      <p>
        First, the question depends on the candidate’s own history. An LLM has no privileged access to what the candidate built at a previous employer, what trade-offs they encountered, what they would do differently. If you ask the candidate to walk through a specific technical decision from their CV, the model can produce plausible-sounding answers but cannot produce <em>their</em> specific answer. A skilled interviewer can probe the boundary in 90 seconds.
      </p>

      <p>
        Second, the candidate is producing speech in real time. Speech is high-bandwidth and low-latency. The candidate has to maintain coherent narrative arc, remember what they said two minutes ago, and respond to a follow-up that wasn’t in the script. A model running through a transcription pipeline can produce plausible answers, but the latency is wrong (2–3 seconds of dead air before each response) and the answers tend to be too tidy, too well-structured, too unlike how humans actually talk under interview pressure. Trained interviewers notice this within the first two exchanges. We have written more about the design constraints in <Link href="/blog/cv-grounded-interviews">our piece on CV-grounded interviews</Link>.
      </p>

      <p>
        Third, the conversation can probe inconsistency. If a candidate claims in answer one that they always lean toward microservices, and in answer six that they prefer monoliths until a system passes a complexity threshold, a skilled interviewer asks a follow-up that forces them to reconcile the two. A model running in real time, with no memory of what the candidate said earlier, cannot produce a self-consistent narrative under that kind of pressure. This is why a 25-minute structured conversation is a substantially harder thing to cheat at than a 25-minute coding test — even though the coding test feels more rigorous because it is more measurable.
      </p>

      <h2>The practical playbook</h2>

      <p>
        Putting it together: for a typical remote-first technical hiring funnel, the design that works in 2026 looks like this.
      </p>

      <h3>1. Retire the asynchronous take-home as a triage filter</h3>

      <p>
        It is no longer doing its job. If you keep it, reposition it as a thinking-aloud exercise: ask candidates to record a 5-minute Loom walking through the problem statement, what they would consider, and where they would push back. The recording itself is still cheatable. The follow-up call where you probe the recording in real time is not.
      </p>

      <p>
        Some teams ask: can we keep the take-home and add proctoring? The answer is that the proctoring stack that catches interview-coder-class tooling does not yet exist in commercial form. Some vendors claim it does. Test before you trust. We discussed the technical limits in detail in <Link href="/blog/ai-cheating-in-technical-interviews">our AI cheating piece</Link>.
      </p>

      <h3>2. Make round one a structured live conversation</h3>

      <p>
        Twenty to thirty minutes, voice or video. Use a consistent question framework across candidates so the comparison is fair, but anchor each candidate’s questions in their own CV so the surface form differs. This is the Construct-Templated Adaptive Interviewing pattern. Each candidate sees different questions; every candidate is scored against the same rubric.
      </p>

      <p>
        Done by a human, this is the most expensive part of your funnel. Done by an AI interviewer that asks adaptive follow-ups and probes vagueness in real time, the per-candidate cost is in the £5–15 range. The trade-off is that the AI doesn’t catch every nuance a senior engineer would. The argument for using it as the first round is that it is more rigorous than what most companies actually do at round one today, which is a 30-minute recruiter screen that doesn’t even probe technical claims.
      </p>

      <h3>3. Make round two an instrumented AI-collaboration task</h3>

      <p>
        Give the candidate a real codebase, a real ticket calibrated to their seniority, and explicit permission to use their AI agent of choice. Instrument keystrokes, prompts, git state, and time-on-task. Compare against a behavioural-biometric baseline established during round one. After the task, run a 10-minute reflection conversation where you ask the candidate to explain specific decisions visible in the trace.
      </p>

      <p>
        The reflection conversation is the load-bearing piece. A substitute operator — someone else doing the task on the candidate’s behalf — can produce a clean trace but cannot then sit in a follow-up call and explain the trace fluently. Real candidates explain from working memory in two-thirds of a second. Substitutes pause, hedge, and produce answers that don’t match what the trace shows.
      </p>

      <h3>4. Identity verification at session start</h3>

      <p>
        Before either round begins, the candidate should pass a lightweight identity check: government ID held up to camera, captured frame compared against the photo on the ID, optional liveness check (head turn, blink). This is not novel — every gig-economy platform does this. The point is to anchor the rest of the session against a verified identity so a later integrity dispute has a clear evidentiary baseline.
      </p>

      <h3>5. Behavioural-biometric continuity check</h3>

      <p>
        Capture a typing-rhythm and voice-print baseline during round one’s conversational portion. In round two, compare the keystroke rhythm against the round-one baseline. A divergence beyond a calibrated threshold is a flag, not a verdict — but it is the single most reliable indicator we have found that someone other than the original candidate is now operating the keyboard.
      </p>

      <h3>6. Randomised mid-session check-in</h3>

      <p>
        At a moment chosen by the system, pause the round-two task and ask the candidate to explain, on camera, a specific decision they made in the last five minutes. Genuine candidates produce a fluent answer from working memory. Substitutes pause, hedge, and produce answers that don’t match the trace. This is the cheapest and most effective single anti-substitution control we have implemented.
      </p>

      <h2>What you should not do</h2>

      <p>
        A few things we see hiring teams reach for that don’t actually work:
      </p>

      <ul>
        <li>
          <strong>Browser-extension-based AI detection.</strong> The detection stack runs in the candidate’s browser. The candidate controls the browser. They can disable, spoof, or evade the extension. We are not aware of any commercial extension that survives a sophisticated adversary.
        </li>
        <li>
          <strong>Watermark-based AI text detection on take-homes.</strong> OpenAI’s watermarking work has not shipped in a public model. Anthropic has explicitly declined to ship one. Third-party detection tools have false-positive rates around 25–40% on real candidate writing, which is operationally useless.
        </li>
        <li>
          <strong>Forcing candidates into a custom AI agent UI.</strong> If your assessment requires the candidate to use a particular agent (because you can instrument it), you are testing whether they can adapt to your tooling in real time, not how they work with their own agent. This distorts the signal toward candidates who already use that exact tool. Tooling-agnostic instrumentation is harder to build but produces cleaner data.
        </li>
        <li>
          <strong>Algorithmic-puzzle interviews on the grounds that they’re “AI-proof.”</strong> They are not. LeetCode-style problems are the easiest category of question for current LLMs. If anything, they are the most cheatable category.
        </li>
      </ul>

      <h2>The honest trade-off</h2>

      <p>
        Every anti-cheating control trades some candidate-experience cost against some integrity benefit. The trade we have landed on at Basanite — voice conversation in round one, AI-required sandbox in round two, light behavioural biometrics, randomised mid-session check-in — was chosen because the candidate-experience cost is low (no proctoring camera, no second device, no forbidden-tool monitoring) and the integrity benefit is high (the cheating vectors the controls don’t cover are vanishingly small in our pilot data).
      </p>

      <p>
        Other reasonable people have landed elsewhere. In-person final rounds at company offices are an honourable choice. Live screen-shared coding with a senior engineer watching is an honourable choice. Honour-system take-homes followed by aggressive on-site follow-up are an honourable choice. What is no longer honourable is unproctored remote coding tests treated as a primary signal. That assessment, in 2026, is theatre.
      </p>

      <p>
        If you want to compare specific platforms against each other on the dimensions covered above, we have written it up in <Link href="/compare/hackerrank-vs-basanite">HackerRank vs Basanite</Link>, <Link href="/compare/codesignal-vs-basanite">CodeSignal vs Basanite</Link>, and <Link href="/compare/hirevue-vs-basanite">HireVue vs Basanite</Link>. If you want to see the design philosophy unpacked further, our <Link href="/blog/ai-resistant-coding-interview-design">piece on AI-resistant coding interview design</Link> goes deeper on the round-two side.
      </p>
    </ArticleLayout>
  )
}
