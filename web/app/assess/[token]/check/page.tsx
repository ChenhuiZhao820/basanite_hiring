'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { LogoMark } from '@/components/Logo'

type Phase = 'requesting' | 'preview' | 'test_recording' | 'test_playback' | 'denied'

const TEST_SECONDS = 5

export default function DeviceCheckPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('requesting')
  const [elapsed, setElapsed] = useState(0)
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)

  // Acquire mic+camera once on mount. The same stream is used for live preview
  // and for the test recording. Playback switches the element over to the blob.
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
    <div className="min-h-screen bg-earth-50 flex flex-col">
      <nav className="border-b border-earth-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center">
          <LogoMark size={24} dark />
          <span className="font-display text-basanite-900 text-sm ml-2">Basanite</span>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-lg w-full bg-white border border-earth-200 p-8">
          <h1 className="font-display text-2xl text-basanite-900 mb-2">Check your camera and mic</h1>
          <p className="text-basanite-500 text-sm mb-6">
            This interview is conducted by voice. Please make sure your camera and microphone work before starting.
          </p>

          {phase === 'denied' ? (
            <div>
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 mb-4">
                We couldn't access your camera or microphone. Check your browser's site permissions and reload this page.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-basanite-900 hover:bg-gold-600 text-white font-medium py-2.5 text-sm transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <div className="relative w-full aspect-video bg-basanite-900 overflow-hidden mb-4">
                {/* Single video element: mirrored for live preview (feels natural),
                    un-mirrored during playback so controls aren't flipped and
                    playback matches what the interviewer will see. */}
                <video
                  ref={videoRef}
                  playsInline
                  className={`w-full h-full object-cover ${isPlayback ? '' : 'scale-x-[-1]'}`}
                />
                {phase === 'test_recording' && (
                  <span className="absolute top-2 left-2 flex items-center gap-1.5 text-xs text-white bg-red-600 px-2 py-1 font-medium">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    REC {TEST_SECONDS - elapsed}s
                  </span>
                )}
              </div>

              {phase === 'requesting' && (
                <p className="text-sm text-basanite-500">Requesting camera access…</p>
              )}

              {phase === 'preview' && (
                <>
                  <p className="text-xs text-basanite-500 mb-3">
                    You should see yourself above. Press the button to record a {TEST_SECONDS}-second test so you can check your mic too.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={startTestRecording}
                      className="flex-1 bg-basanite-900 hover:bg-gold-600 text-white font-medium py-2.5 text-sm transition-colors"
                    >
                      Record {TEST_SECONDS}-second test
                    </button>
                  </div>
                </>
              )}

              {phase === 'test_recording' && (
                <p className="text-sm text-basanite-500">Say something, "hello, one, two, three" works. Finishing automatically…</p>
              )}

              {phase === 'test_playback' && (
                <>
                  <p className="text-xs text-basanite-500 mb-3">
                    Could you see and hear yourself clearly? If yes, start the interview. If not, record another test.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={redoTest}
                      className="flex-1 border border-earth-300 hover:border-basanite-500 text-basanite-700 font-medium py-2.5 text-sm transition-colors"
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
