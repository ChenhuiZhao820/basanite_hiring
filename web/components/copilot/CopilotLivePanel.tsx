'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { startCapture, type CaptureHandle, type CaptureMode } from '@/lib/copilot-audio'
import { SaturationMap } from './SaturationMap'
import { ProbeCard, type Probe } from './ProbeCard'
import { AuthenticityFlags } from './AuthenticityFlags'
import { PacingIndicator } from './PacingIndicator'

type Props = {
  roleId: string
  sessionId: string
}

type SourceMode = CaptureMode | 'bot'

const TICK_INTERVAL_MS = 15_000

const CONSENT_STATEMENT =
  'I confirm the candidate has been informed that this interview is transcribed ' +
  'and analysed by Basanite to support evaluation, and that both parties consent.'

const MODE_OPTIONS: Array<{ value: SourceMode; label: string; hint: string }> = [
  {
    value: 'in_person',
    label: 'In person',
    hint: "This device's microphone hears both of you in the room.",
  },
  {
    value: 'bot',
    label: 'Google Meet — bot joins the call',
    hint: 'A disclosed "Basanite Copilot" participant joins your Meet and transcribes with speaker names. Most reliable for remote calls.',
  },
  {
    value: 'tab',
    label: 'Google Meet in this browser — share the tab',
    hint: 'Pick the Meet tab and tick "Also share tab audio". Works with headphones.',
  },
  {
    value: 'remote_mic',
    label: 'Remote call — microphone only',
    hint: 'Fallback: play the call through SPEAKERS (not headphones) so the mic can hear the candidate.',
  },
]

