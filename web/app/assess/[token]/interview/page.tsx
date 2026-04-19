'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import VoiceInterview from '@/components/VoiceInterview'
import { LogoMark } from '@/components/Logo'

type SessionConfig = {
  signed_url: string
  prompt: string
  first_message: string
  max_duration_seconds?: number
}

export default function InterviewPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [assessmentId, setAssessmentId] = useState<string | null>(null)
  const [config, setConfig] = useState<SessionConfig | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const id = sessionStorage.getItem(`assessment_${token}`)
    if (!id) {
      router.push(`/assess/${token}`)
      return
    }
    setAssessmentId(id)

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/assess/${token}/voice-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assessment_id: id }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.detail ?? data.error ?? `Failed (${res.status})`)
        }
        const data: SessionConfig = await res.json()
        if (!cancelled) setConfig(data)
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? 'Failed to prepare interview.')
      }
    })()

    return () => { cancelled = true }
  }, [token, router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-earth-50 p-6">
        <div className="max-w-md w-full bg-white border border-earth-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <LogoMark size={22} dark />
            <span className="font-display text-basanite-900 text-sm">Basanite</span>
          </div>
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2">{error}</p>
        </div>
      </div>
    )
  }

  if (!assessmentId || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-earth-50">
        <p className="text-sm text-basanite-500">Preparing your interview…</p>
      </div>
    )
  }

  return (
    <VoiceInterview
      token={token}
      assessmentId={assessmentId}
      signedUrl={config.signed_url}
      prompt={config.prompt}
      firstMessage={config.first_message}
      targetSeconds={config.max_duration_seconds ?? 20 * 60}
    />
  )
}
