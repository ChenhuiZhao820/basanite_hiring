import { describe, expect, it } from 'vitest'

import { isValidUUID, safeNext } from './validate'

describe('isValidUUID', () => {
  it.each([
    '00000000-0000-0000-0000-000000000000',
    'abcdef12-3456-7890-abcd-ef1234567890',
    'AAAAAAAA-BBBB-CCCC-DDDD-EEEEFFFF0000',
    '11111111-1111-1111-1111-111111111111',
  ])('accepts canonical UUID %s', (uuid) => {
    expect(isValidUUID(uuid)).toBe(true)
  })

  it.each([
    '',
    'not-a-uuid',
    'abcdef12-3456-7890-abcd-ef12345678',          // too short
    'abcdef12-3456-7890-abcd-ef12345678901',       // too long
    'abcdef12-3456-7890-abcd-ef1234567890-extra',
    '12345678-1234-1234-1234-1234567890gg',        // non-hex
    '123456781234123412341234567890ab',            // missing dashes
  ])('rejects malformed UUID %s', (s) => {
    expect(isValidUUID(s)).toBe(false)
  })
})

describe('safeNext', () => {
  it('returns the path when it is a single-slash same-origin path', () => {
    expect(safeNext('/dashboard/roles')).toBe('/dashboard/roles')
    expect(safeNext('/assess/abc123')).toBe('/assess/abc123')
  })

  it('returns fallback for empty / non-string / null / undefined', () => {
    expect(safeNext(null)).toBe('/dashboard')
    expect(safeNext(undefined)).toBe('/dashboard')
    expect(safeNext('')).toBe('/dashboard')
  })

  it.each(['//evil.com', '//evil.com/path'])(
    'rejects protocol-relative URL %s', (s) => {
      expect(safeNext(s)).toBe('/dashboard')
    },
  )

  it('rejects backslash-escape attacks', () => {
    expect(safeNext('/\\evil.com')).toBe('/dashboard')
  })

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>',
    'https://evil.com',
    'http://evil.com',
    'evil.com/path',
  ])('rejects scheme-prefixed and bare values %s', (s) => {
    expect(safeNext(s)).toBe('/dashboard')
  })

  it('uses custom fallback when provided', () => {
    expect(safeNext(null, '/login')).toBe('/login')
    expect(safeNext('//evil', '/safe')).toBe('/safe')
  })
})
