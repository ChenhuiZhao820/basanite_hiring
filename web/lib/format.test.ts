import { describe, expect, it } from 'vitest'

import { formatDimensionKey } from './format'

describe('formatDimensionKey', () => {
  it.each([
    ['technical_depth', 'Technical Depth'],
    ['judgment_under_ambiguity', 'Judgment Under Ambiguity'],
    ['requires_expert_verification', 'Requires Expert Verification'],
    ['a_b_c', 'A B C'],
    ['single', 'Single'],
    ['ALREADY', 'Already'],
  ])('formats %s -> %s', (key, expected) => {
    expect(formatDimensionKey(key)).toBe(expected)
  })

  it('returns empty string for empty input', () => {
    expect(formatDimensionKey('')).toBe('')
  })

  it('returns empty string for null/undefined-like input', () => {
    // Cast through unknown so we can pass nullish without satisfying the type.
    expect(formatDimensionKey(null as unknown as string)).toBe('')
    expect(formatDimensionKey(undefined as unknown as string)).toBe('')
  })

  it('drops empty segments from leading/trailing/double underscores', () => {
    expect(formatDimensionKey('_trailing')).toBe('Trailing')
    expect(formatDimensionKey('leading_')).toBe('Leading')
    expect(formatDimensionKey('a__b')).toBe('A B')
    expect(formatDimensionKey('___')).toBe('')
  })

  it('lowercases the rest of each segment', () => {
    expect(formatDimensionKey('TECHNICAL_DEPTH')).toBe('Technical Depth')
    expect(formatDimensionKey('Mixed_Case_Word')).toBe('Mixed Case Word')
  })
})
