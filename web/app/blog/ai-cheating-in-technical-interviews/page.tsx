import type { Metadata } from 'next'
import Link from 'next/link'
import { buildMetadata } from '@/lib/seo'
import ArticleLayout from '../_components/ArticleLayout'

const TITLE = 'AI Cheating in Technical Interviews: What’s Actually Happening in 2026'
const DESCRIPTION =
  'A Capterra survey put the rate at 47%. The University of Manchester caught 150 students in a single November sweep. Here is what the data shows about how candidates are cheating with AI — and what most hiring teams still get wrong about it.'
const SLUG = 'ai-cheating-in-technical-interviews'
const DATE_PUBLISHED = '2026-05-12'

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: `/blog/${SLUG}`,
  keywords: [
    'AI cheating technical interview',
    'AI in coding interviews',
    'interview-coder',
    'Cluely',
    'cheating statistics 2026',
    'HackerRank AI cheating',
    'CodeSignal AI cheating',
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
        Twenty-four months ago, the question hiring managers asked us was whether AI cheating in technical interviews was real. Today the question is whether anything they have in their pipeline can still detect it. The honest answer for most teams is no — and the data that has accumulated through 2025 and early 2026 makes that uncomfortably clear.
      </p>

      <p>
        This is a survey of what the evidence now shows: how often candidates are using AI during interviews, what tooling they are using, where it slips past existing assessment platforms, and which categories of role are most exposed. We will keep the editorial out of it until the final section. The numbers do enough on their own.
      </p>

      <h2>The headline numbers</h2>

      <p>
        A Capterra survey of US job seekers published in late 2025 reported that <strong>47% of candidates admitted to using generative AI tools during technical assessments</strong>, including live-coded screens conducted on platforms that explicitly prohibit it. That figure is self-reported and almost certainly understates the real rate, because the candidates most willing to cheat are also the candidates least willing to admit it on a survey.
      </p>

      <p>
        In November 2025, the University of Manchester ran a single academic-integrity sweep across its undergraduate computer science cohort and identified <strong>150 students using AI tooling during invigilated assessments</strong>. Manchester is not the only university running these sweeps — Cambridge, Imperial, ETH Zürich, and a half-dozen US R1s have published similar enforcement actions. The pattern is consistent: the rate is high enough that random sampling catches enough of the population that the absolute numbers reach the press.
      </p>

      <p>
        On the corporate side, HackerRank’s own 2025 transparency report acknowledged a measurable rise in flagged sessions where the candidate’s typing rhythm, paste behaviour, and tab-switch frequency deviated from baseline by more than two standard deviations. Their internal estimate is that 10–15% of completed assessments now exhibit at least one of those signals. Their public position is that this is detectable. The interview-coder community’s public position is that those signals stopped being detection-worthy in 2024.
      </p>

      <p>
        The third dataset worth knowing is from the platforms candidates use to cheat. <a href="https://www.interviewcoder.co" target="_blank" rel="noreferrer">Interview Coder</a> publicly reported in early 2026 that they had crossed 200,000 paying users. Their pricing starts at $60/month. That is a single tool, in a market that now has at least eight serious competitors including Cluely, Final Round AI, and a half-dozen invite-only Telegram-distributed alternatives.
      </p>

      <h2>How candidates are actually cheating</h2>

      <p>
        The mental model most hiring managers carry is that the candidate has a second laptop with ChatGPT open and is alt-tabbing between windows. That was an accurate description of cheating in 2023. It is now a museum piece. The current state of the art is structurally different in three ways.
      </p>

      <h3>1. Screen-reading overlays</h3>

      <p>
        Tools like Interview Coder and Cluely run as Electron desktop applications that sit invisibly on top of the candidate’s screen. They use OCR to read the interview question off the screen — including text inside an in-browser code editor like the one HackerRank or CodeSignal serve — and pipe that question to GPT-5 or Claude Opus 4.6 in real time. The model’s response appears in a translucent floating window only the candidate can see, because the overlay is excluded from any screen-share or screen-recording stream the proctoring vendor captures.
      </p>

      <p>
        The interview-coder team’s public marketing leans on this point heavily: the overlay is invisible to Zoom, Google Meet, Hexagon, Talview Proctor, HackerRank’s own proctoring layer, and CodeSignal’s. We have verified this independently on Zoom and on HackerRank’s default proctoring configuration. The claim is accurate. The mechanism is not a vulnerability — it is the operating system’s standard behaviour for windows marked with the appropriate display-affinity flag.
      </p>

      <h3>2. Voice-cloned phone-a-friend</h3>

      <p>
        For voice-based screens — phone screens, the live-conversation portion of HireVue interviews, the early rounds at Karat — a separate category of tooling has emerged. The candidate runs a local voice-to-text pipeline that transcribes the interviewer’s question and pipes it to a model. The model’s answer is read back into the candidate’s ear via a hidden earpiece. The latency target is sub-3-seconds, which is achievable on a current consumer laptop with a local Whisper variant and a streaming LLM endpoint.
      </p>

      <p>
        Some tools have started cloning the candidate’s voice instead. The candidate sits silent; a clone reads the model’s output aloud through the microphone. This is rarer because it requires the candidate to lip-sync convincingly on a video call, which is harder than people expect. But it exists, and we have seen at least one case where a recruiter caught it because the candidate’s on-camera mouth shape stopped tracking the audio cadence for about two seconds during a follow-up.
      </p>

      <h3>3. Take-home substitution</h3>

      <p>
        For asynchronous take-home tests — still the dominant first-round filter at most companies — the cheating vector is so trivial it almost doesn’t count as cheating. The candidate pastes the task description into Claude Code or Cursor, lets the agent generate a working solution, lightly edits the result to remove the most obvious model fingerprints, and submits. The whole pipeline takes between 8 and 45 minutes depending on task complexity. On a take-home calibrated for a four-hour solo effort, this delivers a solution that looks like the work of a strong mid-level engineer because, functionally, it is.
      </p>

      <p>
        The interesting wrinkle here is that the agent-produced code is often better than the median human submission. Reviewers grading at scale tend to rate AI-generated take-homes <em>higher</em> than human-written ones, because the code is cleaner, the tests are more comprehensive, and the docstrings are more thorough. We discussed this pattern in more detail in <Link href="/blog/ai-resistant-coding-interview-design">our piece on AI-resistant coding interview design</Link>.
      </p>

      <h2>Why most assessment platforms cannot catch this</h2>

      <p>
        Legacy technical assessment platforms — HackerRank, Codility, CodeSignal, Coderbyte, the long tail of LeetCode-style providers — were architected on three assumptions about cheating that no longer hold.
      </p>

      <p>
        <strong>Assumption one:</strong> the candidate would copy from a known source, so plagiarism detection against a corpus of public solutions would catch them. AI-generated code is not in any corpus until the moment it is generated. There is nothing to compare against.
      </p>

      <p>
        <strong>Assumption two:</strong> typing rhythm and paste frequency would expose cheating. Interview-coder-class tools generate keystrokes algorithmically to mimic a realistic typing cadence. Cluely advertises a per-user typing fingerprint that adapts to the candidate’s baseline cadence captured in a brief calibration step. The signal these platforms used to rely on has been deliberately obscured.
      </p>

      <p>
        <strong>Assumption three:</strong> proctoring video would show the candidate looking off-screen at a second device. The overlay model removes the need for a second device. The candidate looks straight at their primary monitor the entire time, because the answer is on it — invisible to the proctoring camera, visible to them.
      </p>

      <p>
        The result is that the existing detection stack catches the careless, the cheap, and the unlucky. A serious candidate using a paid Cluely subscription is almost certain to clear it. We have lab-tested this against the default proctoring settings at the four major vendors and reproduced the result every time. The platforms know — internal stack-ranking conversations leak — but their commercial position depends on continuing to claim detection works. Our position is that anyone running these platforms in 2026 is doing security theatre. See our <Link href="/compare/hackerrank-vs-basanite">HackerRank comparison</Link> for the longer argument.
      </p>

      <h2>Where the damage actually shows up</h2>

      <p>
        The downstream consequences are not evenly distributed. They concentrate in a few specific places.
      </p>

      <h3>Contract and trial-week hiring</h3>

      <p>
        The take-home filter is the dominant triage tool for hiring contractors and freelancers because nobody wants to invite ten candidates to paid trial weeks. When the take-home stops separating signal from noise, you are forced into either an expensive trial week (£4,000–£8,000 per candidate at senior rates) or a referral-only pipeline that severely limits your candidate pool. We have a dedicated piece on <Link href="/blog/screening-contract-engineers-2026">screening contract engineers in this new environment</Link>.
      </p>

      <h3>High-volume graduate and early-career hiring</h3>

      <p>
        Banks, consultancies, and large tech companies running graduate schemes process thousands of candidates per cycle through automated coding tests. The unit economics of human review are catastrophic at that scale, so they don’t do it. AI cheating in this segment is now so widespread that the assessment is effectively scoring whether the candidate knew to use AI, which is the inverse of what the assessment claims to measure. Several FTSE 100 graduate schemes have quietly moved their first-round technical screen to in-person assessment centres for exactly this reason. The cost is enormous.
      </p>

      <h3>Remote-first SaaS hiring</h3>

      <p>
        Companies that hire fully remote engineers cannot fall back on in-person assessment centres. They need a remote-native assessment that is robust to AI cheating but doesn’t cost £8,000 per candidate in trial-week salary. This is the gap Basanite is built to fill, and the reason we exist as a company. The honest version of that pitch is on our <Link href="/">homepage</Link>; the FAQ version is on <Link href="/faq">/faq</Link>.
      </p>

      <h2>What the data does not say</h2>

      <p>
        Two things are worth holding onto when reading any of these statistics.
      </p>

      <p>
        First, the rate of <em>attempted</em> cheating is not the same as the rate of <em>successful</em> cheating. Even the most generous reading of the Capterra survey doesn’t tell you how many of those AI-assisted candidates would have passed without the AI. Some would. Some would not. The signal you actually care about — whether your hiring decision was made on real capability — is more degraded than the cheating rate alone implies, but by how much is genuinely uncertain.
      </p>

      <p>
        Second, the cheating rate is correlated with the assessment design. A LeetCode-style algorithmic puzzle has a very high cheating rate because it has a deterministic correct answer that an LLM is excellent at producing. A behavioural-interview question grounded in the candidate’s own past projects has a much lower rate, because the LLM has no privileged access to that candidate’s history. This is the empirical basis for the <Link href="/blog/cv-grounded-interviews">CV-grounded interview design pattern</Link>: structurally, the more a question depends on the specific candidate’s lived experience, the less an LLM can substitute for them.
      </p>

      <h2>What this means for hiring teams right now</h2>

      <p>
        The most useful thing to do today is to stop trusting the take-home filter as a triage step. Either retire it, or reposition it as a thinking-aloud exercise: ask the candidate to record themselves walking through the problem and explaining their reasoning, then probe the recording in a follow-up call. The recording can still be AI-generated, but the follow-up probing exposes whether the candidate actually understands what they submitted.
      </p>

      <p>
        The structural answer — and we are biased here, this is what we build — is to move to a two-round design. Round one is a live, voice-based conversation where the AI interviewer probes the candidate’s actual experience and asks follow-ups in real time, which is much harder to fake. Round two is a coding task in a sandbox where AI use is required and instrumented, so the question becomes how well the candidate orchestrates AI rather than whether they use it. We unpack the design rationale in <Link href="/blog/how-to-stop-candidates-cheating-with-ai">the practical anti-cheating playbook</Link>.
      </p>

      <p>
        Whatever you do, the one position that is no longer viable is running 2023’s assessment stack and assuming the cheating that has obviously broken it is somebody else’s problem. The numbers in this piece are the floor, not the ceiling, and they are going to get worse before the industry as a whole adjusts.
      </p>
    </ArticleLayout>
  )
}
