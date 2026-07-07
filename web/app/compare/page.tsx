import { Fragment } from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { LogoMark } from '@/components/Logo'

export const metadata: Metadata = {
  title: 'Basanite vs HackerRank, CodeSignal, HireVue & Karat | Basanite',
  description:
    'Where Basanite sits in your hiring process, and how it compares head-to-head with HackerRank, CodeSignal, HireVue and Karat on gaming-resistance, AI-collaboration, what your team receives, adaptivity, and cost.',
}

const BOOK_A_CALL_URL = 'https://cal.eu/basanite/intro'
// Muted red-brown for struck captions and weak answers. Spec-mandated hue; it is
// below WCAG AA contrast on the light background, but meaning is never carried by
// colour alone here (line-through styling + explicit "No"/word answers also convey it).
const RED_BROWN = '#c98a6b'

// ── Block 1 data ──────────────────────────────────────────────────────────
type Node = { label: string; struck?: boolean; gold?: boolean; caption?: string }

const TODAY_NODES: Node[] = [
  { label: 'Phone screen', struck: true, caption: 'rehearsable' },
  { label: 'Coding test', struck: true, caption: 'AI passes it' },
  { label: 'First tech interview', struck: true, caption: 'wrong signal' },
  { label: 'Final rounds' },
  { label: 'Offer' },
]

const BASANITE_NODES: Node[] = [
  { label: '◆ Basanite round: interviews all, briefs you', gold: true, caption: 'adaptive · can’t be rehearsed · measures work-with-AI' },
  { label: 'Final rounds (yours, briefed)' },
  { label: 'Offer' },
]

// ── Block 2 data ────────────────────────────────────────────────────────────
// ⚠ COMPETITOR CLAIMS ARE UNVERIFIED. Every non-Basanite cell below is an
// editable placeholder taken from the redesign brief. Confirm each against the
// verified source list before launch, and do not add capabilities that aren't
// on that list. Cells marked /* VERIFY */ were left vague in the brief and were
// filled with a best-guess placeholder — treat these as especially provisional.
const COMPETITORS = ['HackerRank', 'CodeSignal', 'HireVue', 'Karat'] as const

type Tone = 'good' | 'bad' | 'mid'
type Cell = { answer: string; note?: string; tone: Tone }

const MATRIX: { q: string; basanite: Cell; cells: Cell[] }[] = [
  {
    q: 'Resistant to gaming?',
    basanite: { answer: 'Yes', note: 'Every interview is unique, built live from the candidate’s CV — nothing to leak or rehearse.', tone: 'good' },
    cells: [
      { answer: 'No', note: 'Banks leak, AI solves them', tone: 'bad' },
      { answer: 'No', note: 'Standardised tasks', tone: 'bad' },
      { answer: 'Partly', note: 'Recorded answers rehearsable', tone: 'mid' },
      { answer: 'Mostly', note: 'Live humans, format known', tone: 'mid' },
    ],
  },
  {
    q: 'Measures AI-collaboration performance?',
    basanite: { answer: 'Yes', note: 'A sandboxed workbench scores how the candidate collaborates with an AI coding agent.', tone: 'good' },
    cells: [
      { answer: 'No', note: 'Scores coding in isolation', tone: 'bad' },
      { answer: 'No', note: 'Treats AI use as cheating', tone: 'bad' },
      { answer: 'No', note: 'Not assessed', tone: 'bad' },
      { answer: 'No', note: 'Not assessed', tone: 'bad' },
    ],
  },
  {
    q: 'What your team receives',
    basanite: { answer: 'An evidence-backed briefing per candidate', note: 'Strengths, gaps, and what to probe next.', tone: 'good' },
    cells: [
      { answer: 'A score', tone: 'mid' },
      { answer: 'A score and a replay', tone: 'mid' },
      { answer: 'A video and ratings', tone: 'mid' },
      { answer: 'An interviewer write-up', tone: 'mid' },
    ],
  },
  {
    q: 'Adapts to each candidate?',
    basanite: { answer: 'Yes', note: 'A live voice conversation that follows up like a human.', tone: 'good' },
    cells: [
      { answer: 'No', note: 'Fixed format', tone: 'bad' },
      { answer: 'No', note: 'Fixed format', tone: 'bad' },
      { answer: 'No', note: 'Fixed format', tone: 'bad' },
      { answer: 'Yes', note: 'Human-led', tone: 'good' },
    ],
  },
  {
    q: 'Cost & scheduling',
    basanite: { answer: 'From £249 / role', note: 'Candidates interview any time — no scheduling.', tone: 'good' },
    cells: [
      { answer: 'Subscription', tone: 'mid' }, /* VERIFY */
      { answer: 'Subscription / enterprise', tone: 'mid' }, /* VERIFY */
      { answer: 'Enterprise', tone: 'mid' }, /* VERIFY */
      { answer: 'Per-interview', note: 'Requires scheduling', tone: 'mid' }, /* VERIFY */
    ],
  },
]

