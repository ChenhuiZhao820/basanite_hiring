'use client'

import { useConversation } from '@elevenlabs/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogoMark } from '@/components/Logo'

type Props = {
  token: string
  assessmentId: string
  signedUrl: string
  prompt: string
  firstMessage: string
  targetSeconds: number
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
      : 'bg-earth-500/40'
  const labelClass = done || active ? 'text-earth-100' : 'text-earth-200/50'
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
      return 'SYSTEM UPDATE: 5 minutes elapsed. Plenty of time — keep probing for concrete, evidence-backed answers.'
    case 10:
      return `SYSTEM UPDATE: 10 minutes elapsed. About halfway to the typical ${targetMinutes} minute mark.`
    case 15:
      return 'SYSTEM UPDATE: 15 minutes elapsed. Approaching the typical target. If your dimensions are well covered, start moving toward close.'
    case 20:
      return 'SYSTEM UPDATE: 20 minutes elapsed — the typical target. If you have enough signal across every selected dimension, close now: deliver one brief thank-you sentence and call the end_call tool. Only continue if a dimension still has weak evidence.'
    case 30:
      return 'SYSTEM UPDATE: 30 minutes elapsed — past typical. Wrap unless you are mid-probe on critical ambiguity. Call end_call as soon as you have what you need.'
    case 45:
      return 'SYSTEM UPDATE: 45 minutes elapsed — upper bound. Close immediately with one short thank-you sentence and call the end_call tool now.'
    case 55:
      return 'SYSTEM DIRECTIVE: 55 minutes — final warning. Your next utterance MUST be a ≤15-word thank-you, then call end_call immediately.'
    default:
      return null
  }
}

