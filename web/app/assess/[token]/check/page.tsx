'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { LogoMark } from '@/components/Logo'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { getFlipPreference, setFlipPreference } from '@/lib/mirroredStream'

type Phase = 'requesting' | 'preview' | 'test_recording' | 'test_playback' | 'denied'

const TEST_SECONDS = 5

export default function DeviceCheckPage() {
  useDocumentTitle('Device check')
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('requesting')
  const [elapsed, setElapsed] = useState(0)
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null)
  // Whether the interview recording is horizontally mirrored to match the
  // candidate's selfie view. Persisted so the interview page picks it up.
  const [flip, setFlip] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)

  // Acquire mic+camera once on mount. The same stream is used for live preview
  // and for the test recording. Playback switches the element over to the blob.
  useEffect(() => {
    setFlip(getFlipPreference())
  }, [])

  function toggleFlip(next: boolean) {
    setFlip(next)
    setFlipPreference(next)
  }

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        setPhase('preview')
      } catch {
        setPhase('denied')
      }
    }
    init()
    return () => {
      cancelled = true
      if (timerRef.current) window.clearInterval(timerRef.current)
      try { recorderRef.current?.state === 'recording' && recorderRef.current.stop() } catch {}
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      if (playbackUrl) URL.revokeObjectURL(playbackUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Bind the right source to the single <video> element whenever the phase
  // flips. This is the only place srcObject/src are touched, so the two
  // modes never fight.
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (phase === 'test_playback' && playbackUrl) {
      el.srcObject = null
      el.muted = false
      el.controls = true
      el.src = playbackUrl
      el.load()
      el.play().catch(() => {})
    } else if (phase === 'preview' || phase === 'test_recording') {
      el.removeAttribute('src')
      el.controls = false
      el.muted = true
      if (streamRef.current && el.srcObject !== streamRef.current) {
        el.srcObject = streamRef.current
      }
      el.play().catch(() => {})
    }
  }, [phase, playbackUrl])

  function startTestRecording() {
    if (!streamRef.current) return
    chunksRef.current = []
    const mimeCandidates = ['video/webm;codecs=vp8,opus', 'video/webm']
    const mimeType = mimeCandidates.find(t => MediaRecorder.isTypeSupported(t)) ?? ''
    const mr = new MediaRecorder(streamRef.current, {
      mimeType: mimeType || undefined,
    })
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      setPlaybackUrl(url)
      setPhase('test_playback')
    }
    recorderRef.current = mr
    mr.start()
    setPhase('test_recording')
    setElapsed(0)
    timerRef.current = window.setInterval(() => {
      setElapsed(e => {
        const next = e + 1
        if (next >= TEST_SECONDS) {
          window.clearInterval(timerRef.current!)
          timerRef.current = null
          try { mr.state === 'recording' && mr.stop() } catch {}
        }
        return next
      })
    }, 1000)
  }

  function redoTest() {
    if (playbackUrl) { URL.revokeObjectURL(playbackUrl); setPlaybackUrl(null) }
    setPhase('preview')
  }

  function proceed() {
    // Release the camera so the interview page can re-acquire cleanly.
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    router.push(`/assess/${token}/interview`)
  }

  const isPlayback = phase === 'test_playback'

  return (
    <div className="min-h-screen bg-earth-50 dark:bg-basanite-950 flex flex-col">
      <nav className="border-b border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-900">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center">
          <LogoMark size={24} dark />
          <span className="font-display text-basanite-900 dark:text-earth-100 text-sm ml-2">Basanite</span>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-lg w-full bg-white dark:bg-basanite-900 border border-earth-200 dark:border-basanite-700 p-8">
          <h1 className="font-display text-2xl text-basanite-900 dark:text-earth-100 mb-2">Check your camera and mic</h1>
          <p className="text-basanite-500 dark:text-earth-200/60 text-sm mb-6">
            This interview is conducted by voice. Please make sure your camera and microphone work before starting.
          </p>

          {phase === 'denied' ? (
            <div>
              <p className="text-sm text-red-700 dark:text-red-200 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/40 px-4 py-3 mb-4">
                We couldn't access your camera or microphone. Check your browser's site permissions and reload this page.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-basanite-900 dark:bg-gold-500 text-white dark:text-basanite-950 hover:bg-gold-600 dark:hover:bg-gold-400 font-medium py-2.5 text-sm transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6 border border-earth-200 dark:border-basanite-700 bg-earth-50 dark:bg-basanite-950/40 p-4">
                <h2 className="text-sm font-medium text-basanite-800 dark:text-earth-100 mb-2">Before you start</h2>
                <ul className="space-y-2 text-xs text-basanite-600 dark:text-earth-200/80">
                  <li className="flex items-start gap-2">
                    <span className="text-gold-500 mt-0.5">&#9670;</span>
                    Check your internet connection and battery. Plug in if you can, and find a quiet place with no background noise.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gold-500 mt-0.5">&#9670;</span>
                    The interview is done only once, so speak as if you're talking to a human interviewer, naturally and at your own pace.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gold-500 mt-0.5">&#9670;</span>
                    Need to re-answer while you're still on a question? Just say "Let's redo it" and the interviewer will ask it again. Want to hear the question once more? Simply say "Repeat". If the interviewer moves on before you've finished, speak up — exactly as you would with a human interviewer.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gold-500 mt-0.5">&#9670;</span>
                    Once you've finished a question and the interviewer moves on to the next one, that answer can't be redone.
                  </li>
                </ul>
              </div>

              <div className="relative w-full aspect-video bg-basanite-900 overflow-hidden mb-4">
                {/* Single video element. Mirrored (selfie view) when the flip
                    preference is on — matching how the interview recording is
                    saved — so live preview and test playback look identical to
                    what the candidate will see of themselves. */}
                <video
                  ref={videoRef}
                  playsInline
                  className={`w-full h-full object-cover ${flip ? 'scale-x-[-1]' : ''}`}
                />
                {phase === 'test_recording' && (
                  <span className="absolute top-2 left-2 flex items-center gap-1.5 text-xs text-white bg-red-600 px-2 py-1 font-medium">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    REC {TEST_SECONDS - elapsed}s
                  </span>
                )}
              </div>

              {phase === 'requesting' && (
                <p className="text-sm text-basanite-500 dark:text-earth-200/60">Requesting camera access…</p>
              )}

              {phase === 'preview' && (
                <>
                  <p className="text-xs text-basanite-500 dark:text-earth-200/60 mb-3">
                    You should see yourself above. Press the button to record a {TEST_SECONDS}-second test so you can check your mic too.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={startTestRecording}
                      className="flex-1 bg-basanite-900 dark:bg-gold-500 text-white dark:text-basanite-950 hover:bg-gold-600 dark:hover:bg-gold-400 font-medium py-2.5 text-sm transition-colors"
                    >
                      Record {TEST_SECONDS}-second test
                    </button>
                  </div>
                </>
              )}

              {phase === 'test_recording' && (
                <p className="text-sm text-basanite-500 dark:text-earth-200/60">Say something, "hello, one, two, three" works. Finishing automatically…</p>
              )}

              {phase === 'test_playback' && (
                <>
                  <p className="text-xs text-basanite-500 dark:text-earth-200/60 mb-3">
                    Could you see and hear yourself clearly? If yes, start the interview. If not, record another test.
                  </p>
                  <label className="flex items-start gap-3 cursor-pointer mb-4">
                    <input
                      type="checkbox"
                      checked={flip}
                      onChange={e => toggleFlip(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-gold-600 cursor-pointer"
                    />
                    <span className="text-xs text-basanite-600 dark:text-earth-200/80 leading-relaxed">
                      <span className="font-medium text-basanite-800 dark:text-earth-100">Flip camera</span> — mirror the video so your recording looks exactly like what you see in your own camera.
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={redoTest}
                      className="flex-1 border border-earth-300 dark:border-basanite-700 hover:border-basanite-500 dark:hover:border-gold-500 text-basanite-700 dark:text-earth-200 font-medium py-2.5 text-sm transition-colors"
                    >
                      Record again
                    </button>
                    <button
                      onClick={proceed}
                      className="flex-1 bg-gold-500 hover:bg-gold-400 text-basanite-950 font-medium py-2.5 text-sm transition-colors"
                    >
                      Start interview
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