function toneClass(tone: Tone): string {
  if (tone === 'good') return 'text-gold-700'
  if (tone === 'bad') return ''
  return 'text-basanite-600'
}

function Cell({ cell }: { cell: Cell }) {
  return (
    <>
      <span
        className={`font-medium ${toneClass(cell.tone)}`}
        style={cell.tone === 'bad' ? { color: RED_BROWN } : undefined}
      >
        {cell.answer}
      </span>
      {cell.note && <span className="block text-basanite-500 text-xs mt-1 leading-snug">{cell.note}</span>}
    </>
  )
}

function NodeBox({ node }: { node: Node }) {
  // Colours read on the dark (bg-basanite-900) "Where Basanite fits" band.
  const box = node.gold
    ? 'border-gold-500 bg-gold-500 text-basanite-900 font-medium'
    : node.struck
      ? 'border-earth-300/25 text-earth-400 line-through'
      : 'border-earth-300/40 text-earth-100'
  return (
    <div className="flex flex-col items-center gap-1.5 max-w-[190px]">
      <div className={`border px-3.5 py-2.5 text-sm text-center leading-snug ${box}`}>{node.label}</div>
      {node.caption && (
        <span
          className="text-xs italic text-center leading-snug"
          style={{ color: node.gold ? undefined : RED_BROWN }}
        >
          <span className={node.gold ? 'text-gold-400 not-italic font-medium' : undefined}>{node.caption}</span>
        </span>
      )}
    </div>
  )
}

