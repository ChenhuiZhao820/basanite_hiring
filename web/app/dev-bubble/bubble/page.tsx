'use client'

// TEMPORARY debug page for visual verification of AgentBubble.
// Two source modes:
//   • Mic ON  → AnalyserNode reads your microphone in real time
//   • Synth   → speech-like synthetic FFT for hands-free preview
// Delete before merging if it gets pushed.

import { useCallback, useEffect, useRef, useState } from 'react'
import InterviewHeader from '@/components/InterviewHeader'
import SelfPane from '@/components/SelfPane'
import AgentPane from '@/components/AgentPane'
import ErrorToast from '@/components/ErrorToast'

type Phase = 'idle' | 'live' | 'ending' | 'done' | 'error'
type Source = 'mic' | 'synth' | 'off'

// ─── Synthetic speech envelope (used in 'synth' mode) ───────────────────
function speechEnvelope(t: number): number {
  const cycle = 1500
  const phase = (t % cycle) / cycle
  const burst = phase < 0.55 ? Math.sin((phase / 0.55) * Math.PI) : 0
  const flicker = 0.5 + 0.5 * Math.sin(t * 0.018)
  return burst * (0.55 + 0.45 * flicker)
}

function makeSyntheticFft(t: number, out: Uint8Array): void {
  const env = speechEnvelope(t)
  const formant = (Math.sin(t * 0.0009) * 0.35 + 0.45)
  for (let i = 0; i < out.length; i++) {
    const u = i / out.length
    const decay = Math.exp(-i * 0.035)
    const formantBoost = Math.exp(-Math.pow((u - formant) * 6, 2)) * 0.7
    const v = env * (decay * 0.6 + formantBoost)
    out[i] = Math.min(255, Math.floor(255 * v))
  }
}

export default function BubbleDebugPage() {
  const [phase, setPhase] = useState<Phase>('live')
  const [source, setSource] = useState<Source>('synth')
  const [micErr, setMicErr] = useState('')

  const tStart = useRef(performance.now())
  const previewRef = useRef<HTMLVideoElement>(null)

  // Audio plumbing for mic mode.
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  // Generic args pin these to the narrow ArrayBuffer-backed type the
  // AnalyserNode API expects (TS 5.7+ stricter typing on typed arrays).
  const synthBufRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(new ArrayBuffer(128)))
  const micBufRef = useRef<Uint8Array<ArrayBuffer> | null>(null)

  // Bring up / tear down the mic on toggle.
  useEffect(() => {
    if (source !== 'mic') {
      // teardown
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      analyserRef.current = null
      micBufRef.current = null
      // Don't close the AudioContext — Safari/Firefox dislike re-creating it.
      return
    }

    let cancelled = false
    setMicErr('')
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        })
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop())
          return
        }
        streamRef.current = stream

        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        const ctx = audioCtxRef.current ?? new Ctx()
        audioCtxRef.current = ctx
        if (ctx.state === 'suspended') await ctx.resume()

        const src = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256                 // → 128 frequency bins
        analyser.smoothingTimeConstant = 0.55
        src.connect(analyser)
        analyserRef.current = analyser
        micBufRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount))
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Mic access failed'
        setMicErr(msg)
        setSource('off')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [source])

  const getFft = useCallback(() => {
    if (source === 'off') {
      return { freq: undefined, volume: 0, isSpeaking: false }
    }
    if (source === 'mic') {
      const analyser = analyserRef.current
      const buf = micBufRef.current
      if (!analyser || !buf) return { freq: undefined, volume: 0, isSpeaking: false }
      analyser.getByteFrequencyData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) sum += buf[i]
      const volume = sum / buf.length / 255
      return { freq: buf, volume, isSpeaking: true }
    }
    // synth
    const t = performance.now() - tStart.current
    const buf = synthBufRef.current
    makeSyntheticFft(t, buf)
    return {
      freq: buf,
      volume: speechEnvelope(t),
      isSpeaking: true,
    }
  }, [source])

  // Synthetic elapsed counter so the header shows a moving timer in the demo
  // (parallel of VoiceInterview's `elapsed` state).
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (phase !== 'live') return
    const id = window.setInterval(() => setElapsed(s => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [phase])

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-basanite-950 text-earth-100">
      <InterviewHeader
        title="Technical Screening with Baz"
        phase={phase}
        elapsedSeconds={elapsed}
        onEnd={() => setPhase('error')}
      />
      <main className="flex-1 grid grid-cols-2 gap-px bg-earth-200/10 min-h-0">
        <SelfPane ref={previewRef} phase={phase} label="You" />
        <AgentPane getFft={getFft} phase={phase} label="Baz" />
      </main>
      <ErrorToast message={phase === 'error' ? 'Test error toast.' : (micErr || '')} />

      <div className="fixed top-20 left-4 z-30 bg-basanite-900/80 backdrop-blur-sm text-earth-100 text-xs p-3 space-y-2 border border-earth-200/15">
        <div className="uppercase tracking-widest text-gold-400 font-semibold">Debug</div>
        <div className="flex gap-1">
          {(['idle', 'live', 'error'] as Phase[]).map(p => (
            <button
              key={p}
              onClick={() => setPhase(p)}
              className={`px-2 py-1 border ${phase === p ? 'border-gold-500 text-gold-300' : 'border-earth-200/20 text-earth-200/60'}`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(['off', 'synth', 'mic'] as Source[]).map(s => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={`px-2 py-1 border ${source === s ? 'border-gold-500 text-gold-300' : 'border-earth-200/20 text-earth-200/60'}`}
            >
              {s === 'mic' ? 'Mic' : s === 'synth' ? 'Synth' : 'Off'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
