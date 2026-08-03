'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { formatDimensionKey } from '@/lib/format'
import { ScoreSpider } from '@/components/ScoreSpider'
import { TIER_META, resolveRecommendation } from '@/lib/recommendation'
import { computeTalkSplit, formatInterviewDuration, type TranscriptMessage } from '@/lib/interview-stats'

// Slide-able report surface for a single candidate's assessment. Five
// horizontal views the hirer clicks (or arrow-keys) between:
//   1. Performance      — the hirer report (scores, evidence, capability map)
//   2. Interview        — duration, talk split, AI usage risk
//   3. CV               — the candidate's extracted CV
//   4. Transcript       — the full interview transcript
//   5. Candidate copy   — the candidate-facing report
//
// Everything is derived from data already stored on completed
// assessments, so it works retroactively for every past interview.

interface DimensionScore {
  dimension_key: string
  score: number | null
  quotation_basis?: string | null
  notes?: string | null
}

interface CvExtracted {
  name?: string
  email?: string
  experience?: { company?: string | null; role?: string | null; dates?: string | null; description?: string | null }[]
  education?: { institution?: string | null; degree?: string | null; dates?: string | null; field?: string | null }[]
  skills?: string[]
  projects?: { name?: string | null; description?: string | null; technologies?: string[] }[]
}

interface CandidateReport {
  summary?: string
  strengths?: string[]
  areas_for_development?: string[]
  overall_impression?: string
}

export interface AssessmentReportTabsProps {
  roleId: string
  assessmentId: string
  status: string
  scores: DimensionScore[]
  hirerContent: any
  candidateContent: CandidateReport | null
  messages: TranscriptMessage[]
  cv: CvExtracted | null
  startedAt: string | null
  completedAt: string | null
  hirerPdfHref: string
  candidatePdfHref: string
}

const TABS = ['Performance', 'Interview', 'CV', 'Transcript', 'Candidate copy'] as const

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-earth-300 dark:border-basanite-700 px-6 py-12 text-center text-sm text-basanite-400 dark:text-earth-500">
      {children}
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-lg text-basanite-900 dark:text-earth-100 mb-4">{children}</h2>
}

