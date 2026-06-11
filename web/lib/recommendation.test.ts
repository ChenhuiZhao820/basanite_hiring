import { describe, expect, it } from 'vitest'
import twConfig from '../tailwind.config'
import {
  TIER_META,
  deriveRecommendation,
  resolveRecommendation,
  type RecommendationTier,
} from './recommendation'

const TIERS: RecommendationTier[] = [
  'strongly_recommended',
  'recommended',
  'can_progress',
  'not_recommended',
  'strongly_not_recommended',
]

describe('deriveRecommendation (composite -> tier bands)', () => {
  // Bands must mirror derive_recommendation() in core/schemas.py exactly so
  // the dashboard and the PDF never disagree on a legacy report.
  it.each([
    [5.0, 'strongly_recommended'],
    [4.25, 'strongly_recommended'],
    [4.24, 'recommended'],
    [3.5, 'recommended'],
    [3.49, 'can_progress'],
    [2.75, 'can_progress'],
    [2.74, 'not_recommended'],
    [2.0, 'not_recommended'],
    [1.99, 'strongly_not_recommended'],
    [1.0, 'strongly_not_recommended'],
  ] as const)('composite %s -> %s', (score, tier) => {
    expect(deriveRecommendation(score)).toBe(tier)
  })

  it('defaults a null/undefined composite to the mid band (can_progress)', () => {
    expect(deriveRecommendation(null)).toBe('can_progress')
    expect(deriveRecommendation(undefined)).toBe('can_progress')
  })
})

describe('resolveRecommendation', () => {
  it('prefers an explicit, valid recommendation over the composite', () => {
    expect(
      resolveRecommendation({ recommendation: 'not_recommended', composite_score: 5 }),
    ).toBe('not_recommended')
  })

  it('falls back to the composite when the recommendation is absent', () => {
    expect(resolveRecommendation({ composite_score: 4.5 })).toBe('strongly_recommended')
  })

  it('falls back to the composite when the recommendation is an unknown string', () => {
    expect(
      resolveRecommendation({ recommendation: 'maybe_later', composite_score: 1.2 }),
    ).toBe('strongly_not_recommended')
  })

  it('handles null/undefined content without throwing', () => {
    expect(resolveRecommendation(null)).toBe('can_progress')
    expect(resolveRecommendation(undefined)).toBe('can_progress')
  })
})

describe('TIER_META dark-mode contrast invariant', () => {
  // The routing-recommendation banner composes these class strings via
  // `${meta.bg}`/`${meta.text}` template literals. Each colour-bearing field
  // MUST carry a dark: variant, or the banner renders an unreadable
  // light-mode foreground on a dark-mode background (the exact bug: near-black
  // text on dark-red bg). This asserts the pairing for every tier.
  it.each(TIERS)('%s has a dark: variant on bg/text/border/accent', tier => {
    const meta = TIER_META[tier]
    for (const field of ['bg', 'text', 'border', 'accent'] as const) {
      expect(meta[field], `${tier}.${field} = "${meta[field]}"`).toMatch(/\bdark:/)
    }
  })

  it('every tier has a non-empty label and blurb', () => {
    for (const tier of TIERS) {
      expect(TIER_META[tier].label.length).toBeGreaterThan(0)
      expect(TIER_META[tier].blurb.length).toBeGreaterThan(0)
    }
  })
})

describe('tailwind content globs cover lib/ (purge regression guard)', () => {
  // TIER_META's class strings live ONLY in lib/recommendation.ts and reach
  // JSX via template literals, so Tailwind's JIT must scan lib/ or the less
  // common dark: variants (dark:text-red-100, …) get silently purged and the
  // banner breaks in dark mode. If a future edit drops the lib/ glob, fail
  // here loudly instead of shipping an unreadable banner.
  it('includes a ./lib/ glob in tailwind.config content', () => {
    const content = (twConfig as { content?: unknown }).content
    const globs = Array.isArray(content)
      ? (content as string[])
      : ((content as { files?: string[] })?.files ?? [])
    expect(globs.some(g => /(^|\/)lib\//.test(g) || g.includes('./lib/'))).toBe(true)
  })
})
