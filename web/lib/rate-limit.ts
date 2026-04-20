import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ---------------------------------------------------------------------------
// Upstash Redis-backed rate limiting (distributed, persists across Vercel
// invocations). Falls back to in-memory when env vars are absent (local dev).
// ---------------------------------------------------------------------------

// Cache Ratelimit instances by config to avoid rebuilding on every request
const limiters = new Map<string, Ratelimit>()

function getLimiter(limit: number, windowMs: number): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  const key = `${limit}:${windowMs}`
  if (!limiters.has(key)) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    limiters.set(
      key,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${windowMs}ms` as `${number}ms`),
        prefix: 'rl',
      }),
    )
  }
  return limiters.get(key)!
}

// ---------------------------------------------------------------------------
// In-memory fallback (dev / missing env vars)
// ---------------------------------------------------------------------------

interface Entry { count: number; resetAt: number }
const store = new Map<string, Entry>()
let lastPrune = 0

function allowInMemory(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  if (now - lastPrune > 60_000) {
    lastPrune = now
    for (const [k, e] of store) if (now > e.resetAt) store.delete(k)
  }
  const entry = store.get(key)
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

// ---------------------------------------------------------------------------
// Public API, async to support Upstash, backwards-compatible call sites use
// await. Call sites that previously used the sync version must be updated.
// ---------------------------------------------------------------------------

/**
 * Returns true if the request is within the allowed rate, false if it should be blocked.
 * @param key      Unique identifier (e.g. IP or user ID)
 * @param limit    Max requests allowed in the window
 * @param windowMs Window size in milliseconds
 */
export async function allow(key: string, limit: number, windowMs: number): Promise<boolean> {
  const limiter = getLimiter(limit, windowMs)
  if (!limiter) {
    // Dev fallback, in-memory, best-effort
    return allowInMemory(key, limit, windowMs)
  }
  const { success } = await limiter.limit(key)
  return success
}

/** Extract the real client IP from a Next.js request.
 *  Prefers x-vercel-forwarded-for (set by Vercel's edge, not spoofable by clients)
 *  over x-forwarded-for, where the leftmost value is client-controlled. */
export function getIP(request: Request): string {
  return (
    request.headers.get('x-vercel-forwarded-for') ??
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ??
    'unknown'
  )
}