export function AssessmentReportTabs(props: AssessmentReportTabsProps) {
  const {
    roleId, assessmentId, status, scores, hirerContent, candidateContent,
    messages, cv, startedAt, completedAt, hirerPdfHref, candidatePdfHref,
  } = props

  const [active, setActive] = useState(0)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const go = useCallback((next: number) => {
    setActive(prev => {
      const clamped = Math.max(0, Math.min(TABS.length - 1, next))
      return clamped
    })
  }, [])

  // Keyboard navigation on the tablist (roving arrow keys).
  const onTabKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      const next = Math.min(TABS.length - 1, index + 1)
      setActive(next)
      tabRefs.current[next]?.focus()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      const next = Math.max(0, index - 1)
      setActive(next)
      tabRefs.current[next]?.focus()
    }
  }, [])

  return (
    <div>
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Assessment views"
        className="flex flex-wrap items-stretch gap-1 border-b border-earth-200 dark:border-basanite-700 mb-6"
      >
        {TABS.map((label, i) => (
          <button
            key={label}
            ref={el => { tabRefs.current[i] = el }}
            role="tab"
            id={`report-tab-${i}`}
            aria-selected={active === i}
            aria-controls={`report-panel-${i}`}
            tabIndex={active === i ? 0 : -1}
            onClick={() => go(i)}
            onKeyDown={e => onTabKeyDown(e, i)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active === i
                ? 'border-gold-500 text-basanite-900 dark:text-earth-100'
                : 'border-transparent text-basanite-400 dark:text-earth-500 hover:text-basanite-600 dark:hover:text-earth-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Slide viewport: all panels sit in a flex row, translated by the
          active index. Only the active panel is focusable/visible to AT. */}
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {TABS.map((label, i) => (
            <div
              key={label}
              role="tabpanel"
              id={`report-panel-${i}`}
              aria-labelledby={`report-tab-${i}`}
              aria-hidden={active !== i}
              className="w-full shrink-0 px-0.5"
              // Keep off-screen panels out of the tab order.
              inert={active !== i ? true : undefined}
            >
              {i === 0 && <PerformanceView roleId={roleId} assessmentId={assessmentId} status={status} scores={scores} content={hirerContent} hirerPdfHref={hirerPdfHref} />}
              {i === 1 && <InterviewView messages={messages} content={hirerContent} startedAt={startedAt} completedAt={completedAt} />}
              {i === 2 && <CvView cv={cv} />}
              {i === 3 && <TranscriptView messages={messages} />}
              {i === 4 && <CandidateCopyView content={candidateContent} status={status} candidatePdfHref={candidatePdfHref} />}
            </div>
          ))}
        </div>
      </div>

      {/* Prev / next controls */}
      <div className="flex items-center justify-between mt-8 pt-4 border-t border-earth-200 dark:border-basanite-700">
        <button
          onClick={() => go(active - 1)}
          disabled={active === 0}
          className="inline-flex items-center gap-1.5 text-sm text-basanite-600 dark:text-earth-300 hover:text-gold-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          {active > 0 ? TABS[active - 1] : ''}
        </button>
        <span className="text-xs text-basanite-400 dark:text-earth-500">{active + 1} / {TABS.length}</span>
        <button
          onClick={() => go(active + 1)}
          disabled={active === TABS.length - 1}
          className="inline-flex items-center gap-1.5 text-sm text-basanite-600 dark:text-earth-300 hover:text-gold-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {active < TABS.length - 1 ? TABS[active + 1] : ''}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>
    </div>
  )
}

// ─── View 1: Performance (hirer report) ─────────────────────────────────────

function PerformanceView({
  roleId, assessmentId, status, scores, content, hirerPdfHref,
}: {
  roleId: string; assessmentId: string; status: string
  scores: DimensionScore[]; content: any; hirerPdfHref: string
}) {
  if (status !== 'completed') {
    return <EmptyState>This candidate hasn&rsquo;t completed their interview yet, so there&rsquo;s no performance report.</EmptyState>
  }
  const hasReport = scores.length > 0 || content?.composite_score != null
  if (!hasReport) {
    return <EmptyState>The performance report for this candidate isn&rsquo;t available.</EmptyState>
  }

  const tier = resolveRecommendation(content)
  const meta = TIER_META[tier]
  const composite = typeof content?.composite_score === 'number' ? content.composite_score : null
  const rationale = (content?.recommendation_rationale as string | undefined)?.trim()
    || (content?.comprehensive_assessment?.one_sentence_summary as string | undefined)?.trim()
    || ''

  return (
    <div>
      <div className="mb-8">
        <a
          href={hirerPdfHref}
          className="inline-flex items-center gap-2 bg-basanite-900 hover:bg-gold-600 dark:bg-gold-600 dark:hover:bg-gold-500 text-white text-xs font-medium px-4 py-2 transition-colors"
        >
          <DownloadIcon />
          Download hirer report (PDF)
        </a>
      </div>

      {/* Routing recommendation */}
      <section className={`mb-10 border ${meta.border} ${meta.bg} px-6 py-5`}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <p className={`text-xs font-medium uppercase tracking-wide ${meta.accent} mb-2`}>Routing recommendation, next round</p>
            <h2 className={`font-display text-xl ${meta.text} leading-tight`}>{meta.label}</h2>
            <p className={`text-sm ${meta.text} opacity-80 mt-2 leading-relaxed`}>{rationale || meta.blurb}</p>
          </div>
          {composite !== null && (
            <div className="sm:text-right">
              <p className={`text-xs font-medium uppercase tracking-wide ${meta.accent}`}>Composite</p>
              <p className={`font-display text-3xl ${meta.text}`}>{composite.toFixed(1)}<span className="text-base opacity-60">/5</span></p>
            </div>
          )}
        </div>
        <p className={`text-xs ${meta.accent} opacity-70 mt-3`}>Routing call only. The hire/no-hire decision sits with the human interviewer.</p>
      </section>

      {scores.length >= 3 && (
        <section className="mb-10">
          <SectionHeading>Dimension Profile</SectionHeading>
          <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-6">
            <ScoreSpider scores={scores.map(s => ({ dimension_key: s.dimension_key, score: s.score }))} />
            <p className="text-xs text-basanite-400 dark:text-earth-500 text-center mt-3">Each axis is a dimension; further from the centre means higher score (1, 5).</p>
          </div>
        </section>
      )}

      {scores.length > 0 && (
        <section className="mb-10">
          <SectionHeading>Dimension Scores, Reasoning &amp; Evidence</SectionHeading>
          <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 divide-y divide-earth-100">
            {scores.map(s => (
              <div key={s.dimension_key} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-basanite-900 dark:text-earth-100">{formatDimensionKey(s.dimension_key)}</span>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <div key={n} className={`w-6 h-6 flex items-center justify-center text-xs font-medium ${n <= (s.score ?? 0) ? 'bg-gold-500 text-white' : 'bg-earth-100 dark:bg-basanite-800 text-basanite-300'}`}>{n}</div>
                    ))}
                  </div>
                </div>
                {s.quotation_basis && (
                  <p className="text-xs text-basanite-500 dark:text-earth-400 italic border-l-2 border-gold-500/30 pl-3 mt-2">&ldquo;{s.quotation_basis}&rdquo;</p>
                )}
                {s.notes && <p className="text-xs text-basanite-400 dark:text-earth-500 mt-1">{s.notes}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {content?.top_excerpts && content.top_excerpts.length > 0 && (
        <section className="mb-10">
          <SectionHeading>Key Interview Excerpts</SectionHeading>
          <div className="space-y-4">
            {content.top_excerpts.map((e: any, i: number) => (
              <div key={i} className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-5">
                <p className="text-sm text-basanite-800 dark:text-earth-100 mb-2">{e.excerpt}</p>
                <p className="text-xs text-basanite-400 dark:text-earth-500">{e.why_selected}</p>
                {e.dimension && (
                  <span className="text-xs bg-earth-100 dark:bg-basanite-800 text-basanite-500 dark:text-earth-400 px-2 py-0.5 mt-2 inline-block">{formatDimensionKey(e.dimension)}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {content?.capability_map && (
        <section className="mb-10">
          <SectionHeading>Technical Capability Map</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {content.capability_map.demonstrated_depth?.length > 0 && (
              <CapabilityCard title="Demonstrated Depth" tone="text-green-600" items={content.capability_map.demonstrated_depth} />
            )}
            {content.capability_map.surface_fluency?.length > 0 && (
              <CapabilityCard title="Surface Fluency" tone="text-yellow-600" items={content.capability_map.surface_fluency} />
            )}
            {content.capability_map.blind_spots?.length > 0 && (
              <CapabilityCard title="Suspected Blind Spots" tone="text-red-500" items={content.capability_map.blind_spots} />
            )}
            {content.capability_map.requires_expert_verification?.length > 0 && (
              <CapabilityCard title="Requires Human Verification" tone="text-basanite-500 dark:text-earth-400" items={content.capability_map.requires_expert_verification} />
            )}
          </div>
        </section>
      )}

      {content?.comprehensive_assessment && (
        <section className="mb-2">
          <SectionHeading>Comprehensive Assessment</SectionHeading>
          <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-6">
            {content.comprehensive_assessment.one_sentence_summary && (
              <p className="text-sm text-basanite-700 dark:text-earth-200 font-display italic">&ldquo;{content.comprehensive_assessment.one_sentence_summary}&rdquo;</p>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function CapabilityCard({ title, tone, items }: { title: string; tone: string; items: string[] }) {
  return (
    <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-5">
      <p className={`text-xs ${tone} font-medium uppercase tracking-wide mb-2`}>{title}</p>
      <ul className="text-sm text-basanite-700 dark:text-earth-200 space-y-1">
        {items.map((d, i) => <li key={i}>{d}</li>)}
      </ul>
    </div>
  )
}

// ─── View 2: Interview stats ────────────────────────────────────────────────

function InterviewView({
  messages, content, startedAt, completedAt,
}: {
  messages: TranscriptMessage[]; content: any
  startedAt: string | null; completedAt: string | null
}) {
  const split = computeTalkSplit(messages)
  const duration = formatInterviewDuration(startedAt, completedAt)
  const risk: string = content?.comprehensive_assessment?.cheating_risk ?? 'unknown'
  const signals: string[] = content?.comprehensive_assessment?.cheating_signals ?? []

  const riskStyles: Record<string, string> = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-red-100 text-red-700',
    unknown: 'bg-earth-200 text-basanite-500 dark:text-earth-400',
  }

  return (
    <div className="space-y-8">
      {/* Duration + message counts */}
      <section>
        <SectionHeading>Interview</SectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label="Duration" value={duration ?? 'Not recorded'} />
          <StatCard label="Total messages" value={String(messages.length)} />
          <StatCard label="Candidate replies" value={String(split.candidateMessageCount)} />
        </div>
      </section>

      {/* Talk split */}
      <section>
        <SectionHeading>Interviewer vs candidate</SectionHeading>
        <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-6">
          {split.totalWords > 0 ? (
            <>
              <div className="flex items-center justify-between text-xs font-medium mb-2">
                <span className="text-basanite-600 dark:text-earth-300">Interviewer {split.interviewerPct}%</span>
                <span className="text-gold-700 dark:text-gold-400">Candidate {split.candidatePct}%</span>
              </div>
              <div className="flex h-4 w-full overflow-hidden rounded-full bg-earth-100 dark:bg-basanite-900">
                <div className="bg-basanite-400 dark:bg-basanite-600" style={{ width: `${split.interviewerPct}%` }} />
                <div className="bg-gold-500" style={{ width: `${split.candidatePct}%` }} />
              </div>
              <p className="text-xs text-basanite-400 dark:text-earth-500 mt-3">
                Approximate — based on share of words spoken ({split.interviewerWords.toLocaleString()} vs {split.candidateWords.toLocaleString()} words), not exact speaking time.
              </p>
            </>
          ) : (
            <EmptyState>No transcript is available to measure the talk split.</EmptyState>
          )}
        </div>
      </section>

      {/* AI usage risk */}
      <section>
        <SectionHeading>AI usage risk</SectionHeading>
        <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-medium uppercase tracking-wide text-basanite-400 dark:text-earth-500">Risk level:</span>
            <span className={`text-xs font-medium px-2 py-0.5 capitalize ${riskStyles[risk] ?? riskStyles.unknown}`}>{risk}</span>
          </div>
          {signals.length > 0 ? (
            <ul className="text-sm text-basanite-700 dark:text-earth-200 space-y-1 list-disc pl-5">
              {signals.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          ) : (
            <p className="text-sm text-basanite-400 dark:text-earth-500">No specific AI-usage signals were flagged.</p>
          )}
          <p className="text-xs text-basanite-400 dark:text-earth-500 mt-3">
            An AI-generated estimate of how likely the candidate leaned on external AI assistance during the interview. Treat as a prompt for human review, not a verdict.
          </p>
        </div>
      </section>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-basanite-400 dark:text-earth-500 mb-1">{label}</p>
      <p className="font-display text-2xl text-basanite-900 dark:text-earth-100">{value}</p>
    </div>
  )
}

// ─── View 3: CV ──────────────────────────────────────────────────────────────

function CvView({ cv }: { cv: CvExtracted | null }) {
  const hasContent = cv && (
    (cv.experience?.length ?? 0) > 0 ||
    (cv.education?.length ?? 0) > 0 ||
    (cv.skills?.length ?? 0) > 0 ||
    (cv.projects?.length ?? 0) > 0
  )
  if (!hasContent) {
    return <EmptyState>No CV was captured for this candidate.</EmptyState>
  }

  return (
    <div className="space-y-8">
      {(cv!.name || cv!.email) && (
        <div>
          {cv!.name && <h2 className="font-display text-xl text-basanite-900 dark:text-earth-100">{cv!.name}</h2>}
          {cv!.email && <p className="text-sm text-basanite-500 dark:text-earth-400 mt-1">{cv!.email}</p>}
        </div>
      )}

      {(cv!.experience?.length ?? 0) > 0 && (
        <section>
          <SectionHeading>Experience</SectionHeading>
          <div className="space-y-4">
            {cv!.experience!.map((e, i) => (
              <div key={i} className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-5">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <p className="text-sm font-medium text-basanite-900 dark:text-earth-100">{e.role || 'Role'}{e.company ? ` · ${e.company}` : ''}</p>
                  {e.dates && <p className="text-xs text-basanite-400 dark:text-earth-500">{e.dates}</p>}
                </div>
                {e.description && <p className="text-sm text-basanite-600 dark:text-earth-300 mt-2 whitespace-pre-wrap leading-relaxed">{e.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {(cv!.projects?.length ?? 0) > 0 && (
        <section>
          <SectionHeading>Projects</SectionHeading>
          <div className="space-y-4">
            {cv!.projects!.map((p, i) => (
              <div key={i} className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-5">
                <p className="text-sm font-medium text-basanite-900 dark:text-earth-100">{p.name || 'Project'}</p>
                {p.description && <p className="text-sm text-basanite-600 dark:text-earth-300 mt-2 leading-relaxed">{p.description}</p>}
                {(p.technologies?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {p.technologies!.map((t, j) => <span key={j} className="text-xs bg-earth-100 dark:bg-basanite-900 text-basanite-500 dark:text-earth-400 px-2 py-0.5">{t}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {(cv!.education?.length ?? 0) > 0 && (
        <section>
          <SectionHeading>Education</SectionHeading>
          <div className="space-y-3">
            {cv!.education!.map((e, i) => (
              <div key={i} className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 p-5">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <p className="text-sm font-medium text-basanite-900 dark:text-earth-100">{e.degree || e.field || 'Qualification'}{e.institution ? ` · ${e.institution}` : ''}</p>
                  {e.dates && <p className="text-xs text-basanite-400 dark:text-earth-500">{e.dates}</p>}
                </div>
                {e.field && e.degree && <p className="text-xs text-basanite-500 dark:text-earth-400 mt-1">{e.field}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {(cv!.skills?.length ?? 0) > 0 && (
        <section>
          <SectionHeading>Skills</SectionHeading>
          <div className="flex flex-wrap gap-2">
            {cv!.skills!.map((s, i) => <span key={i} className="text-sm bg-earth-100 dark:bg-basanite-900 text-basanite-600 dark:text-earth-300 px-3 py-1">{s}</span>)}
          </div>
        </section>
      )}
    </div>
  )
}

// ─── View 4: Transcript ──────────────────────────────────────────────────────

function TranscriptView({ messages }: { messages: TranscriptMessage[] }) {
  if (messages.length === 0) {
    return <EmptyState>No transcript is available for this interview.</EmptyState>
  }
  return (
    <div>
      <SectionHeading>Full Interview Transcript ({messages.length} messages)</SectionHeading>
      <div className="border border-earth-200 dark:border-basanite-700 bg-white dark:bg-basanite-800 divide-y divide-earth-100">
        {messages.map((m, i) => (
          <div key={i} className={`px-5 py-4 ${m.role === 'assistant' || m.role === 'agent' ? 'bg-earth-50 dark:bg-basanite-900' : ''}`}>
            <p className="text-xs text-basanite-400 dark:text-earth-500 font-medium uppercase tracking-wide mb-1">
              {m.role === 'assistant' || m.role === 'agent' ? 'Interviewer' : 'Candidate'}
            </p>
            <p className="text-sm text-basanite-700 dark:text-earth-200 whitespace-pre-wrap leading-relaxed">{m.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── View 5: Candidate copy ──────────────────────────────────────────────────

function CandidateCopyView({
  content, status, candidatePdfHref,
}: {
  content: CandidateReport | null; status: string; candidatePdfHref: string
}) {
  const hasContent = content && (
    content.summary || content.overall_impression ||
    (content.strengths?.length ?? 0) > 0 || (content.areas_for_development?.length ?? 0) > 0
  )
  if (status !== 'completed' || !hasContent) {
    return <EmptyState>The candidate-facing report isn&rsquo;t available for this candidate.</EmptyState>
  }
  return (
    <div>
      <div className="mb-8">
        <a
          href={candidatePdfHref}
          className="inline-flex items-center gap-2 border border-earth-300 dark:border-basanite-700 hover:border-basanite-500 text-basanite-700 dark:text-earth-200 text-xs font-medium px-4 py-2 transition-colors"
        >
          <DownloadIcon />
          Download candidate copy (PDF)
        </a>
      </div>
      <p className="text-xs text-basanite-400 dark:text-earth-500 mb-6">This is the feedback the candidate receives — deliberately free of scores, dimensions, and internal rubric.</p>

      {content!.summary && (
        <section className="mb-8">
          <SectionHeading>Summary</SectionHeading>
          <p className="text-sm text-basanite-700 dark:text-earth-200 leading-relaxed">{content!.summary}</p>
        </section>
      )}

      {(content!.strengths?.length ?? 0) > 0 && (
        <section className="mb-8">
          <SectionHeading>Strengths</SectionHeading>
          <ul className="text-sm text-basanite-700 dark:text-earth-200 space-y-1.5 list-disc pl-5">
            {content!.strengths!.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </section>
      )}

      {(content!.areas_for_development?.length ?? 0) > 0 && (
        <section className="mb-8">
          <SectionHeading>Areas for development</SectionHeading>
          <ul className="text-sm text-basanite-700 dark:text-earth-200 space-y-1.5 list-disc pl-5">
            {content!.areas_for_development!.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </section>
      )}

      {content!.overall_impression && (
        <section>
          <SectionHeading>Overall impression</SectionHeading>
          <p className="text-sm text-basanite-700 dark:text-earth-200 font-display italic leading-relaxed">&ldquo;{content!.overall_impression}&rdquo;</p>
        </section>
      )}
    </div>
  )
}
