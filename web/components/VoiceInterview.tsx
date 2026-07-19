'use client'

import { useConversation } from '@elevenlabs/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogoMark } from '@/components/Logo'
import InterviewHeader from '@/components/InterviewHeader'
import SelfPane from '@/components/SelfPane'
import AgentPane from '@/components/AgentPane'
import ErrorToast from '@/components/ErrorToast'
import { createMirroredStream, getFlipPreference, type MirroredCapture } from '@/lib/mirroredStream'

type Props = {
  token: string
  assessmentId: string
  signedUrl: string
  /** Legacy override path: full system prompt sent to the browser. Kept
   *  for backward compat until ENG-31's Conversation Initiation Webhook
   *  is configured on the ElevenLabs agent side. Prefer `sessionToken`. */
  prompt?: string
  /** ENG-31 path: opaque per-session token. The browser sends it as a
   *  dynamic variable; ElevenLabs hits /elevenlabs/conv-init server-to-
   *  server to fetch the real prompt. The browser never sees the rubric. */
  sessionToken?: string
  firstMessage: string
  targetSeconds: number
  /** Optional ElevenLabs voice ID. When set, overrides the agent's
   *  default voice for this session via overrides.tts.voiceId. */
  voiceId?: string
  /** Header title; defaults to "Technical Screening with Baz". */
  screeningTitle?: string
}

type Bubble = { role: 'user' | 'assistant'; content: string }
type Phase = 'idle' | 'live' | 'ending' | 'done' | 'error'

// The agent owns the end: it calls the ElevenLabs `end_call` tool (or delivers
// a verbal close) once it has the signal it needs. The client just:
//   (1) counts elapsed time
//   (2) sends periodic SYSTEM UPDATE cues so the agent can pace itself
//   (3) enforces a hard 60-minute safety ceiling
// Never sever the connection mid-agent-speech.

const ABSOLUTE_CEILING_SECONDS = 60 * 60
const AGENT_DRAIN_MS = 1800
const COMPLETION_HOLD_SECONDS = 4  // how long the 'done' state is visible before routing

// Director (background Opus supervisor): fires the first check at 2:00, then
// every 3 minutes. Skips if a call is in flight or nothing has changed.
const DIRECTOR_FIRST_TICK_SECONDS = 120
const DIRECTOR_INTERVAL_SECONDS = 180

function StepDot({ active, done, pending, label }: { active?: boolean; done?: boolean; pending?: boolean; label: string }) {
  const dotClass = done
    ? 'bg-gold-500'
    : active
      ? 'bg-gold-500 animate-pulse'
      : 'bg-basanite-400/40'
  const labelClass = done || active ? 'text-basanite-700' : 'text-basanite-400'
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      <span className={`text-[10px] uppercase tracking-widest ${labelClass}`}>{label}</span>
      {pending && !done && !active && (
        <span className="sr-only">pending</span>
      )}
    </span>
  )
}

function cueForMinute(minute: number, targetMinutes: number): string | null {
  switch (minute) {
    case 5:
      return 'SYSTEM UPDATE: 5 minutes elapsed. Plenty of time, keep probing for concrete, evidence-backed answers.'
    case 10:
      return `SYSTEM UPDATE: 10 minutes elapsed. About halfway to the typical ${targetMinutes} minute mark.`
    case 15:
      return 'SYSTEM UPDATE: 15 minutes elapsed. Approaching the typical target. If your dimensions are well covered, start moving toward close.'
    case 20:
      return 'SYSTEM UPDATE: 20 minutes elapsed, the typical target. If you have enough signal across every selected dimension, close now: deliver one brief thank-you sentence and call the end_call tool. Only continue if a dimension still has weak evidence.'
    case 30:
      return 'SYSTEM UPDATE: 30 minutes elapsed, past typical. Wrap unless you are mid-probe on critical ambiguity. Call end_call as soon as you have what you need.'
    case 45:
      return 'SYSTEM UPDATE: 45 minutes elapsed, upper bound. Close immediately with one short thank-you sentence and call the end_call tool now.'
    case 55:
      return 'SYSTEM DIRECTIVE: 55 minutes, final warning. Your next utterance MUST be a ≤15-word thank-you, then call end_call immediately.'
    default:
      return null
  }
}