// The live interview screen: consent gate, audio source selection, and the
// four glanceable panels. The interviewer's eyes stay on the candidate —
// everything here is glanceable, nothing blocks.
export function CopilotLivePanel({ roleId, sessionId }: Props) {
  const router = useRouter()
  const [phase, setPhase] = useState<'loading' | 'consent' | 'live' | 'ending'>('loading')
  const [error, setError] = useState('')
  const [consentChecked, setConsentChecked] = useState(false)
  const [mode, setMode] = useState<SourceMode>('in_person')
  const [meetingUrl, setMeetingUrl] = useState('')
  const [starting, setStarting] = useState(false)
  const [candidateName, setCandidateName] = useState('')
  const [dimensions, setDimensions] = useState<string[]>([])
  const [targetMinutes, setTargetMinutes] = useState(30)
  const [elapsed, setElapsed] = useState(0)
  const [saturation, setSaturation] = useState<Record<string, string>>({})
  const [probe, setProbe] = useState<Probe | null>(null)
  const [flags, setFlags] = useState<string[]>([])
  const [pacing, setPacing] = useState('')
  const [partial, setPartial] = useState('')
  const [micError, setMicError] = useState('')
  const [botActive, setBotActive] = useState(false)

  const captureRef = useRef<CaptureHandle | null>(null)
  const startRef = useRef<number>(0)
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const clockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tickInFlightRef = useRef(false)

  const elapsedNow = useCallback(() => Math.max(0, Math.floor((Date.now() - startRef.current) / 1000)), [])

  const postSegments = useCallback(async (texts: string[]) => {
    if (texts.length === 0) return
    const segments = texts.map((text) => ({ text, elapsed_seconds: elapsedNow() }))
    try {
      await fetch(`/api/copilot/sessions/${sessionId}/transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segments }),
      })
    } catch {
      // Non-fatal: the next committed segment retriggers a post; the wrap-up
      // pass works off whatever reached the server.
    }
  }, [sessionId, elapsedNow])

  const runTick = useCallback(async () => {
    if (tickInFlightRef.current) return
    tickInFlightRef.current = true
    try {
      const res = await fetch(`/api/copilot/sessions/${sessionId}/tick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elapsed_seconds: elapsedNow() }),
      })
      const data = await res.json().catch(() => ({} as any))
      if (!res.ok || data.skip) return
      if (data.saturation) setSaturation(data.saturation)
      if (data.probe?.text) setProbe(data.probe)
      setFlags(Array.isArray(data.authenticity_flags) ? data.authenticity_flags : [])
      setPacing(typeof data.pacing === 'string' ? data.pacing : '')
    } catch {
      // Skipped tick — panel just doesn't refresh this round.
    } finally {
      tickInFlightRef.current = false
    }
  }, [sessionId, elapsedNow])

  const startClocks = useCallback(() => {
    if (!startRef.current) startRef.current = Date.now()
    if (!clockTimerRef.current) {
      clockTimerRef.current = setInterval(() => setElapsed(elapsedNow()), 1000)
    }
    if (!tickTimerRef.current) {
      tickTimerRef.current = setInterval(() => void runTick(), TICK_INTERVAL_MS)
    }
  }, [elapsedNow, runTick])

  const startBrowserCapture = useCallback(async (captureMode: CaptureMode) => {
    setMicError('')
    const tokenRes = await fetch('/api/copilot/scribe-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    })
    const tokenData = await tokenRes.json().catch(() => ({} as any))
    if (!tokenRes.ok || !tokenData.token) {
      throw new Error(tokenData.detail ?? tokenData.error ?? 'Failed to get transcription token')
    }
    captureRef.current = await startCapture(captureMode, tokenData.token, {
      onPartial: (text) => setPartial(text),
      onCommitted: (text) => {
        setPartial('')
        if (text) void postSegments([text])
      },
      onError: (message) => setMicError(message),
    })
  }, [sessionId, postSegments])

  const startBot = useCallback(async () => {
    const res = await fetch(`/api/copilot/sessions/${sessionId}/bot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meeting_url: meetingUrl.trim() }),
    })
    const data = await res.json().catch(() => ({} as any))
    if (!res.ok) throw new Error(data.detail ?? data.error ?? 'Failed to send the bot to the call')
    setBotActive(true)
  }, [sessionId, meetingUrl])

  // Load the session and route to the right phase.
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/copilot/sessions/${sessionId}`)
        const data = await res.json().catch(() => ({} as any))
        if (!res.ok) throw new Error(data.detail ?? data.error ?? 'Failed to load session')
        if (cancelled) return
        const status = data.session?.status
        if (status === 'review' || status === 'wrapup' || status === 'submitted') {
          router.replace(`/dashboard/roles/${roleId}/copilot/${sessionId}/review`)
          return
        }
        setCandidateName(data.assessment?.candidate_name ?? '')
        setDimensions(data.role?.dimensions ?? [])
        setTargetMinutes(data.role?.interview_duration_minutes ?? 30)
        const live = data.session?.live_state
        if (live?.saturation) setSaturation(live.saturation)
        if (status === 'live' && data.session?.started_at) {
          // Page reload mid-interview: consent already recorded — resume.
          startRef.current = Date.parse(data.session.started_at)
          if (data.session?.bot?.id) {
            setMode('bot')
            setBotActive(true)
          }
        }
        setPhase('consent')
      } catch (e: any) {
        if (!cancelled) setError(e.message)
      }
    }
    load()
    return () => {
      cancelled = true
      if (tickTimerRef.current) clearInterval(tickTimerRef.current)
      if (clockTimerRef.current) clearInterval(clockTimerRef.current)
      captureRef.current?.stop()
    }
  }, [sessionId, roleId, router])

  async function handleConsentAndStart() {
    setError('')
    setStarting(true)
    try {
      if (mode === 'bot' && !/^https:\/\/meet\.google\.com\//.test(meetingUrl.trim())) {
        throw new Error('Paste the Google Meet link (https://meet.google.com/xxx-xxxx-xxx).')
      }
      const res = await fetch(`/api/copilot/sessions/${sessionId}/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statement: CONSENT_STATEMENT }),
      })
      const data = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(data.detail ?? data.error ?? 'Failed to record consent')

      if (mode === 'bot') {
        if (!botActive) await startBot()
      } else {
        await startBrowserCapture(mode)
      }
      startClocks()
      setPhase('live')
    } catch (e: any) {
      setError(e.message ?? 'Failed to start')
    } finally {
      setStarting(false)
    }
  }

  const logProbeAction = useCallback(async (action: 'asked' | 'adapted' | 'dismissed', probeData: Probe | null) => {
    if (!probeData) return
    try {
      await fetch(`/api/copilot/sessions/${sessionId}/probe-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          dimension_key: probeData.dimension,
          technique: probeData.technique,
          probe_text: probeData.text,
          reason: probeData.reason,
        }),
      })
    } catch {
      // Metric logging is best-effort; never interrupts the interview.
    }
  }, [sessionId])

  async function handleProbeAction(action: 'asked' | 'adapted' | 'dismissed') {
    const current = probe
    setProbe(null)
    if (!current) return
    await logProbeAction(action, current)
  }

  // Broadcast live state to the Chrome extension so it can render an overlay
  // inside the Google Meet tab.
  useEffect(() => {
    if (phase !== 'live') return
    window.postMessage({
      type: 'BASANITE_COPILOT_TICK',
      payload: {
        sessionId,
        roleId,
        candidateName,
        elapsed,
        targetMinutes,
        mode,
        saturation,
        probe,
        flags,
        pacing,
      },
    }, '*')
  }, [phase, sessionId, roleId, candidateName, elapsed, targetMinutes, mode, saturation, probe, flags, pacing])

  // Listen for probe actions sent from the Chrome extension overlay.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== window) return
      const msg = event.data
      if (msg?.type === 'BASANITE_COPILOT_PROBE_ACTION') {
        const payload = msg.payload || {}
        const current = probe
        setProbe(null)
        void logProbeAction(payload.action, payload.probe || current)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [probe, logProbeAction])

  function beginEnding() {
    setPhase('ending')
    if (tickTimerRef.current) { clearInterval(tickTimerRef.current); tickTimerRef.current = null }
    if (clockTimerRef.current) { clearInterval(clockTimerRef.current); clockTimerRef.current = null }
    captureRef.current?.stop()
    window.postMessage({ type: 'BASANITE_COPILOT_DISABLE_OVERLAY' }, '*')
  }

  async function handleEnd() {
    beginEnding()
    try {
      // Wrap-up also tells the meeting bot to leave server-side.
      const res = await fetch(`/api/copilot/sessions/${sessionId}/wrapup`, { method: 'POST' })
      const data = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(data.detail ?? data.error ?? 'Wrap-up failed — retry')
      router.push(`/dashboard/roles/${roleId}/copilot/${sessionId}/review`)
    } catch (e: any) {
      setError(e.message)
      setPhase('live')
    }
  }

  // Poll for session state changes while the interview is active. When the
  // Google Meet ends without the hirer clicking "End interview", the backend
  // sees the bot leave and triggers auto wrap-up; this loop picks that up and
  // redirects to review once the proposed review is ready.
  useEffect(() => {
    if (phase !== 'live' && phase !== 'ending') return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/copilot/sessions/${sessionId}`)
        const data = await res.json().catch(() => ({} as any))
        const status = data.session?.status
        if (status === 'review' || status === 'submitted') {
          window.postMessage({ type: 'BASANITE_COPILOT_DISABLE_OVERLAY' }, '*')
          router.push(`/dashboard/roles/${roleId}/copilot/${sessionId}/review`)
        } else if (status === 'wrapup' && phase === 'live') {
          beginEnding()
        }
      } catch {
        // Polling is best-effort; the next tick or user click can still end it.
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [phase, sessionId, roleId, router])

  if (phase === 'loading') {
    return <p className="text-sm text-basanite-400 dark:text-earth-500">Loading session…</p>
  }

  if (phase === 'consent') {
    return (
      <div className="max-w-xl border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-6">
        <h2 className="font-display text-lg text-basanite-900 dark:text-earth-100 mb-3">Before you start</h2>
        <p className="text-sm text-basanite-600 dark:text-earth-300 mb-4">
          Tell {candidateName || 'the candidate'} that Basanite transcribes and analyses this
          conversation to support your evaluation, and confirm they consent. They will receive
          their own feedback report afterwards.
        </p>

        <p className="text-xs text-basanite-600 dark:text-earth-300 font-medium uppercase tracking-wide mb-2">How is this interview happening?</p>
        <div className="space-y-2 mb-5">
          {MODE_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="capture-mode"
                checked={mode === opt.value}
                onChange={() => setMode(opt.value)}
                className="mt-0.5 accent-gold-600"
              />
              <span>
                <span className="block text-sm text-basanite-800 dark:text-earth-100">{opt.label}</span>
                <span className="block text-xs text-basanite-400 dark:text-earth-500">{opt.hint}</span>
              </span>
            </label>
          ))}
        </div>

        {mode === 'bot' && !botActive && (
          <div className="mb-5">
            <label htmlFor="meet-url" className="block text-xs text-basanite-600 dark:text-earth-300 font-medium uppercase tracking-wide mb-2">
              Google Meet link
            </label>
            <input
              id="meet-url"
              type="url"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://meet.google.com/xxx-xxxx-xxx"
              className="w-full border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 px-3 py-2.5 text-sm text-basanite-900 dark:text-earth-100 focus:outline-none focus:border-gold-500 font-mono"
            />
            <p className="text-xs text-basanite-400 dark:text-earth-500 mt-1.5">
              The bot appears in the call as &ldquo;Basanite Copilot (transcribing)&rdquo; — a disclosed participant. Admit it from the Meet waiting room.
            </p>
          </div>
        )}

        <label className="flex items-start gap-2.5 mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
            className="mt-0.5 accent-gold-600"
          />
          <span className="text-xs text-basanite-600 dark:text-earth-300">{CONSENT_STATEMENT}</span>
        </label>
        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
        {micError && <p className="text-xs text-red-600 mb-3">{micError}</p>}
        <button
          type="button"
          disabled={!consentChecked || starting}
          onClick={handleConsentAndStart}
          className="bg-basanite-900 hover:bg-gold-600 dark:bg-gold-600 dark:hover:bg-gold-500 text-white text-xs font-medium px-5 py-2.5 transition-colors disabled:opacity-50"
        >
          {starting ? 'Starting…' : mode === 'bot' ? 'Send bot & start' : 'Start listening'}
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <p className="text-sm text-basanite-800 dark:text-earth-100">
            {phase === 'ending'
              ? 'Analysing interview…'
              : mode === 'bot'
                ? `Bot in the call — interviewing ${candidateName || 'candidate'}`
                : `Listening — interviewing ${candidateName || 'candidate'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.postMessage({ type: 'BASANITE_COPILOT_ENABLE_OVERLAY' }, '*')}
            disabled={phase === 'ending'}
            className="border border-earth-200 dark:border-basanite-600 text-basanite-600 dark:text-earth-300 text-xs font-medium px-3 py-2 hover:bg-earth-50 dark:hover:bg-basanite-700 transition-colors disabled:opacity-60"
            title="Open a live suggestions overlay inside the Google Meet tab (requires the Basanite Copilot extension)"
          >
            Open in Meet
          </button>
          <button
            type="button"
            onClick={handleEnd}
            disabled={phase === 'ending'}
            className="border border-red-300 text-red-600 text-xs font-medium px-4 py-2 hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-60"
          >
            {phase === 'ending' ? 'Scoring…' : 'End interview'}
          </button>
        </div>
      </div>

      {micError && <p className="text-xs text-red-600 mb-3">{micError}</p>}
      {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="space-y-4">
          <SaturationMap dimensions={dimensions} saturation={saturation} />
          <PacingIndicator pacing={pacing} elapsedSeconds={elapsed} targetMinutes={targetMinutes} />
        </div>
        <div className="space-y-4">
          <ProbeCard probe={probe} onAction={handleProbeAction} />
          <AuthenticityFlags flags={flags} />
        </div>
      </div>

      {partial && (
        <p className="text-xs text-basanite-300 dark:text-earth-600 italic truncate" aria-live="polite">
          {partial}
        </p>
      )}
    </div>
  )
}
