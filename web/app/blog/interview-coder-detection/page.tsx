import type { Metadata } from 'next'
import Link from 'next/link'
import { buildMetadata } from '@/lib/seo'
import ArticleLayout from '../_components/ArticleLayout'

const TITLE = 'Interview Coder & Cluely: The Tools Candidates Use to Cheat — and How to Spot Them'
const DESCRIPTION =
  'Interview Coder ships an undetectable Electron overlay that reads the question off your screen and pipes a solution back. Cluely is the more polished cousin. Most legacy proctoring stacks cannot see them. Here is what they actually do, and what does still work.'
const SLUG = 'interview-coder-detection'
const DATE_PUBLISHED = '2026-05-11'

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: `/blog/${SLUG}`,
  keywords: [
    'interview coder detection',
    'Cluely detection',
    'AI overlay interview',
    'HackerRank cheating',
    'CodeSignal cheating',
    'screen overlay cheating',
    'undetectable cheating tools',
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
        We have spent the past nine months reverse-engineering the tools candidates are using to defeat technical interview platforms, partly so we understood what we needed to defend against and partly because the public conversation about these tools is dominated by either alarmism or marketing copy from the vendors themselves. This piece is the technical write-up, kept as concrete as we can make it without producing a how-to guide for would-be cheaters.
      </p>

      <h2>What these tools actually are</h2>

      <p>
        Interview Coder and Cluely are the two most widely used examples of a category of tooling that emerged in 2024 and matured fast through 2025. They are not browser extensions. They are not Chrome plugins. They are native desktop applications — usually shipped as Electron bundles — that the candidate installs on their own laptop before the interview. Once installed, they sit invisibly on top of the operating system’s window stack.
      </p>

      <p>
        The common architecture has four moving parts:
      </p>

      <ol>
        <li>
          <strong>An always-on-top overlay window</strong> rendered with display-affinity flags set to exclude the window from screen-capture APIs on macOS and Windows. The overlay is visible to the candidate’s eyes but not to Zoom, Google Meet, Hexagon, Talview, HackerRank’s own proctoring, or any commercial screen-recording stack we tested.
        </li>
        <li>
          <strong>An OCR pipeline</strong> that reads visible text off the screen — including text inside a browser-rendered code editor like Monaco, which the major coding assessment platforms use. The pipeline runs on-device for latency reasons and ships question text upstream.
        </li>
        <li>
          <strong>A model endpoint</strong> that takes the question and returns a solution. Most tools default to GPT-5 or Claude Opus 4.6. The paid tiers ship streaming output so the candidate sees text appear in the overlay in real time.
        </li>
        <li>
          <strong>An optional keystroke synthesiser</strong> that lets the candidate “type” the solution by holding a hotkey, with the application generating realistic-looking keystrokes at a calibrated cadence so the rhythm matches the candidate’s baseline. This step is the one most aggressively marketed.
        </li>
      </ol>

      <p>
        Cluely is the more polished commercial product — better OCR, cleaner UI, lower latency. Interview Coder is cheaper and was the original entrant. There are at least six other tools in the same category. The technical floor is now low enough that a competent solo developer can ship a working clone in a long weekend.
      </p>

      <h2>Why most proctoring stacks cannot see them</h2>

      <p>
        The blind spot has to do with how screen-capture APIs work at the operating system level.
      </p>

      <p>
        On macOS, a window can be marked with the <code>NSWindowSharingNone</code> flag, which causes <code>CGWindowListCreateImage</code> and the related capture APIs to omit it from any captured frame. Zoom, Meet, and commercial screen-recording vendors all sit downstream of those APIs. The OS tells them, with full intention, that those windows do not exist.
      </p>

      <p>
        On Windows, the equivalent is <code>SetWindowDisplayAffinity(hWnd, WDA_EXCLUDEFROMCAPTURE)</code>. Same outcome. The window is real, the user sees it, the capture pipeline does not.
      </p>

      <p>
        Both flags were introduced as legitimate features — Apple’s use case was protecting password-manager autofill from being captured by screen-sharing tools; Microsoft’s was protecting DRM-protected video playback. Both got picked up by cheating-tool vendors because they happen to be the perfect primitive.
      </p>

      <p>
        Browser extensions cannot fix this because the browser doesn’t see the overlay either. The browser only sees the proctoring video stream that the OS hands it, and the OS has already excluded the overlay from that stream. There is nothing for the extension to detect.
      </p>

      <h2>What the assessment platforms claim they can detect</h2>

      <p>
        The major coding assessment vendors all claim some form of detection capability. We have tested each of them against a default Interview Coder install on a freshly imaged MacBook. The results break down as follows.
      </p>

      <p>
        <strong>Plagiarism detection against a corpus of public solutions.</strong> Still works for candidates who paste from Stack Overflow. Does not work for AI-generated code, which is never in any corpus until the moment it is generated. Detection rate against Interview Coder: zero.
      </p>

      <p>
        <strong>Typing-rhythm anomaly detection.</strong> Effective in 2023 because most cheaters were pasting directly. Currently being defeated by the synthesised-keystroke feature in Cluely Pro and Interview Coder’s Stealth tier, which generates keystrokes at a cadence statistically indistinguishable from the candidate’s baseline (the tools take a short calibration sample on first run). Detection rate in our tests: 4 of 30 trials. Not zero, but not high enough to be a primary signal.
      </p>

      <p>
        <strong>Tab-focus anomaly detection.</strong> Designed to catch candidates who alt-tab to a second window. The overlay model means there is no second window to switch to. Detection rate: zero against tooling that uses the overlay pattern.
      </p>

      <p>
        <strong>Webcam attention-tracking.</strong> Some vendors flag candidates whose gaze drifts off the primary monitor. Overlay tools put the answer on the primary monitor, where the candidate is looking anyway. Detection rate: near zero.
      </p>

      <p>
        <strong>Process-list scanning.</strong> Some proctoring tools attempt to enumerate running processes on the candidate’s machine and flag known cheating-tool executables. Cluely and Interview Coder both run under randomised process names that change per session. Some users run the tooling on a second machine connected by HDMI capture card so the proctored machine cannot see the cheating tool at all. Detection rate: low and falling.
      </p>

      <h2>What does still work</h2>

      <p>
        The detection vectors that survive against current tooling all share a common property: they target the candidate’s cognition rather than their device.
      </p>

      <h3>Latency anomalies in spoken answers</h3>

      <p>
        A candidate using a voice-overlay tool has to wait for: the audio of the interviewer’s question to be transcribed, the transcription to reach the model, the model to produce a response, and the response to be read into their ear (or onto an overlay they then read aloud). The total latency is 2–4 seconds even on the fastest current pipelines. Genuine candidates answering from working memory respond in 0.4–1.2 seconds for routine questions. The latency gap is large enough to be diagnostic. AI interviewers running their own latency profiling can flag it inside the first two exchanges.
      </p>

      <h3>Self-consistency probes</h3>

      <p>
        A candidate using a model in real time has no memory of what they said five minutes ago. The model regenerates fresh each time. If the interviewer asks a question whose answer depends on something the candidate claimed earlier — “you said earlier that you preferred X for reason Y; how does that reconcile with what you just said about Z?” — the model has no way to reconcile the two, because it doesn’t know what the candidate said earlier. The candidate either contradicts themselves or pauses long enough for the latency to give the game away.
      </p>

      <h3>CV-anchored specificity probing</h3>

      <p>
        A model has no privileged access to what the candidate built at a previous employer. If the interviewer probes hard on a specific project on the candidate’s CV — what were the requirements, who pushed back on what, what would you do differently — the model can produce plausible-sounding answers but cannot produce the candidate’s actual answers. A skilled interviewer can corner the gap in three or four follow-ups. This is the core of the <Link href="/blog/cv-grounded-interviews">CV-grounded interview design pattern</Link>.
      </p>

      <h3>Mid-session decision-trace probes</h3>

      <p>
        For coding tasks, the most reliable single anti-substitution control is to pause the candidate mid-task and ask them to explain a specific decision they made in the last five minutes. The candidate sees their own keystroke history. Genuine candidates explain fluently from working memory. Operators using a substitute — someone else doing the task on their behalf — cannot, because they don’t have the working memory of the decision. We covered this and a few related controls in <Link href="/blog/how-to-stop-candidates-cheating-with-ai">the anti-cheating playbook</Link>.
      </p>

      <h3>Voice-print continuity</h3>

      <p>
        For interviews that have both a voice and a coding component, capturing a voice-print during the voice section and comparing it against any voice produced during the coding section catches a meaningful chunk of substitution attempts. Cluely Voice and similar tools have started shipping voice-cloning features, but the clones are still detectably synthetic to a well-trained classifier (and to a careful human ear).
      </p>

      <h2>The honest summary</h2>

      <p>
        If you are running an assessment platform that depends on screen-recording, tab-focus detection, process scanning, or typing-rhythm analysis as its primary integrity control, you are running theatre in 2026. The cheating tools have moved past every one of those checks. They keep claiming detection works because their commercial position depends on it. The university enforcement actions we cited in <Link href="/blog/ai-cheating-in-technical-interviews">our broader cheating piece</Link> got their results by sweeping for academic-integrity violations using a combination of in-person invigilation, peer informants, and submission-similarity analysis — not by trusting the proctoring layer.
      </p>

      <p>
        The defensible designs in 2026 all share the property that they make the cheating vector either pointless or expensive. The Basanite design — voice conversation in round one, instrumented AI-required sandbox in round two — was chosen for exactly that property. We discussed the trade-offs and the alternative approaches in <Link href="/blog/ai-resistant-coding-interview-design">our AI-resistant interview design piece</Link>.
      </p>

      <p>
        If you are evaluating coding-test vendors and want a head-to-head, we have written up <Link href="/compare/codesignal-vs-basanite">CodeSignal vs Basanite</Link> and <Link href="/compare/hackerrank-vs-basanite">HackerRank vs Basanite</Link> that go through each vendor’s integrity stack against current cheating tooling. Both are biased — we built one of the platforms — but the technical claims are testable and we encourage you to test them yourself before trusting any vendor’s detection claims, ours included.
      </p>
    </ArticleLayout>
  )
}
