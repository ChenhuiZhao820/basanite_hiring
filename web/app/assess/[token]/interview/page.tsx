'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { LogoMark } from '@/components/Logo'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const PHASE_LABELS: Record<string, string> = {
  not_started: 'Preparing',
  narrative_foundation: 'Getting to know you',
  dimension_assessment: 'Exploring your experience',
  knowledge_reproduction: 'Going deeper',
  transfer_test: 'New scenario',
  comprehensive_challenge: 'Technical challenge',
  stress_test: 'Final questions',
  complete: 'Complete',
}

export default function InterviewPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [phase, setPhase] = useState('not_started')
  const [assessmentId, setAssessmentId] = useState<string | null>(null)
  const [startTime] = useState(Date.now())
  const [elapsed, setElapsed] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Get assessment_id from session storage
  useEffect(() => {
    const id = sessionStorage.getItem(`assessment_${token}`)
    if (!id) {
      router.push(`/assess/${token}`)
      return
    }
    setAssessmentId(id)

    // Send initial empty message to get the interviewer's opening
    sendMessage('', id)
  }, [token])

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  async function sendMessage(text: string, overrideAssessmentId?: string) {
    const aid = overrideAssessmentId ?? assessmentId
    if (!aid) return

    if (text.trim()) {
      setMessages(prev => [...prev, { role: 'user', content: text }])
    }
    setInput('')
    setStreaming(true)

    try {
      const res = await fetch(`/api/assess/${token}/interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessment_id: aid,
          message: text || '[START_INTERVIEW]',
        }),
      })

      if (!res.ok) throw new Error('Failed to get response')

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let assistantMessage = ''

      // Add placeholder for streaming message
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                assistantMessage += parsed.text
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { role: 'assistant', content: assistantMessage }
                  return updated
                })
              }
              if (parsed.phase) {
                setPhase(parsed.phase)
              }
            } catch {}
          }
        }
      }

      // Check if interview is complete
      if (assistantMessage.toLowerCase().includes('concludes') || phase === 'complete') {
        setPhase('complete')
      }
    } catch (e) {
      console.error('Interview message error:', e)
    } finally {
      setStreaming(false)
      textareaRef.current?.focus()
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || streaming) return
    sendMessage(input.trim())
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  async function handleComplete() {
    try {
      await fetch(`/api/assess/${token}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessment_id: assessmentId }),
      })
    } catch {}
    router.push(`/assess/${token}/complete`)
  }

  return (
    <div className="h-screen flex flex-col bg-earth-50">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-earth-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoMark size={22} dark />
            <span className="font-display text-basanite-900 text-sm">Basanite</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-basanite-400">{PHASE_LABELS[phase] ?? phase}</span>
            <span className="text-xs text-basanite-300 font-mono">{formatTime(elapsed)}</span>
          </div>
        </div>
        {/* Phase progress bar */}
        <div className="h-0.5 bg-earth-200">
          <div
            className="h-full bg-gold-500 transition-all duration-500"
            style={{
              width: phase === 'complete' ? '100%' :
                     phase === 'stress_test' ? '85%' :
                     phase === 'knowledge_reproduction' || phase === 'transfer_test' || phase === 'comprehensive_challenge' ? '65%' :
                     phase === 'dimension_assessment' ? '40%' :
                     phase === 'narrative_foundation' ? '15%' : '5%'
            }}
          />
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          {messages.map((m, i) => (
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
                  {streaming && i === messages.length - 1 && m.role === 'assistant' && (
                    <span className="inline-block w-1.5 h-4 bg-gold-500 ml-0.5 animate-pulse" />
                  )}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-earth-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4">
          {phase === 'complete' ? (
            <button
              onClick={handleComplete}
              className="w-full bg-gold-500 hover:bg-gold-400 text-basanite-950 font-medium py-3 text-sm transition-colors"
            >
              View Your Feedback Report
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={streaming}
                rows={2}
                className="flex-1 border border-earth-300 px-4 py-3 text-sm text-basanite-900 outline-none focus:border-gold-500 transition-colors resize-none disabled:opacity-60"
                placeholder={streaming ? 'Interviewer is typing...' : 'Type your response... (Enter to send, Shift+Enter for new line)'}
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                className="self-end px-5 py-3 bg-basanite-900 text-white text-sm font-medium hover:bg-gold-600 transition-colors disabled:opacity-40"
              >
                Send
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
