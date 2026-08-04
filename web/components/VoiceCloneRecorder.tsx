'use client'

// Voice clone recorder.
//
// Hirer reads a fixed 60-second prompt aloud, ticks the consent box, and
// hits Submit. We POST the audio + metadata to /api/voices/clone which
// proxies to FastAPI which calls ElevenLabs IVC and persists the result
// against the org. On success we navigate back to /dashboard/voices.
//
// MediaRecorder mime fallback chain mirrors VoiceInterview.tsx (the same
// browser-compat hierarchy the candidate flow proved out).

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const PROMPT_TEXT = `Hi, I'm one of the founders here, and I'll be conducting your interview today. Before we get started, let me give you a quick sense of how this is going to feel.

We're not looking for someone who has every answer ready. What we're really after is how you actually think — what you do when the path isn't obvious, when there's missing information, when the stakes are real. So when I ask about a project, I'll often dig into the small decisions: why you chose this over that, what surprised you, what you'd change with hindsight.

Take your time. There's no trick here. Specific examples beat polished summaries, and "I don't know" is a perfectly fine answer when it's true. Ready when you are.`

const PROMPT_TARGET_SECONDS = 60
const MIN_RECORDING_SECONDS = 30

type Phase = 'idle' | 'recording' | 'recorded' | 'submitting' | 'error'

