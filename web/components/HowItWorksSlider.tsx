'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Slider for the homepage "How Basanite works" section. Each of the six
// steps shows an animated mockup that visualises the operation, with the
// step's explanation underneath. Mockups are pure CSS/SVG (animation
// classes live in globals.css under the .hiw- prefix) and remount when
// their slide becomes active so the sequence replays.
//
// Autoplay advances every 7s while the slider is on screen; it stops
// permanently once the visitor navigates manually, and never runs under
// prefers-reduced-motion.

const AUTOPLAY_MS = 7000

// ─── Step mockups ─────────────────────────────────────────────────────────

// Shared chrome: a small fake browser/app window.
function Window({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="w-full max-w-[640px] mx-auto bg-white border border-earth-300/80 shadow-sm text-left">
      <div className="flex items-center gap-1.5 px-3.5 py-2.5 border-b border-earth-200 bg-earth-50">
        <span className="w-2 h-2 rounded-full bg-earth-300" />
        <span className="w-2 h-2 rounded-full bg-earth-300" />
        <span className="w-2 h-2 rounded-full bg-earth-300" />
        <span className="ml-2 text-[11px] text-basanite-500 truncate">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// Dashed hop between the boxes in the step-3 flow.
function Connector({ delay, className }: { delay: string; className?: string }) {
  return (
    <svg viewBox="0 0 60 28" className={`w-10 h-5 my-0.5 ${className ?? ''}`} fill="none" aria-hidden="true">
      <path
        d="M6 2 C 6 16, 48 8, 52 25"
        stroke="#c49a2f"
        strokeWidth="1.5"
        className="hiw-dash"
        style={{ ['--d' as string]: delay }}
      />
    </svg>
  )
}

// 01 — JD pasted in, extraction chips appear.
function MockPasteJD() {
  return (
    <Window title="basanite.io/roles/new">
      <div className="border border-earth-300/70 bg-earth-50/60 p-4 mb-4">
        <div className="text-[11px] text-basanite-500 mb-2.5">Paste job description</div>
        {[88, 100, 94, 62].map((w, i) => (
          <div
            key={i}
            className="hiw-grow h-2 bg-earth-300/80 rounded-sm mb-2"
            style={{ width: `${w}%`, ['--d' as string]: `${150 + i * 130}ms` }}
          />
        ))}
        <span
          className="hiw-caret inline-block w-px h-3 bg-basanite-700 align-middle"
          aria-hidden="true"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {['Role: Backend engineer', 'Seniority: Senior', 'Capability profile'].map((t, i) => (
          <span
            key={t}
            className="hiw-pop text-[11px] px-2.5 py-1.5 border border-gold-500/60 bg-gold-500/10 text-basanite-800"
            style={{ ['--d' as string]: `${850 + i * 180}ms` }}
          >
            {t}
          </span>
        ))}
      </div>
    </Window>
  )
}

// 02 — recommended dimensions as a multi-select, plus a free-text
// "other requirements" input.
function MockConfigure() {
  const dims = [
    { name: 'Judgment', on: true },
    { name: 'Tacit knowledge', on: true },
    { name: 'Human–AI collaboration', on: true },
    { name: 'Debugging instinct', on: true },
    { name: 'Communication', on: false },
    { name: 'System design', on: false },
  ]
  return (
    <Window title="basanite.io/roles/backend-sr/dimensions">
      <div className="text-[11px] text-basanite-500 mb-2">Recommended dimensions for this role</div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {dims.map((d, i) => (
          <span
            key={d.name}
            className={`hiw-pop flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 border ${
              d.on
                ? 'border-gold-500/70 bg-gold-500/10 text-basanite-900'
                : 'border-earth-300 bg-white text-basanite-500'
            }`}
            style={{ ['--d' as string]: `${120 + i * 90}ms` }}
          >
            {d.on ? (
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true" className="text-gold-700">
                <path d="M1.5 4l2 2 3-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true" className="text-basanite-400">
                <path d="M4 1v6M1 4h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            )}
            {d.name}
          </span>
        ))}
      </div>
      <div className="text-[11px] text-basanite-500 mb-2">Other requirements</div>
      <div
        className="hiw-rise border border-earth-300/70 bg-earth-50/60 px-3.5 py-3"
        style={{ ['--d' as string]: '720ms' }}
      >
        <div
          className="hiw-grow h-2 bg-earth-300/80 rounded-sm mb-2"
          style={{ width: '72%', ['--d' as string]: '850ms' }}
        />
        <div className="flex items-center">
          <div
            className="hiw-grow h-2 bg-earth-300/80 rounded-sm"
            style={{ width: '44%', ['--d' as string]: '1080ms' }}
          />
          <span className="hiw-caret inline-block w-px h-3 bg-basanite-700 ml-1" aria-hidden="true" />
        </div>
      </div>
      <div className="flex items-center gap-3 mt-4">
        <span className="hiw-pop relative inline-block" style={{ ['--d' as string]: '1300ms' }}>
          <span
            className="hiw-click inline-block text-[11px] font-semibold px-3.5 py-2 bg-gold-500 text-white"
            style={{ ['--d' as string]: '1750ms' }}
          >
            Generate interview
          </span>
          {/* Pointer cursor moving in for the click */}
          <svg
            viewBox="0 0 24 24"
            className="hiw-pop absolute -right-2 -bottom-2 w-4 h-4 text-basanite-900"
            fill="currentColor"
            aria-hidden="true"
            style={{ ['--d' as string]: '1550ms' }}
          >
            <path d="M5 2l13 8.5-5.5 1L9.5 17z" />
          </svg>
        </span>
        <span
          className="hiw-pop flex items-center gap-1 text-[11px] text-gold-700"
          style={{ ['--d' as string]: '2150ms' }}
        >
          <svg width="10" height="10" viewBox="0 0 8 8" fill="none" aria-hidden="true">
            <path d="M1.5 4l2 2 3-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Interview ready
        </span>
      </div>
    </Window>
  )
}

// 03 — the link is emailed to the candidate's inbox, the candidate gets
// set up, then begins the interview with the Basanite agent.
function MockShare() {
  return (
    <div className="w-full max-w-[640px] mx-auto text-left">
      <div
        className="hiw-rise flex items-center gap-2.5 bg-white border border-earth-300/80 px-4 py-3 shadow-sm w-fit"
        style={{ ['--d' as string]: '100ms' }}
      >
        <span className="text-xs text-basanite-700 font-mono">basanite.io/a/x7k2-q9</span>
        <span className="text-[11px] px-2 py-0.5 bg-gold-500 text-white">Copy</span>
      </div>

      <Connector delay="350ms" className="ml-10" />

      {/* Email inbox */}
      <div
        className="hiw-pop ml-12 flex items-center gap-3 bg-white border border-earth-300/80 px-4 py-3 shadow-sm w-fit"
        style={{ ['--d' as string]: '650ms' }}
      >
        <span className="w-9 h-9 rounded-full bg-earth-100 border border-earth-200 flex items-center justify-center text-basanite-700">
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
            <rect x="1.5" y="3" width="11" height="8" rx="1" />
            <path d="M2 3.5l5 4 5-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div>
          <div className="text-xs text-basanite-900">To: a.kaya@example.com</div>
          <div className="text-[11px] text-basanite-500">Your Basanite interview invite · 1 new</div>
        </div>
      </div>

      <Connector delay="1050ms" className="ml-24" />

      {/* Candidate set-up */}
      <div
        className="hiw-pop ml-28 flex items-center gap-3 bg-white border border-gold-500/60 px-4 py-3 shadow-sm w-fit"
        style={{ ['--d' as string]: '1350ms' }}
      >
        <span className="w-9 h-9 rounded-full bg-earth-200 flex items-center justify-center text-[11px] text-basanite-700">
          AK
        </span>
        <div>
          <div className="text-xs text-basanite-900">Candidate: A. Kaya</div>
          <div className="text-[11px] text-gold-700">CV uploaded · Camera &amp; Microphone tested</div>
        </div>
      </div>

      <Connector delay="1750ms" className="ml-44" />

      {/* Interview begins */}
      <div
        className="hiw-pop ml-48 flex items-center gap-3 bg-white border border-gold-500/60 px-4 py-3 shadow-sm w-fit"
        style={{ ['--d' as string]: '2050ms' }}
      >
        {/* Basanite agent icon */}
        <span className="w-9 h-9 rounded-full bg-gold-500/15 border border-gold-500/50 flex items-center justify-center text-gold-700">
          <svg width="14" height="14" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
            <path d="M6 0.5l1.2 3.3L10.5 5 7.2 6.2 6 9.5 4.8 6.2 1.5 5l3.3-1.2L6 0.5z" />
          </svg>
        </span>
        <span className="flex gap-1" aria-hidden="true">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="hiw-dot w-1.5 h-1.5 rounded-full bg-basanite-500"
              style={{ ['--d' as string]: `${i * 180}ms` }}
            />
          ))}
        </span>
        {/* Candidate icon */}
        <span className="w-9 h-9 rounded-full bg-earth-200 flex items-center justify-center text-basanite-700">
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
            <circle cx="6" cy="4" r="2.2" />
            <path d="M1.8 11c0.6-2.3 2.3-3.4 4.2-3.4s3.6 1.1 4.2 3.4" strokeLinecap="round" />
          </svg>
        </span>
        <div className="text-xs text-basanite-700">A. Kaya begins the interview</div>
      </div>
    </div>
  )
}

// 04 — adaptive conversation, bubbles appearing in turn.
function MockRound1() {
  return (
    <Window title="Round 1 · Conversational assessment">
      <div className="flex flex-col gap-2">
        <div
          className="hiw-rise self-start max-w-[80%] bg-earth-100 border border-earth-200 px-3.5 py-2.5 text-xs text-basanite-800"
          style={{ ['--d' as string]: '150ms' }}
        >
          Your CV mentions migrating the billing service. What broke first?
        </div>
        <div
          className="hiw-rise self-end max-w-[80%] bg-gold-500/10 border border-gold-500/40 px-3.5 py-2.5 text-xs text-basanite-800"
          style={{ ['--d' as string]: '750ms' }}
        >
          The retry queue — we&rsquo;d assumed idempotency that wasn&rsquo;t there&hellip;
        </div>
        <div
          className="hiw-rise self-start max-w-[80%] bg-earth-100 border border-earth-200 px-3.5 py-2.5 text-xs text-basanite-800"
          style={{ ['--d' as string]: '1400ms' }}
        >
          How did you find out it wasn&rsquo;t idempotent?
        </div>
        <div
          className="hiw-rise self-end flex gap-1 px-3 py-2.5"
          style={{ ['--d' as string]: '2000ms' }}
        >
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="hiw-dot w-1.5 h-1.5 rounded-full bg-basanite-500"
              style={{ ['--d' as string]: `${i * 180}ms` }}
            />
          ))}
        </div>
      </div>
    </Window>
  )
}

