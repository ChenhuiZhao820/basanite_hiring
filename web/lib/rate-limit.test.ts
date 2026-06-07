import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Force the in-memory branch by ensuring no Upstash env is present at test time.
delete process.env.UPSTASH_REDIS_REST_URL
delete process.env.UPSTASH_REDIS_REST_TOKEN

import { allow, getIP } from './rate-limit'

describe('allow (in-memory fallback)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 1))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows the first request', async () => {
    expect(await allow('k1', 3, 1000)).toBe(true)
  })

  it('blocks once the limit is reached', async () => {
    const k = `k-block-${Math.random()}`
    expect(await allow(k, 2, 1000)).toBe(true)
    expect(await allow(k, 2, 1000)).toBe(true)
    expect(await allow(k, 2, 1000)).toBe(false)
  })

  it('resets after the window expires', async () => {
    const k = `k-reset-${Math.random()}`
    expect(await allow(k, 1, 1000)).toBe(true)
    expect(await allow(k, 1, 1000)).toBe(false)
    vi.advanceTimersByTime(1500)
    expect(await allow(k, 1, 1000)).toBe(true)
  })

  it('isolates different keys', async () => {
    const a = `a-${Math.random()}`
    const b = `b-${Math.random()}`
    expect(await allow(a, 1, 1000)).toBe(true)
    expect(await allow(b, 1, 1000)).toBe(true)
    expect(await allow(a, 1, 1000)).toBe(false)
    expect(await allow(b, 1, 1000)).toBe(false)
  })
})

describe('getIP', () => {
  function req(headers: Record<string, string>): Request {
    return new Request('https://test/', { headers })
  }

  it('prefers x-vercel-forwarded-for', () => {
    const r = req({
      'x-vercel-forwarded-for': '203.0.113.7',
      'x-real-ip': '127.0.0.1',
      'x-forwarded-for': '198.51.100.1, 127.0.0.1',
    })
    expect(getIP(r)).toBe('203.0.113.7')
  })

  it('falls back to x-real-ip when x-vercel-forwarded-for missing', () => {
    expect(getIP(req({ 'x-real-ip': '127.0.0.1' }))).toBe('127.0.0.1')
  })

  it('falls back to rightmost x-forwarded-for', () => {
    const r = req({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3' })
    expect(getIP(r)).toBe('3.3.3.3')
  })

  it('strips whitespace from x-forwarded-for entry', () => {
    const r = req({ 'x-forwarded-for': '1.1.1.1,  2.2.2.2  ' })
    expect(getIP(r)).toBe('2.2.2.2')
  })

  it('returns "unknown" when nothing is present', () => {
    expect(getIP(req({}))).toBe('unknown')
  })
})

// ENG-33: production deploys must never silently fall back to the
// per-instance in-memory limiter. The module fails to import when
// VERCEL_ENV/NODE_ENV is "production" and Upstash creds are missing.
describe('production fail-closed init', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.resetModules()
  })

  it('throws when production env has no Upstash creds', async () => {
    process.env.VERCEL_ENV = 'production'
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    vi.resetModules()
    await expect(import('./rate-limit')).rejects.toThrow(/Rate limiter misconfigured/)
  })

  it('throws when NODE_ENV=production has no Upstash creds', async () => {
    delete process.env.VERCEL_ENV
    process.env.NODE_ENV = 'production'
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    vi.resetModules()
    await expect(import('./rate-limit')).rejects.toThrow(/Rate limiter misconfigured/)
  })

  it('imports cleanly in production when Upstash creds are present', async () => {
    process.env.VERCEL_ENV = 'production'
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
    vi.resetModules()
    await expect(import('./rate-limit')).resolves.toMatchObject({ allow: expect.any(Function) })
  })

  it('does not throw outside production even without Upstash creds', async () => {
    delete process.env.VERCEL_ENV
    process.env.NODE_ENV = 'development'
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    vi.resetModules()
    await expect(import('./rate-limit')).resolves.toMatchObject({ allow: expect.any(Function) })
  })
})

// Real production regression: Lynn's deploy had a trailing "\n" on
// UPSTASH_REDIS_REST_URL (copy-paste artefact). @upstash/redis rejects
// the URL synchronously inside `new Redis(...)`, the route returned 500
// in 6.6s, and zero candidates could upload a CV. The module must
// tolerate this — by trimming on read AND by catching construction
// errors and degrading to the in-memory limiter.
describe('hardening against bad env-var values', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.resetModules()
  })

  it('trims trailing whitespace from the Upstash URL before passing it to Redis', async () => {
    process.env.VERCEL_ENV = 'production'
    process.env.UPSTASH_REDIS_REST_URL = 'https://relaxing-cobra-83032.upstash.io\n'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'tok\n'
    vi.resetModules()
    let received: { url?: string; token?: string } = {}
    vi.doMock('@upstash/redis', () => ({
      Redis: class {
        constructor(opts: { url: string; token: string }) {
          received = { url: opts.url, token: opts.token }
        }
      },
    }))
    vi.doMock('@upstash/ratelimit', () => ({
      Ratelimit: class {
        static slidingWindow() { return {} }
        async limit() { return { success: true } }
      },
    }))
    const { allow } = await import('./rate-limit')
    await allow('k', 1, 1000)
    expect(received.url).toBe('https://relaxing-cobra-83032.upstash.io')
    expect(received.token).toBe('tok')
  })

  it('degrades to in-memory when Redis construction throws (bad URL)', async () => {
    process.env.VERCEL_ENV = 'production'
    process.env.UPSTASH_REDIS_REST_URL = 'not a real url'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'tok'
    vi.resetModules()
    vi.doMock('@upstash/redis', () => ({
      Redis: class {
        constructor() {
          throw new Error('UrlError: invalid URL')
        }
      },
    }))
    vi.doMock('@upstash/ratelimit', () => ({
      Ratelimit: class {
        static slidingWindow() { return {} }
        async limit() { return { success: true } }
      },
    }))
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { allow } = await import('./rate-limit')
    // First call surfaces the failure and falls back; result must be true (in-memory allows the 1st).
    await expect(allow('k1', 3, 1000)).resolves.toBe(true)
    // Subsequent calls also go to in-memory without re-attempting Redis.
    await expect(allow('k1', 3, 1000)).resolves.toBe(true)
    await expect(allow('k1', 3, 1000)).resolves.toBe(true)
    await expect(allow('k1', 3, 1000)).resolves.toBe(false)
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })
})