export default function VoiceInterview({
  token,
  assessmentId,
  signedUrl,
  prompt,
  firstMessage,
  targetSeconds,
}: Props) {
  const router = useRouter()
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [phase, setPhase] = useState<Phase>('idle')
  const [errMsg, setErrMsg] = useState('')
  const [elapsed, setElapsed] = useState(0)

  const captureStreamRef = useRef<MediaStream | null>(null)
  const previewRef = useRef<HTMLVideoElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const conversationIdRef = useRef<string | null>(null)
  const timerRef = useRef<number | null>(null)
  const firedCuesRef = useRef<Set<number>>(new Set())
  const ceilingFiredRef = useRef(false)
  const endQueuedRef = useRef(false)
  const endInFlightRef = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const phaseRef = useRef<Phase>('idle')
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
      setPhase('live')
    },
    onDisconnect: () => {
      // Fires whether the agent invoked end_call, we called endSession, or the
      // network dropped. handleEnd is idempotent.
      void handleEnd()
    },
    onMessage: ({ message, source }) => {
      if (!message) return
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
  })

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

  // Auto-scroll the transcript panel.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [bubbles])

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

        // Parallel silent recorder. Tight bitrate so a 40-min session still
        // fits in the 50 MB default bucket cap.
        const mimeCandidates = ['video/webm;codecs=vp8,opus', 'video/webm']
        const mimeType = mimeCandidates.find(t => MediaRecorder.isTypeSupported(t)) ?? ''
        const mr = new MediaRecorder(stream, {
          mimeType: mimeType || undefined,
          videoBitsPerSecond: 400_000,
          audioBitsPerSecond: 48_000,
        })
        mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
        recorderRef.current = mr
        mr.start(1000)

        const id = await conversation.startSession({
          signedUrl,
          connectionType: 'websocket',
          overrides: {
            agent: {
              prompt: { prompt },
              firstMessage,
            },
          },
        })
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
              'SYSTEM DIRECTIVE: 60 minutes — absolute end. Close with a single short thank-you sentence and call end_call right now.',
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

  // Display the elapsed time, counting up from 0:00.
  const timeLabel = useMemo(() => {
    const m = Math.floor(elapsed / 60)
    const s = elapsed % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }, [elapsed])

  // Progress bar tracks elapsed against the target, capping at 100% at the target.
  // After the target is exceeded, the bar stays at 100%.
  const progressPct = Math.min(100, (elapsed / targetSeconds) * 100)

  const phaseLabel = useMemo(() => ({
    idle: 'Connecting…',
    live: 'Live interview',
    ending: 'Finalising…',
    done: 'Complete',
    error: 'Error',
  }[phase]), [phase])

  // Full-screen completion takeover. Replaces the chat UI entirely — no tiny
  // "saving…" blip at the bottom of a dead camera feed.
  if (phase === 'ending' || phase === 'done') {
    const isDone = phase === 'done'
    const elapsedMin = Math.max(1, Math.round(elapsed / 60))
    return (
      <div className="h-screen flex flex-col bg-basanite-950 text-earth-50 relative overflow-hidden">
        {/* Soft radial gold glow behind the content. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(196,154,47,0.18) 0%, rgba(196,154,47,0.04) 35%, transparent 70%)',
          }}
        />

        <div className="relative flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="mb-10 opacity-90">
            <LogoMark size={56} />
          </div>

          <p className="text-[10px] uppercase tracking-[0.2em] text-gold-500/80 mb-5 font-medium">
            Assessment complete
          </p>

          <h1 className="font-display text-5xl sm:text-6xl text-earth-50 mb-6 max-w-2xl leading-[1.1]">
            {isDone ? 'All done.' : 'Wrapping up.'}
          </h1>

          <p className="text-base sm:text-lg text-earth-200/80 max-w-xl leading-relaxed mb-12">
            {isDone
              ? `Thanks for the ${elapsedMin}-minute conversation. Your feedback report is being generated now — we'll email it to you as soon as it's ready.`
              : 'Saving your session and generating your feedback report. One moment.'}
          </p>

          <div className="flex items-center justify-center gap-3 text-xs text-earth-200/60 uppercase tracking-widest">
            <StepDot active label="Session saved" done={isDone} />
            <span className="text-earth-200/30">·</span>
            <StepDot active={isDone} label="Report generating" done={false} pending={!isDone} />
            <span className="text-earth-200/30">·</span>
            <StepDot active={false} label="Emailed to you" done={false} pending />
          </div>

          {isDone && (
            <button
              onClick={() => router.push(`/assess/${token}/complete`)}
              className="mt-12 inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-basanite-950 font-medium px-6 py-3 text-sm transition-colors"
            >
              View feedback report
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          )}
        </div>

        {/* Thin progress line at the very bottom — slowly fills during 'ending', solid when done. */}
        <div className="relative h-0.5 bg-earth-900">
          <div
            className={`h-full bg-gold-500 transition-all ${isDone ? 'duration-500' : 'duration-[3000ms]'}`}
            style={{ width: isDone ? '100%' : '70%' }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-earth-50">
      <header className="flex-shrink-0 border-b border-earth-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-display text-basanite-900 text-sm">Basanite</span>
          <div className="flex items-center gap-4">
            <span className="text-xs text-basanite-400">{phaseLabel}</span>
            <span className="text-xs text-basanite-300 font-mono">
              {timeLabel} <span className="opacity-60">· target {targetMinutes}m</span>
            </span>
          </div>
        </div>
        <div className="h-0.5 bg-earth-200">
          <div
            className="h-full bg-gold-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          {phase === 'error' && (
            <div className="bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {errMsg}
            </div>
          )}
          {bubbles.length === 0 && phase !== 'error' && (
            <p className="text-sm text-basanite-400 italic">Waiting for the interviewer to begin speaking…</p>
          )}
          {bubbles.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${
                m.role === 'user'
                  ? 'bg-basanite-900 text-earth-50 px-5 py-3.5'
                  : 'bg-white border border-earth-200 px-5 py-3.5'
              }`}>
                {m.role === 'assistant' && (
                  <p className="text-[10px] text-basanite-400 uppercase tracking-widest font-medium mb-2">Interviewer</p>
                )}
                <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user' ? 'text-earth-100' : 'text-basanite-700'
                }`}>
                  {m.content}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-earth-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <div className="relative w-24 h-24 bg-basanite-900 overflow-hidden shrink-0">
            <video ref={previewRef} muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
            {phase === 'live' && (
              <span className="absolute top-1 left-1 flex items-center gap-1 text-[10px] text-white bg-red-600 px-1.5 py-0.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> REC
              </span>
            )}
          </div>
          <div className="flex-1">
            <p className="text-xs text-basanite-500 mb-2">
              {phase === 'live' && (conversation.isSpeaking ? 'The interviewer is speaking…' : "Your turn — the interviewer is listening.")}
              {phase === 'idle' && 'Connecting your call…'}
              {phase === 'error' && errMsg}
            </p>
            {phase === 'live' ? (
              <button
                onClick={() => requestGracefulEnd()}
                className="px-4 py-2 border border-earth-300 hover:border-basanite-500 text-basanite-700 text-sm font-medium transition-colors"
              >
                End interview early
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
