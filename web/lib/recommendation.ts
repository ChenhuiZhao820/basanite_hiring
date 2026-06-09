// Five-tier next-round routing recommendation. Mirrors
// `RecommendationTier` / `derive_recommendation` in core/schemas.py
// so the dashboard and the PDF show the same label for the same
// underlying composite score on legacy reports.

export type RecommendationTier =
  | 'strongly_recommended'
  | 'recommended'
  | 'can_progress'
  | 'not_recommended'
  | 'strongly_not_recommended'

interface TierMeta {
  label: string
  blurb: string
  // Tailwind class colour family used for the banner background +
  // accent. Keep these consistent with the cheating-risk pills already
  // in the page so the visual language is shared.
  bg: string
  border: string
  text: string
  accent: string
}

export const TIER_META: Record<RecommendationTier, TierMeta> = {
  strongly_recommended: {
    label: 'Strongly recommended for next round',
    blurb: 'Clear, sustained signal across the priority dimensions.',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-300 dark:border-green-500/40',
    text: 'text-green-900 dark:text-green-100',
    accent: 'text-green-700 dark:text-green-300',
  },
  recommended: {
    label: 'Recommended for next round',
    blurb: 'Solid evidence; advance, with one or two areas to probe further.',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-300 dark:border-emerald-500/40',
    text: 'text-emerald-900 dark:text-emerald-100',
    accent: 'text-emerald-700 dark:text-emerald-300',
  },
  can_progress: {
    label: 'Can progress to next round',
    blurb: 'Mixed but defensible; advance if pipeline space allows.',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-300 dark:border-amber-500/40',
    text: 'text-amber-900 dark:text-amber-100',
    accent: 'text-amber-700 dark:text-amber-300',
  },
  not_recommended: {
    label: 'Not recommended for next round',
    blurb: 'Weak signal on the priority dimensions.',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-300 dark:border-orange-500/40',
    text: 'text-orange-900 dark:text-orange-100',
    accent: 'text-orange-700 dark:text-orange-300',
  },
  strongly_not_recommended: {
    label: 'Strongly not recommended for next round',
    blurb: 'Disqualifying gaps or wholesale failure on priority dimensions.',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-300 dark:border-red-500/40',
    text: 'text-red-900 dark:text-red-100',
    accent: 'text-red-700 dark:text-red-300',
  },
}

// Fallback for legacy reports that pre-date the recommendation field.
// Bands match `derive_recommendation` in core/schemas.py exactly so the
// PDF and the web view never disagree.
export function deriveRecommendation(composite: number | null | undefined): RecommendationTier {
  const s = typeof composite === 'number' ? composite : 3
  if (s >= 4.25) return 'strongly_recommended'
  if (s >= 3.5) return 'recommended'
  if (s >= 2.75) return 'can_progress'
  if (s >= 2.0) return 'not_recommended'
  return 'strongly_not_recommended'
}

export function resolveRecommendation(
  reportContent: { recommendation?: string | null; composite_score?: number | null } | null | undefined,
): RecommendationTier {
  const direct = reportContent?.recommendation
  if (direct && direct in TIER_META) return direct as RecommendationTier
  return deriveRecommendation(reportContent?.composite_score)
}
