'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  token: string
  assessmentId: string
  messageIndex: number
  disabled: boolean
  onTranscript: (transcript: string, recordingPath: string) => void
}

type Phase = 'idle' | 'recording' | 'uploading' | 'error'

export default function RecorderControl({ token, assessmentId, messageIndex, disabled, onTranscript }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [errMsg, setErrMsg] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const previewRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const pendingBlobRef = useRef<Blob | null>(null)
  const timerRef = useRef<number | null>(null)

  // Acquire camera once on mount; keep it warm between answers.
  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop())
          return
        }
        streamRef.current = stream
        if (previewRef.current) {
          previewRef.current.srcObject = stream
          previewRef.current.play().catch(() => {})
        }
      } catch (e: any) {
        setPhase('error')
        setErrMsg('Camera or microphone unavailable. Check browser permissions and reload.')
      }
    }
    init()
    return () => {
      cancelled = true
      if (timerRef.current) window.clearInterval(timerRef.current)
      recorderRef.current?.state === 'recording' && recorderRef.current.stop()
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  function startRecording() {
    if (!streamRef.current || disabled || phase !== 'idle') return
    chunksRef.current = []
    const mr = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' })
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      chunksRef.current = []
      pendingBlobRef.current = blob
      void uploadAndTranscribe(blob)
    }
    recorderRef.current = mr
    mr.start()
    setPhase('recording')
    setErrMsg('')
    setElapsed(0)
    timerRef.current = window.setInterval(() => setElapsed(e => e + 1), 1000)
  }

  function stopRecording() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null }
    setPhase('uploading')
  }

  async function uploadAndTranscribe(blob: Blob) {
    const form = new FormData()
    form.append('assessment_id', assessmentId)
    form.append('message_index', String(messageIndex))
    form.append('file', blob, `answer-${messageIndex}.webm`)

    try {
      const res = await fetch(`/api/assess/${token}/transcribe`, { method: 'POST', body: form })
      if (!res.ok) throw new Error(`Upload failed (${res.status})`)
      const data = await res.json()
      const transcript = (data.transcript ?? '').trim()
      if (!transcript) {
        setPhase('error')
        setErrMsg("We couldn't hear you. Try again and speak clearly.")
        return
      }
      pendingBlobRef.current = null
      setPhase('idle')
      onTranscript(transcript, data.recording_path)
    } catch (e: any) {
      setPhase('error')
      setErrMsg(e.message ?? 'Upload failed. Click Retry to send your answer again.')
    }
  }

  function retryUpload() {
    if (pendingBlobRef.current) {
      setPhase('uploading')
      setErrMsg('')
      void uploadAndTranscribe(pendingBlobRef.current)
    } else {
      setPhase('idle')
      setErrMsg('')
    }
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60)
    return `${m}:${(s % 60).toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20 bg-basanite-900 overflow-hidden shrink-0">
        <video
          ref={previewRef}
          muted
          playsInline
          className="w-full h-full object-cover scale-x-[-1]"
        />
        {phase === 'recording' && (
          <span className="absolute top-1 left-1 flex items-center gap-1 text-[10px] text-white bg-red-600 px-1.5 py-0.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> REC
          </span>
        )}
      </div>

      <div className="flex-1">
        {phase === 'error' && (
          <p className="text-xs text-red-700 mb-2">{errMsg}</p>
        )}
        {phase === 'recording' && (
          <p className="text-xs text-basanite-500 mb-2">Recording — {fmt(elapsed)}. Take your time.</p>
        )}
        {phase === 'uploading' && (
          <p className="text-xs text-basanite-500 mb-2">Transcribing your answer…</p>
        )}
        {phase === 'idle' && !disabled && (
          <p className="text-xs text-basanite-400 mb-2">Press record, speak your answer, then press stop.</p>
        )}
        {phase === 'idle' && disabled && (
          <p className="text-xs text-basanite-400 mb-2">Interviewer is responding…</p>
        )}

        <div className="flex gap-2">
          {phase === 'idle' && (
            <button
              type="button"
              onClick={startRecording}
              disabled={disabled}
              className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-white" />
              Record answer
            </button>
          )}
          {phase === 'recording' && (
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-2 px-5 py-3 bg-basanite-900 hover:bg-gold-600 text-white text-sm font-medium transition-colors"
            >
              <span className="w-2.5 h-2.5 bg-white" />
              Stop
            </button>
          )}
          {phase === 'uploading' && (
            <button
              type="button"
              disabled
              className="px-5 py-3 bg-basanite-900 text-white text-sm font-medium opacity-60"
            >
              Sending…
            </button>
          )}
          {phase === 'error' && (
            <>
              <button
                type="button"
                onClick={retryUpload}
                className="px-5 py-3 bg-basanite-900 hover:bg-gold-600 text-white text-sm font-medium transition-colors"
              >
                {pendingBlobRef.current ? 'Retry upload' : 'Try again'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