// 05 — VS Code-style workbench with an AI agent pane.
function MockRound2() {
  const code = [28, 60, 44, 72, 36, 52]
  return (
    <Window title="Round 2 · AI Collaboration Workbench">
      <div className="flex gap-2">
        <div className="w-10 shrink-0 bg-basanite-900/90 p-2 flex flex-col gap-2.5 items-center">
          {[0, 1, 2].map(i => (
            <span key={i} className="w-4 h-4 bg-earth-500/50 rounded-sm" />
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-basanite-500 border-b border-earth-200 pb-1.5 mb-2.5 font-mono">
            ticket-482 · payments/refunds.ts
          </div>
          {code.map((w, i) => (
            <div
              key={i}
              className={`hiw-grow h-2 rounded-sm mb-2 ${i === 3 ? 'bg-gold-500/70' : 'bg-earth-300/80'}`}
              style={{ width: `${w}%`, ['--d' as string]: `${200 + i * 150}ms` }}
            />
          ))}
        </div>
        <div className="w-28 shrink-0 border-l border-earth-200 pl-2.5">
          <div className="text-[10px] text-basanite-500 mb-1.5">AI agent</div>
          <div
            className="hiw-pop text-[10px] px-2 py-0.5 border border-earth-300 text-basanite-700 w-fit mb-2"
            style={{ ['--d' as string]: '400ms' }}
          >
            Claude Code
          </div>
          <div
            className="hiw-rise bg-earth-100 border border-earth-200 px-2 py-2 flex gap-1"
            style={{ ['--d' as string]: '900ms' }}
          >
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="hiw-dot w-1.5 h-1.5 rounded-full bg-basanite-500"
                style={{ ['--d' as string]: `${i * 180}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </Window>
  )
}

// 06 — ranked candidate queue: top match with score, summary and a
// strong-recommend label; the others carry middling/low scores with
// their respective recommendations.
function MockReview() {
  return (
    <Window title="basanite.io/roles/backend-sr/candidates">
      <div className="text-[11px] text-basanite-500 mb-2.5">Ranked by composite score</div>

      {/* Top match */}
      <div
        className="hiw-rise border border-gold-500/60 bg-gold-500/5 px-3 py-2.5 mb-1.5"
        style={{ ['--d' as string]: '200ms' }}
      >
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-full bg-earth-200 flex items-center justify-center text-[10px] text-basanite-700 shrink-0">
            AK
          </span>
          <span className="text-xs text-basanite-900 font-semibold">A. Kaya</span>
          <span
            className="hiw-pop text-[10px] px-2 py-0.5 bg-gold-500 text-white shrink-0"
            style={{ ['--d' as string]: '700ms' }}
          >
            Top match
          </span>
          <div className="flex-1 h-2 bg-earth-200 rounded-sm overflow-hidden">
            <div
              className="hiw-grow h-full bg-gold-500"
              style={{ width: '92%', ['--d' as string]: '450ms' }}
            />
          </div>
          <span className="text-sm font-bold text-basanite-900">92</span>
        </div>
        <p
          className="hiw-rise text-[11px] text-basanite-600 leading-snug mt-2"
          style={{ ['--d' as string]: '900ms' }}
        >
          Strong judgment under ambiguity; verified AI-collaboration patterns;
          consistent, quote-grounded narrative across both rounds.
        </p>
        <span
          className="hiw-pop inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 bg-gold-500 text-white"
          style={{ ['--d' as string]: '1200ms' }}
        >
          Strongly recommend for the next round
        </span>
      </div>

      {/* Middle score */}
      <div
        className="hiw-rise flex items-center gap-2.5 px-3 py-2 mb-1.5 border border-earth-200 bg-white"
        style={{ ['--d' as string]: '500ms' }}
      >
        <span className="w-7 h-7 rounded-full bg-earth-200 flex items-center justify-center text-[10px] text-basanite-700 shrink-0">
          JM
        </span>
        <span className="text-xs text-basanite-900 w-20 shrink-0">J. Moreau</span>
        <div className="flex-1 h-2 bg-earth-200 rounded-sm overflow-hidden">
          <div
            className="hiw-grow h-full bg-gold-500/70"
            style={{ width: '74%', ['--d' as string]: '750ms' }}
          />
        </div>
        <span className="text-xs font-semibold text-basanite-900 w-6 text-right">74</span>
        <span className="text-[10px] px-2 py-0.5 border border-gold-500/50 text-gold-700 shrink-0">
          Recommend for the next round
        </span>
      </div>

      {/* Low score */}
      <div
        className="hiw-rise flex items-center gap-2.5 px-3 py-2 border border-earth-200 bg-white"
        style={{ ['--d' as string]: '800ms' }}
      >
        <span className="w-7 h-7 rounded-full bg-earth-200 flex items-center justify-center text-[10px] text-basanite-700 shrink-0">
          RS
        </span>
        <span className="text-xs text-basanite-900 w-20 shrink-0">R. Singh</span>
        <div className="flex-1 h-2 bg-earth-200 rounded-sm overflow-hidden">
          <div
            className="hiw-grow h-full bg-earth-400"
            style={{ width: '48%', ['--d' as string]: '1050ms' }}
          />
        </div>
        <span className="text-xs font-semibold text-basanite-900 w-6 text-right">48</span>
        <span className="text-[10px] px-2 py-0.5 border border-[#b03f28]/40 text-[#b03f28] shrink-0">
          Not recommended for the next round
        </span>
      </div>
    </Window>
  )
}

// ─── Step data ────────────────────────────────────────────────────────────

const STEPS = [
  {
    number: '01',
    title: 'Paste your job description',
    description:
      'Basanite accepts the same JD you would post on LinkedIn or Greenhouse. Our extraction agent pulls out role shape, seniority, and required capability profile.',
    tags: ['Plain text', 'LinkedIn friendly', 'Any format'],
    Mockup: MockPasteJD,
  },
  {
    number: '02',
    title: 'Configure evaluation dimensions',
    description:
      'The system recommends which dimensions to weight for this role and seniority, calibrated against our Tech-Industry Map of verticals, roles, and bands. You can adjust, add, or remove before going live.',
    tags: ['Judgment', 'Tacit knowledge', 'Human–AI collaboration'],
    Mockup: MockConfigure,
  },
  {
    number: '03',
    title: 'Share the assessment link',
    description:
      'Candidates receive a link, upload their CV, and enter an adaptive 20–40 minute interview with Basanite. Length is signal-driven, not timer-driven. No scheduling overhead on your side.',
    tags: ['Asynchronous', 'CV upload', 'Mobile friendly'],
    Mockup: MockShare,
  },
  {
    number: '04',
    title: 'Round 1: Structured Conversational Assessment',
    description:
      "Basanite asks questions grounded in the candidate's own CV, follows up on vagueness, tracks narrative consistency, and probes for genuine depth. This round generates signal across the cognitive, judgmental, and tacit-knowledge dimensions.",
    tags: ['Adaptive', 'Follow-up probes', '20–40 min'],
    Mockup: MockRound1,
  },
  {
    number: '05',
    title: 'Round 2: AI Collaboration Workbench',
    description:
      "A sandboxed VS Code environment with a role-matched codebase, a real ticket, and the candidate's choice of AI coding agent (Claude Code, Cursor, Copilot, Aider). We test engineers WITH AI rather than against it. It is the dimension no other interview measures.",
    tags: ['VS Code sandbox', 'Real codebase', 'Any AI agent'],
    Mockup: MockRound2,
  },
  {
    number: '06',
    title: 'Review ranked candidates',
    description:
      'Each candidate receives dimension scores grounded in specific quotes from Round 1 and observed work patterns from Round 2. You see a ranked queue with a briefing document for the final human interview.',
    tags: ['Ranked', 'Quote-grounded', 'Briefing report'],
    Mockup: MockReview,
  },
]

// ─── Slider ───────────────────────────────────────────────────────────────

export function HowItWorksSlider() {
  const [active, setActive] = useState(0)
  const [userNavigated, setUserNavigated] = useState(false)
  const [inView, setInView] = useState(false)
  const [reduced, setReduced] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReduced(true)
    }
    const el = rootRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.3 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Autoplay until the visitor takes over.
  useEffect(() => {
    if (reduced || userNavigated || !inView) return
    const id = setInterval(() => setActive(a => (a + 1) % STEPS.length), AUTOPLAY_MS)
    return () => clearInterval(id)
  }, [reduced, userNavigated, inView])

  const goTo = useCallback((i: number) => {
    setUserNavigated(true)
    setActive((i + STEPS.length) % STEPS.length)
  }, [])

  // Swipe navigation (mouse drag or touch).
  const dragStartX = useRef<number | null>(null)
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragStartX.current = e.clientX
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])
  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (dragStartX.current === null) return
      const dx = e.clientX - dragStartX.current
      dragStartX.current = null
      if (Math.abs(dx) > 40) goTo(active + (dx < 0 ? 1 : -1))
    },
    [active, goTo]
  )
  const onPointerCancel = useCallback(() => {
    dragStartX.current = null
  }, [])

  // Trackpad two-finger horizontal swipe. Deltas are accumulated (a swipe
  // arrives as many small wheel events) and a cooldown swallows the
  // momentum tail so one gesture moves one slide. The listener is attached
  // natively as non-passive so it can preventDefault the browser's
  // horizontal back/forward navigation gesture — otherwise swiping past the
  // last slide would navigate the page instead of looping to the first.
  const stageRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef(active)
  useEffect(() => {
    activeRef.current = active
  }, [active])

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    let acc = 0
    let last = 0
    let cooldownUntil = 0
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
      // We're handling this horizontal gesture, so stop the browser from
      // treating it as a history swipe (which looks like a full reload).
      e.preventDefault()
      const now = Date.now()
      if (now < cooldownUntil) {
        acc = 0
        return
      }
      if (now - last > 250) acc = 0
      last = now
      acc += e.deltaX
      if (Math.abs(acc) > 80) {
        goTo(activeRef.current + (acc > 0 ? 1 : -1))
        acc = 0
        cooldownUntil = now + 800
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [goTo])

  const step = STEPS[active]

  return (
    <div ref={rootRef}>
      {/* Mockup stage */}
      <div
        ref={stageRef}
        className="relative bg-earth-50 border border-earth-200 select-none cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'pan-y', overscrollBehaviorX: 'contain' }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div className="min-h-[360px] sm:min-h-[400px] flex items-center px-6 sm:px-12 py-6">
          {/* Remount on slide change so the animation sequence replays. */}
          <div key={active} className="w-full">
            <step.Mockup />
          </div>
        </div>

        <button
          onClick={() => goTo(active - 1)}
          aria-label="Previous step"
          className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white border border-earth-300 text-basanite-700 hover:border-gold-500 hover:text-gold-700 transition-colors flex items-center justify-center"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={() => goTo(active + 1)}
          aria-label="Next step"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white border border-earth-300 text-basanite-700 hover:border-gold-500 hover:text-gold-700 transition-colors flex items-center justify-center"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Step indicators */}
      <div className="flex justify-center gap-2.5 mt-6" role="tablist" aria-label="Steps">
        {STEPS.map((s, i) => (
          <button
            key={s.number}
            role="tab"
            aria-selected={i === active}
            aria-label={`Step ${s.number}: ${s.title}`}
            onClick={() => goTo(i)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              i === active
                ? 'bg-gold-500 shadow-[0_0_0_3px_rgba(196,154,47,0.2)]'
                : 'bg-earth-300 hover:bg-gold-500/50'
            }`}
          />
        ))}
      </div>

      {/* Step text */}
      <div key={`text-${active}`} className="hiw-rise max-w-2xl mx-auto text-center mt-6">
        <h3 className="font-display text-basanite-900 text-xl sm:text-2xl mb-2">
          {step.title}
        </h3>
        <p className="text-basanite-600 text-sm sm:text-base leading-relaxed mb-4">
          {step.description}
        </p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {step.tags.map(t => (
            <span key={t} className="text-xs px-2 py-1 border border-earth-300 text-basanite-600">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