function PipelineRow({ label, labelClass, nodes, note }: { label: string; labelClass: string; nodes: Node[]; note: string }) {
  return (
    <div className="flex flex-col min-[880px]:flex-row min-[880px]:items-start gap-3 min-[880px]:gap-5">
      <div className={`shrink-0 min-[880px]:w-24 min-[880px]:pt-3 text-[11px] font-semibold uppercase tracking-[0.18em] ${labelClass}`}>
        {label}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start gap-y-3">
          {nodes.map((n, i) => (
            <Fragment key={n.label}>
              {i > 0 && <span aria-hidden="true" className="self-start pt-3 px-2 text-earth-400 select-none">&rarr;</span>}
              <NodeBox node={n} />
            </Fragment>
          ))}
        </div>
        <p className="mt-4 text-sm italic text-earth-300 max-w-2xl">{note}</p>
      </div>
    </div>
  )
}

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-earth-50 text-basanite-900">
      <nav className="fixed top-0 left-0 right-0 z-40 bg-earth-50/85 backdrop-blur-md border-b border-earth-200/60">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={26} dark />
            <span className="font-display text-basanite-900 text-lg">Basanite</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-5 text-sm text-basanite-600">
            <Link href="/pricing" className="hidden sm:inline hover:text-basanite-900 transition-colors">Pricing</Link>
            <Link href="/faq" className="hidden sm:inline hover:text-basanite-900 transition-colors">FAQ</Link>
            <a
              href={BOOK_A_CALL_URL}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-earth-50 bg-basanite-900 px-4 py-2 hover:bg-gold-600 transition-colors duration-200"
            >
              Book a call
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 pt-28 pb-24">
        <header className="mb-14 max-w-3xl">
          <p className="text-gold-700 text-[11px] font-semibold uppercase tracking-[0.25em] mb-4">Compare</p>
          <h1 className="font-display text-4xl sm:text-5xl mb-5 leading-[1.05]">How Basanite compares</h1>
          <p className="text-basanite-600 text-lg leading-relaxed">
            Where Basanite sits in your process, and how it stacks up against the tools teams usually weigh it against.
          </p>
        </header>

        {/* Block 1 — process pipeline */}
        <section className="mb-16" aria-label="The process, before and after Basanite">
          <div className="bg-basanite-900 p-8 sm:p-10">
            <h2 className="font-display text-2xl sm:text-3xl text-earth-50 mb-8">Where Basanite fits</h2>
            <div className="space-y-10">
              <PipelineRow
                label="Today"
                labelClass="text-earth-400"
                nodes={TODAY_NODES}
                note="~17 engineer-hours per hire, mostly spent on candidates you won’t hire, filtered by rounds that can be gamed."
              />
              <div className="border-t border-earth-300/15" />
              <PipelineRow
                label="With Basanite"
                labelClass="text-gold-400"
                nodes={BASANITE_NODES}
                note="Your engineers interview only the shortlist — briefing in hand. You still decide."
              />
            </div>
          </div>
        </section>

        {/* Block 2 — head-to-head matrix */}
        <section className="mb-16" aria-label="Head-to-head comparison">
          <h2 className="font-display text-2xl sm:text-3xl text-basanite-900 mb-8">Head to head</h2>
          {/* Mobile: horizontal scroll with a sticky first column. Its bg MUST stay fully
              opaque (bg-earth-50, no /alpha) so it masks the gold Basanite column border while scrolling. */}
          <div className="overflow-x-auto border border-earth-300/60">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-earth-200">
                  {/* Corner cell is presentational: role=presentation stops SRs announcing a blank column header. */}
                  <td role="presentation" className="sticky left-0 z-20 bg-earth-50 border-r border-earth-200 px-4 py-3 w-52" />
                  <th scope="col" className="bg-gold-500/[0.06] border-l border-r border-gold-500/40 px-4 py-3 text-left font-display text-basanite-900 text-base">
                    &#9670; Basanite
                  </th>
                  {COMPETITORS.map(c => (
                    <th key={c} scope="col" className="px-4 py-3 text-left font-medium text-basanite-600">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MATRIX.map(row => (
                  <tr key={row.q} className="border-b border-earth-200 last:border-0 align-top">
                    <th scope="row" className="sticky left-0 z-10 bg-earth-50 border-r border-earth-200 text-left font-medium text-basanite-900 px-4 py-4 w-52">
                      {row.q}
                    </th>
                    <td className="bg-gold-500/[0.06] border-l border-r border-gold-500/40 px-4 py-4 text-basanite-800">
                      <Cell cell={row.basanite} />
                    </td>
                    {row.cells.map((cell, j) => (
                      <td key={j} className="px-4 py-4">
                        <Cell cell={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-basanite-400 text-xs mt-3 italic">
            Competitor details are being finalised against public sources.
          </p>
        </section>

        {/* Block 3 — honest-fit note */}
        <section className="mb-16" aria-label="Where competitors fit better">
          <div className="border border-earth-300/60 bg-white p-8 sm:p-10">
            <p className="text-basanite-500 text-[11px] font-semibold uppercase tracking-[0.22em] mb-4">Where we&rsquo;re not the answer</p>
            <div className="space-y-4 text-basanite-700 text-base leading-relaxed max-w-3xl">
              <p>
                If you need <span className="font-medium text-basanite-900">high-volume, pure algorithmic filtering</span>, HackerRank and CodeSignal are cheaper per unit and built for exactly that.
              </p>
              <p>
                If your process <span className="font-medium text-basanite-900">requires a human interviewer on the line</span>, Karat is the closest substitute &mdash; at human prices.
              </p>
              <p className="text-basanite-900 font-medium">
                Basanite is for teams that want screening depth <em>and</em> their engineers&rsquo; hours back.
              </p>
            </div>
          </div>
        </section>

        {/* Closer */}
        <section className="text-center border-t border-earth-200 pt-16">
          <h2 className="font-display text-3xl sm:text-4xl text-basanite-900 mb-4 max-w-2xl mx-auto leading-[1.1]">
            The fastest way to compare is to read what you&rsquo;d actually receive.
          </h2>
          <p className="text-basanite-600 text-lg mb-8 max-w-xl mx-auto">
            Read a real candidate briefing &mdash; the exact evidence pack your team would get after an interview.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/sample-reports"
              className="w-full sm:w-auto px-8 py-4 bg-basanite-900 text-earth-50 font-semibold text-base hover:bg-gold-600 transition-colors"
            >
              See a sample briefing
            </Link>
            <a
              href={BOOK_A_CALL_URL}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-8 py-4 border border-basanite-900 text-basanite-900 font-semibold text-base hover:bg-basanite-900 hover:text-earth-50 transition-colors"
            >
              Book a call
            </a>
          </div>
          <p className="text-basanite-500 text-sm mt-6">
            or <Link href="/login" className="text-gold-700 hover:text-basanite-900 underline underline-offset-4">start free</Link> &mdash; 3 interviews, no card.
          </p>
        </section>
      </main>

      <footer className="border-t border-earth-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-basanite-500">
          <p>Built in Manchester by Drew, Lynn and Aditya. &copy; {new Date().getFullYear()} Basanite.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href="/" className="hover:text-basanite-900 transition-colors">Home</Link>
            <Link href="/pricing" className="hover:text-basanite-900 transition-colors">Pricing</Link>
            <Link href="/faq" className="hover:text-basanite-900 transition-colors">FAQ</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