export default function VoiceInterview({
  token,
  assessmentId,
  signedUrl,
  prompt,
  sessionToken,
  firstMessage,
  voiceId,
  targetSeconds,
  screeningTitle = 'Technical Screening with Baz',
}: Props) {
  const router = useRouter()
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [phase, setPhase] = useState<Phase>('idle')
  const [errMsg, setErrMsg] = useState('')
  const [elapsed, setElapsed] = useState(0)
  // Agent mode from the SDK's onModeChange. 'listening' = agent is waiting on
  // the candidate; 'speaking' = agent is talking. Drives the header badge.
  const [agentMode, setAgentMode] = useState<'listening' | 'speaking' | null>(null)
  // Throttled user-VAD signal so we can show "You're speaking" without thrashing.
  const [userIsSpeaking, setUserIsSpeaking] = useState(false)
  const vadHighSinceRef = useRef(0)

  const captureStreamRef = useRef<MediaStream | null>(null)
  const mirrorRef = useRef<MirroredCapture | null>(null)
  const previewRef = useRef<HTMLVideoElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const conversationIdRef = useRef<string | null>(null)
  const timerRef = useRef<number | null>(null)
  const firedCuesRef = useRef<Set<number>>(new Set())
  const ceilingFiredRef = useRef(false)
  const endQueuedRef = useRef(false)
  const endInFlightRef = useRef(false)
  const phaseRef = useRef<Phase>('idle')
  // Time the WebSocket connected (performance.now). Used by the defensive
  // disconnect handler to distinguish a real interview-ending disconnect
  // from an immediate connection failure (ElevenLabs rejecting overrides,
  // network drop pre-handshake, agent config error). Without this we used
  // to treat any disconnect as a graceful end and call handleEnd, which
  // wrote a 'completed' assessment with zero transcript.
  const connectedAtRef = useRef<number | null>(null)
  // Number of messages observed before disconnect. Combined with
  // time-since-connect, lets us spot "session opened then died" vs
  // "real conversation ended".
  const messageCountRef = useRef(0)
  // Director (background Opus supervisor)
  const bubblesRef = useRef<Bubble[]>([])
  const directorInFlightRef = useRef(false)
  const directorLastTickRef = useRef(0)              // elapsed seconds at last fire
  const directorLastUserTurnsRef = useRef(0)         // user-message count at last fire

  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { bubblesRef.current = bubbles }, [bubbles])

  const targetMinutes = Math.max(1, Math.round(targetSeconds / 60))

  const conversation = useConversation({
    onConnect: ({ conversationId }) => {
      conversationIdRef.current = conversationId
      connectedAtRef.current = performance.now()
      setPhase('live')
    },
    onDisconnect: () => {
      // Fires whether the agent invoked end_call, we called endSession, or
      // the connection died. Distinguish "real end of interview" from
      // "session never really started" by looking at elapsed time since
      // onConnect AND whether any messages were exchanged. Both must be
      // healthy for us to treat this as a graceful completion.
      const connectedAt = connectedAtRef.current
      const sinceConnectMs = connectedAt == null ? Infinity : performance.now() - connectedAt
      const hadMessages = messageCountRef.current > 0
      const tooQuick = sinceConnectMs < 10_000 && !hadMessages
      if (tooQuick) {
        // Most common cause: ElevenLabs agent rejected our session-level
        // overrides (e.g. overrides.tts.voiceId disabled in the agent's
        // platform_settings) and dropped the WebSocket. Surface as an
        // explicit error rather than silently flipping the assessment to
        // 'completed' with no transcript.
        console.error('Voice session disconnected before any conversation occurred', { sinceConnectMs })
        setErrMsg('The interview connection dropped before it could start. Please refresh and try again.')
        setPhase('error')
        return
      }
      // handleEnd is idempotent.
      void handleEnd()
    },
    onMessage: ({ message, source }) => {
      if (!message) return
      messageCountRef.current += 1
      const role: Bubble['role'] = source === 'user' ? 'user' : 'assistant'
      setBubbles(prev => [...prev, { role, content: message }])

      // Backup: if the agent gives a verbal close but somehow forgets the tool,
      // end anyway. Short message, farewell phrase, no question mark.
      if (source === 'ai') {
        const trimmed = message.trim()
        const looksLikeClose = /\b(thank|conclude|wrap|appreciat|best of luck|goodbye|good luck|that (is|'?s) (all|it)|end(s)? (the|our) interview)\b/i.test(trimmed)
        const hasQuestion = /\?/.test(trimmed)
        const shortEnough = trimmed.split(/\s+/).length <= 40
        if (looksLikeClose && !hasQuestion && shortEnough && elapsed >= 60) {
          requestGracefulEnd()
        }
      }
    },
    onError: (message) => {
      console.error('ElevenLabs error', message)
      setErrMsg('The voice connection failed. Please refresh and try again.')
      setPhase('error')
    },
    onModeChange: ({ mode }) => {
      // 'speaking' = Baz is speaking, 'listening' = Baz is waiting for the
      // candidate. Drives the "Listening… / Baz speaking" badge.
      setAgentMode(mode)
    },
    onVadScore: ({ vadScore }) => {
      // Hysteresis on raw VAD score so brief spikes don't flicker the label.
      // Score is 0..1; treat >0.55 as user speaking, <0.35 as not, dead band
      // in the middle counts as "stay where we are". Functional setter so we
      // never rely on a stale closure value of `userIsSpeaking`.
      const now = performance.now()
      setUserIsSpeaking(prev => {
        if (vadScore > 0.55 && !prev) {
          vadHighSinceRef.current = now
          return true
        }
        if (vadScore < 0.35 && prev && now - vadHighSinceRef.current > 250) {
          return false
        }
        return prev
      })
    },
  })

  // Hold a live ref to the conversation so the bubble's rAF loop can sample
  // FFT/volume each frame without re-rendering this component on every tick.
  const conversationRef = useRef(conversation)
  conversationRef.current = conversation

  const getFft = useCallback(() => {
    const c = conversationRef.current
    let freq: Uint8Array | undefined
    let volume = 0
    let isSpeaking = false
    try {
      freq = c?.getOutputByteFrequencyData?.()
      volume = c?.getOutputVolume?.() ?? 0
      isSpeaking = !!c?.isSpeaking
    } catch {
      // Pre-connect, the SDK may not have an analyser yet.
    }
    return { freq, volume, isSpeaking }
  }, [])

  // Director: ask our backend (running Opus) for one tactical directive based
  // on the transcript so far, and forward it to the live agent. Cheap: ~6-10
  // calls per interview. Safe: runs in parallel, zero impact on voice latency.
  async function runDirector(elapsedSecs: number) {
    if (directorInFlightRef.current) return
    const currentBubbles = bubblesRef.current
    if (currentBubbles.length < 3) return
    const userTurns = currentBubbles.filter(b => b.role === 'user').length
    if (userTurns <= directorLastUserTurnsRef.current) return  // no new candidate speech

    directorInFlightRef.current = true
    directorLastTickRef.current = elapsedSecs
    directorLastUserTurnsRef.current = userTurns

    try {
      const res = await fetch(`/api/assess/${token}/director`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessment_id: assessmentId,
          elapsed_seconds: elapsedSecs,
          messages: currentBubbles.slice(-120).map(b => ({
            role: b.role === 'user' ? 'user' : 'assistant',
            content: b.content,
          })),
        }),
      })
      if (!res.ok) return
      const data = await res.json().catch(() => null) as { directive?: string | null; skip?: boolean } | null
      if (!data || data.skip || !data.directive) return

      const directive = String(data.directive).trim()
      if (!directive) return

      // Don't send directives after we've already queued the end.
      if (phaseRef.current !== 'live') return
      if (endQueuedRef.current) return

      const message = directive === 'wrap_now'
        ? 'DIRECTOR: You have enough concrete signal across every selected dimension. Close the interview now: one short thank-you sentence, then call the end_call tool.'
        : `DIRECTOR: ${directive}`
      try { conversation.sendContextualUpdate(message) } catch (e) { console.warn('director push failed', e) }
    } catch (e) {
      console.warn('director call failed', e)
    } finally {
      directorInFlightRef.current = false
    }
  }

  // Never cut mid-agent-speech: queue the end and fire it when the agent is silent.
  function requestGracefulEnd() {
    if (endInFlightRef.current) return
    endQueuedRef.current = true
    if (!conversation.isSpeaking) {
      window.setTimeout(() => {
        if (endQueuedRef.current && !conversation.isSpeaking) void endConversation()
      }, AGENT_DRAIN_MS)
    }
    // Otherwise the isSpeaking watcher below ends it on the next true→false edge.
  }

  // Kick off: acquire camera+mic, start the ElevenLabs session.
  useEffect(() => {
    let cancelled = false
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true,
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        captureStreamRef.current = stream
        if (previewRef.current) {
          previewRef.current.srcObject = stream
          await previewRef.current.play().catch(() => {})
        }

        // Record through a horizontally-flipped canvas when the candidate
        // opted to mirror their camera on the device-check screen, so the
        // saved file matches the selfie view they see. Otherwise record the
        // raw stream. The live preview always uses the raw stream (SelfPane
        // mirrors it in CSS), so this only affects the stored recording.
        let recordStream = stream
        if (getFlipPreference()) {
          const mirror = createMirroredStream(stream)
          mirrorRef.current = mirror
          recordStream = mirror.stream
        }

        // Parallel silent recorder. Tight bitrate so a 40-min session still
        // fits in the 50 MB default bucket cap.
        const mimeCandidates = ['video/webm;codecs=vp8,opus', 'video/webm']
        const mimeType = mimeCandidates.find(t => MediaRecorder.isTypeSupported(t)) ?? ''
        const mr = new MediaRecorder(recordStream, {
          mimeType: mimeType || undefined,
          videoBitsPerSecond: 400_000,
          audioBitsPerSecond: 48_000,
        })
        mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
        recorderRef.current = mr
        mr.start(1000)

        // Two paths exist while ENG-31 rolls out:
        //
        // - sessionToken (preferred): the prompt lives server-side. We
        //   pass the token via dynamicVariables; ElevenLabs forwards it
        //   to /elevenlabs/conv-init which returns the real prompt as
        //   conversation_config_override. The browser never sees the
        //   rubric/JD/custom_instructions.
        //
        // - prompt (legacy): the full prompt is in the browser bundle
        //   and is set as an agent.prompt override here. This path stays
        //   active until the ElevenLabs agent's Conversation Initiation
        //   Webhook URL is configured. Tracked as ENG-31.
        const startArgs: {
          signedUrl: string
          connectionType: 'websocket'
          overrides?: {
            agent?: { prompt?: { prompt: string }; firstMessage?: string }
            tts?: { voiceId: string }
          }
          dynamicVariables?: Record<string, string>
        } = {
          signedUrl,
          connectionType: 'websocket',
        }

        if (sessionToken) {
          startArgs.dynamicVariables = { session_token: sessionToken }
          // firstMessage stays a client override so the candidate sees
          // their name in the opener even if the webhook is briefly
          // slow; the server-side prompt still wins for everything else.
          if (voiceId) startArgs.overrides = { agent: { firstMessage }, tts: { voiceId } }
          else startArgs.overrides = { agent: { firstMessage } }
        } else if (prompt) {
          startArgs.overrides = {
            agent: { prompt: { prompt }, firstMessage },
            ...(voiceId ? { tts: { voiceId } } : {}),
          }
        } else {
          throw new Error('Voice session missing both prompt and sessionToken')
        }

        const id = await conversation.startSession(startArgs)
        if (id) conversationIdRef.current = id
      } catch (e: any) {
        if (cancelled) return
        console.error('Voice session start failed', e)
        setErrMsg(
          e?.name === 'NotAllowedError'
            ? 'Microphone or camera access was denied. Please allow access and reload.'
            : 'We could not start the interview. Please reload and try again.',
        )
        setPhase('error')
      }
    }
    start()
    return () => {
      cancelled = true
      try { recorderRef.current?.state === 'recording' && recorderRef.current.stop() } catch {}
      mirrorRef.current?.stop()
      mirrorRef.current = null
      captureStreamRef.current?.getTracks().forEach(t => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Master timer: counts elapsed seconds, fires cues at minute marks, and
  // enforces the absolute ceiling. End decisions always go through
  // requestGracefulEnd so they wait for agent silence.
  useEffect(() => {
    if (phase !== 'live') return
    timerRef.current = window.setInterval(() => {
      setElapsed(e => {
        const next = e + 1

        if (next > 0 && next % 60 === 0) {
          const minute = next / 60
          if (!firedCuesRef.current.has(minute)) {
            const cue = cueForMinute(minute, targetMinutes)
            if (cue) {
              firedCuesRef.current.add(minute)
              try { conversation.sendContextualUpdate(cue) } catch (err) { console.warn('cue failed', err) }
            }
          }
        }

        // Director: first tick at 2:00, then every 3 min.
        const sinceLast = next - directorLastTickRef.current
        const dueForFirst = directorLastTickRef.current === 0 && next >= DIRECTOR_FIRST_TICK_SECONDS
        const dueForInterval = directorLastTickRef.current > 0 && sinceLast >= DIRECTOR_INTERVAL_SECONDS
        if ((dueForFirst || dueForInterval) && !endQueuedRef.current) {
          void runDirector(next)
        }

        if (next >= ABSOLUTE_CEILING_SECONDS && !ceilingFiredRef.current) {
          ceilingFiredRef.current = true
          try {
            conversation.sendContextualUpdate(
              'SYSTEM DIRECTIVE: 60 minutes, absolute end. Close with a single short thank-you sentence and call end_call right now.',
            )
          } catch {}
          requestGracefulEnd()
        }
        return next
      })
    }, 1000)
    return () => {
      if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, targetMinutes])

  // End-watcher: when the agent falls silent after an end is queued, tear down.
  useEffect(() => {
    if (!endQueuedRef.current) return
    if (!conversation.isSpeaking) {
      const t = window.setTimeout(() => {
        if (endQueuedRef.current && !conversation.isSpeaking) void endConversation()
      }, AGENT_DRAIN_MS)
      return () => window.clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.isSpeaking])

  async function endConversation() {
    if (endInFlightRef.current) return
    endInFlightRef.current = true
    try { await conversation.endSession() } catch {}
    // onDisconnect handles the rest.
  }

  async function handleEnd() {
    if (phaseRef.current === 'done' || phaseRef.current === 'ending') return
    setPhase('ending')

    const recorder = recorderRef.current
    let blob: Blob | null = null
    if (recorder) {
      blob = await new Promise<Blob | null>(resolve => {
        if (recorder.state === 'inactive') {
          resolve(new Blob(chunksRef.current, { type: 'video/webm' }))
          return
        }
        recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: 'video/webm' }))
        try { recorder.stop() } catch { resolve(null) }
      })
    }
    captureStreamRef.current?.getTracks().forEach(t => t.stop())

    let recordingPath: string | null = null
    if (blob && blob.size > 0) {
      try {
        const form = new FormData()
        form.append('assessment_id', assessmentId)
        form.append('file', blob, 'session.webm')
        const res = await fetch(`/api/assess/${token}/upload-recording`, { method: 'POST', body: form })
        if (res.ok) {
          const data = await res.json()
          recordingPath = data.recording_path ?? null
        }
      } catch (e) {
        console.warn('recording upload failed', e)
      }
    }

    try {
      await fetch(`/api/assess/${token}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessment_id: assessmentId,
          conversation_id: conversationIdRef.current,
          recording_path: recordingPath,
        }),
      })
    } catch (e) {
      console.warn('finalize failed', e)
    }

    setPhase('done')
    window.setTimeout(() => router.push(`/assess/${token}/complete`), COMPLETION_HOLD_SECONDS * 1000)
  }

  // Full-screen completion takeover. Replaces the chat UI entirely, no tiny
  // "saving…" blip at the bottom of a dead camera feed.
  if (phase === 'ending' || phase === 'done') {
    const isDone = phase === 'done'
    const elapsedMin = Math.max(1, Math.round(elapsed / 60))
    return (
      <div className="h-screen flex flex-col bg-earth-50 text-basanite-900 relative overflow-hidden">
        {/* Soft radial gold glow behind the content. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(196,154,47,0.12) 0%, rgba(196,154,47,0.03) 35%, transparent 70%)',
          }}
        />

        <div className="relative flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="mb-10 opacity-90">
            <LogoMark size={56} dark />
          </div>

          <p className="text-[10px] uppercase tracking-[0.2em] text-gold-600 mb-5 font-semibold">
            Assessment complete
          </p>

          <h1 className="font-display text-5xl sm:text-6xl text-basanite-900 mb-6 max-w-2xl leading-[1.1]">
            {isDone ? 'All done.' : 'Wrapping up.'}
          </h1>

          <p className="text-base sm:text-lg text-basanite-600 max-w-xl leading-relaxed mb-12">
            {isDone
              ? `Thanks for the ${elapsedMin}-minute conversation. Your feedback report is being generated now, we'll email it to you as soon as it's ready.`
              : 'Saving your session and generating your feedback report. One moment.'}
          </p>

          <div className="flex items-center justify-center gap-3 text-xs text-basanite-500 uppercase tracking-widest">
            <StepDot active label="Session saved" done={isDone} />
            <span className="text-basanite-400">·</span>
            <StepDot active={isDone} label="Report generating" done={false} pending={!isDone} />
            <span className="text-basanite-400">·</span>
            <StepDot active={false} label="Emailed to you" done={false} pending />
          </div>

          {isDone && (
            <button
              onClick={() => router.push(`/assess/${token}/complete`)}
              className="mt-12 inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-white font-semibold px-6 py-3 text-sm transition-colors"
            >
              View feedback report
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          )}
        </div>

        {/* Thin progress line at the very bottom, slowly fills during 'ending', solid when done. */}
        <div className="relative h-0.5 bg-earth-900">
          <div
            className={`h-full bg-gold-500 transition-all ${isDone ? 'duration-500' : 'duration-[3000ms]'}`}
            style={{ width: isDone ? '100%' : '70%' }}
          />
        </div>
      </div>
    )
  }

  // Compose the status label shown in the header. Priority:
  //   1) phase 'idle' → connection isn't fully up yet
  //   2) Baz speaking
  //   3) Candidate speaking
  //   4) Otherwise: listening (Baz waiting on the candidate)
  const callStatus: 'connecting' | 'agent-speaking' | 'user-speaking' | 'listening' =
    phase === 'idle'
      ? 'connecting'
      : conversation.isSpeaking || agentMode === 'speaking'
        ? 'agent-speaking'
        : userIsSpeaking
          ? 'user-speaking'
          : 'listening'

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-earth-50 text-basanite-900 dark:bg-basanite-950 dark:text-earth-100 transition-colors duration-150">
      <InterviewHeader
        title={screeningTitle}
        phase={phase}
        elapsedSeconds={elapsed}
        onEnd={() => requestGracefulEnd()}
        callStatus={callStatus}
      />
      <main className="flex-1 grid grid-cols-2 gap-px bg-earth-200/40 dark:bg-earth-200/10 min-h-0">
        <SelfPane
          ref={previewRef}
          phase={phase}
          label="You"
          speaking={callStatus === 'user-speaking'}
        />
        <AgentPane
          getFft={getFft}
          phase={phase}
          label="Baz"
          speaking={callStatus === 'agent-speaking'}
        />
      </main>
      <ErrorToast message={phase === 'error' ? errMsg : ''} />
    </div>
  )
}
