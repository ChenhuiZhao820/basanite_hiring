// Derived interview statistics for the assessment report's "Interview" view.
//
// All values here are computed from data already stored on completed
// assessments (transcript messages + started_at/completed_at), so the
// stats work retroactively for every historical interview with no
// backfill.
//
// NOTE on the talk split: ElevenLabs emits per-turn timing
// (`time_in_call_secs`), but the pipeline discards it when normalising
// the transcript (interview.py:normalize_elevenlabs_messages), and the
// conversation_id needed to re-fetch it is never persisted — so accurate
// second-by-second talk time is unrecoverable for stored interviews. We
// therefore approximate each side's share by WORDS SPOKEN, which is
// available for every interview. It's a proxy, not a stopwatch; the UI
// labels it as approximate so it isn't mistaken for wall-clock time.

export interface TranscriptMessage {
  role: string
  content?: string | null
}

export interface TalkSplit {
  interviewerWords: number
  candidateWords: number
  totalWords: number
  // Rounded whole-number percentages that always sum to 100 (when there
  // is any content). interviewer + candidate === 100.
  interviewerPct: number
  candidatePct: number
  candidateMessageCount: number
  interviewerMessageCount: number
}

function wordCount(text: string | null | undefined): number {
  if (!text) return 0
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

// The transcript uses the Anthropic/OpenAI convention: "assistant" is the
// AI interviewer, "user" is the candidate.
function isInterviewer(role: string): boolean {
  return role === 'assistant' || role === 'agent'
}

export function computeTalkSplit(messages: TranscriptMessage[]): TalkSplit {
  let interviewerWords = 0
  let candidateWords = 0
  let interviewerMessageCount = 0
  let candidateMessageCount = 0

  for (const m of messages ?? []) {
    const words = wordCount(m?.content)
    if (isInterviewer(m?.role ?? '')) {
      interviewerWords += words
      if (words > 0) interviewerMessageCount += 1
    } else {
      candidateWords += words
      if (words > 0) candidateMessageCount += 1
    }
  }

  const totalWords = interviewerWords + candidateWords
  // Round one side and derive the other so the two always sum to 100 and
  // never show e.g. 49% / 52% from independent rounding.
  const interviewerPct = totalWords > 0 ? Math.round((interviewerWords / totalWords) * 100) : 0
  const candidatePct = totalWords > 0 ? 100 - interviewerPct : 0

  return {
    interviewerWords,
    candidateWords,
    totalWords,
    interviewerPct,
    candidatePct,
    interviewerMessageCount,
    candidateMessageCount,
  }
}

// Human-readable interview length from the two assessment timestamps.
// Returns null when either bound is missing (e.g. an interview that never
// recorded a start), so the UI can show a graceful fallback.
export function formatInterviewDuration(
  startedAt: string | null | undefined,
  completedAt: string | null | undefined,
): string | null {
  if (!startedAt || !completedAt) return null
  const start = new Date(startedAt).getTime()
  const end = new Date(completedAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  const seconds = Math.round((end - start) / 1000)
  if (seconds < 0) return null
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remSeconds = seconds % 60
  if (minutes < 60) {
    return remSeconds > 0 ? `${minutes} min ${remSeconds}s` : `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const remMinutes = minutes % 60
  return remMinutes > 0 ? `${hours}h ${remMinutes} min` : `${hours}h`
}
