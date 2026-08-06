import { describe, expect, it } from 'vitest'

import { resolveCallbackDestination } from './auth-callback-destination'

describe('resolveCallbackDestination', () => {
  it('routes to /set-password for a recovery session regardless of next', () => {
    expect(resolveCallbackDestination('/dashboard', true)).toBe('/set-password')
    expect(resolveCallbackDestination('/portal', true)).toBe('/set-password')
    expect(resolveCallbackDestination('/set-password', true)).toBe('/set-password')
  })

  it('routes /dashboard next to /login?verified=1 for a non-recovery session (signup/invite confirmation)', () => {
    expect(resolveCallbackDestination('/dashboard', false)).toBe('/login?verified=1')
  })

  it('routes straight to an explicit non-dashboard next for a non-recovery session', () => {
    expect(resolveCallbackDestination('/portal', false)).toBe('/portal')
    expect(resolveCallbackDestination('/set-password', false)).toBe('/set-password')
  })
})