export function VoiceCloneRecorder() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [consent, setConsent] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const blobRef = useRef<Blob | null>(null)
  const timerRef = useRef<number | null>(null)

  // Always release the mic on unmount.
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (timerRef.current) window.clearInterval(timerRef.current)
  }, [])

  function pickMime(): string {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg',
    ]
    for (const m of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return m
    }
    return ''
  }

  async function startRecording() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = pickMime()
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 64_000 }) : new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const type = mr.mimeType || 'audio/webm'
        blobRef.current = new Blob(chunksRef.current, { type })
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null }
        setPhase('recorded')
      }
      mr.start(1000)
      recorderRef.current = mr
      setElapsed(0)
      timerRef.current = window.setInterval(() => {
        setElapsed(prev => {
          const next = prev + 1
          // Auto-stop at 90s — IVC doesn't need more, and longer recordings
          // start to bloat the upload.
          if (next >= 90 && mr.state === 'recording') mr.stop()
          return next
        })
      }, 1000)
      setPhase('recording')
    } catch {
      setError('Couldn’t access the microphone. Allow mic access and try again.')
      setPhase('error')
    }
  }

  function stopRecording() {
    const mr = recorderRef.current
    if (mr && mr.state === 'recording') mr.stop()
  }

  function resetRecording() {
    blobRef.current = null
    chunksRef.current = []
    setElapsed(0)
    setPhase('idle')
  }

  async function submit() {
    if (!blobRef.current) return
    if (!consent) return
    if (!name.trim()) {
      setError('Give the voice a name.')
      return
    }
    setError('')
    setPhase('submitting')
    try {
      const fd = new FormData()
      fd.append('audio', blobRef.current, `voice-clone.${blobRef.current.type.includes('mp4') ? 'm4a' : 'webm'}`)
      fd.append('name', name.trim().slice(0, 80))
      if (description.trim()) fd.append('description', description.trim().slice(0, 200))
      fd.append('consent_user_agent', navigator.userAgent.slice(0, 400))
      const res = await fetch('/api/voices/clone', { method: 'POST', body: fd })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.detail ?? data?.error ?? `Upload failed (${res.status})`)
      }
      router.push('/dashboard/voices')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to clone voice')
      setPhase('error')
    }
  }

  const submitting = phase === 'submitting'
  const canSubmit = phase === 'recorded' && elapsed >= MIN_RECORDING_SECONDS && consent && name.trim().length > 0
  const tooShort = phase === 'recorded' && elapsed < MIN_RECORDING_SECONDS

  return (
    <div className="max-w-2xl">
      <Link href="/dashboard/voices" className="text-xs text-basanite-400 dark:text-earth-500 hover:text-basanite-600 dark:hover:text-earth-300 transition-colors mb-4 inline-block">
        &larr; Back to voices
      </Link>
      <h1 className="font-display text-2xl text-basanite-900 dark:text-earth-100 mb-2">Clone a voice</h1>
      <p className="text-sm text-basanite-500 dark:text-earth-400 mb-8">
        Read the prompt below for about 60 seconds. ElevenLabs analyses the recording and creates a voice your team can pick for any role&rsquo;s interviewer.
      </p>

      {/* Naming */}
      <div className="mb-6">
        <label className="block text-xs font-medium text-basanite-600 dark:text-earth-300 mb-1.5 uppercase tracking-wide">Voice name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Aditya"
          maxLength={80}
          className="w-full max-w-sm border border-earth-300 dark:border-basanite-700 bg-white dark:bg-basanite-800 placeholder-basanite-400 dark:placeholder-earth-500 px-4 py-2.5 text-sm text-basanite-900 dark:text-earth-100 outline-none focus:border-gold-500 transition-colors"
        />
      </div>

      <div className="mb-8">
        <label className="block text-xs font-medium text-basanite-600 dark:text-earth-300 mb-1.5 uppercase tracking-wide">Description <span className="text-basanite-400 dark:text-earth-500 normal-case">(optional)</span></label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="CTO, Manchester"
          maxLength={200}
          className="w-full max-w-sm border border-earth-300 dark:border-basanite-700 bg-white dark:bg-basanite-800 placeholder-basanite-400 dark:placeholder-earth-500 px-4 py-2.5 text-sm text-basanite-900 dark:text-earth-100 outline-none focus:border-gold-500 transition-colors"
        />
      </div>

      {/* Prompt */}
      <div className="mb-6">
        <label className="block text-xs font-medium text-basanite-600 dark:text-earth-300 mb-1.5 uppercase tracking-wide">Read this aloud</label>
        <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-5 text-sm leading-relaxed text-basanite-800 dark:text-earth-200 whitespace-pre-line">
          {PROMPT_TEXT}
        </div>
      </div>

      {/* Recorder */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          {phase === 'idle' || phase === 'error' || phase === 'recorded' ? (
            <button
              type="button"
              onClick={phase === 'recorded' ? resetRecording : startRecording}
              className="inline-flex items-center gap-2 px-5 py-3 bg-basanite-900 dark:bg-gold-600 text-white text-sm font-medium hover:bg-gold-600 dark:hover:bg-gold-500 transition-colors"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              {phase === 'recorded' ? 'Re-record' : 'Start recording'}
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex items-center gap-2 px-5 py-3 bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
            >
              <span className="w-2.5 h-2.5 rounded-sm bg-white" />
              Stop
            </button>
          )}
          <div className="text-xs text-basanite-500 dark:text-earth-400 font-mono tabular-nums">
            {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')} / {String(Math.floor(PROMPT_TARGET_SECONDS / 60)).padStart(2, '0')}:{String(PROMPT_TARGET_SECONDS % 60).padStart(2, '0')}
          </div>
        </div>
        {tooShort && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
            Need at least {MIN_RECORDING_SECONDS} seconds for a usable clone — try again.
          </p>
        )}
      </div>

      {/* Consent */}
      <label className="flex items-start gap-3 mb-6 cursor-pointer">
        <input
          type="checkbox"
          checked={consent}
          onChange={e => setConsent(e.target.checked)}
          className="mt-1 w-4 h-4 accent-gold-600 cursor-pointer"
        />
        <span className="text-sm text-basanite-700 dark:text-earth-200 leading-snug">
          I am the speaker, and I have rights to use this voice as the interviewer voice on Basanite.
          I understand this voice is processed by ElevenLabs as a sub-processor — see the{' '}
          <Link href="/privacy" target="_blank" className="text-gold-600 dark:text-gold-400 underline">privacy notice</Link>.
        </span>
      </label>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit || submitting}
        className="px-6 py-3 bg-basanite-900 dark:bg-gold-600 text-white text-sm font-medium hover:bg-gold-600 dark:hover:bg-gold-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? 'Cloning…' : 'Clone this voice'}
      </button>
    </div>
  )
}
