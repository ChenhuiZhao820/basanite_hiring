import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component, middleware handles session refresh
          }
        },
      },
    }
  )
}

/** Service-role client, bypasses RLS. Server-side only.
 *  Uses supabase-js directly (no cookie auth) so the service key
 *  is the sole credential sent to PostgREST. */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/**
 * Fast read of the authenticated user's id from the JWT in cookies.
 *
 * `supabase.auth.getUser()` does a roundtrip to Supabase Auth on every call
 * to revalidate the token — that's a ~50-150ms tax on every dashboard page
 * load even though middleware has already refreshed/verified the session.
 *
 * Middleware (web/middleware.ts) already calls getUser() once per request
 * and bounces unauthenticated users to /login, so by the time a page runs
 * the cookie's JWT is known-good. We only need the user id to scope queries.
 *
 * Returns null if the cookie is missing/malformed; the page should redirect.
 */
export async function getAuthUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    // Supabase stores the session as JSON under sb-<ref>-auth-token (sometimes
    // chunked across .0/.1 cookies for large payloads). We just pull out the
    // access_token's `sub` claim.
    const all = cookieStore.getAll()
    const authParts = all
      .filter(c => /sb-.+-auth-token(\.\d+)?$/.test(c.name))
      .sort((a, b) => a.name.localeCompare(b.name))
    if (authParts.length === 0) return null

    let raw = authParts.map(c => c.value).join('')
    // Some versions prefix with "base64-"; strip and decode.
    if (raw.startsWith('base64-')) {
      raw = Buffer.from(raw.slice('base64-'.length), 'base64').toString('utf-8')
    }
    const session = JSON.parse(raw)
    const accessToken: string | undefined = session?.access_token
    if (!accessToken) return null

    const payload = accessToken.split('.')[1]
    if (!payload) return null
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'))
    return typeof claims.sub === 'string' ? claims.sub : null
  } catch {
    return null
  }
}

/** Same JWT decode as getAuthUserId, but returns the email claim. */
export async function getAuthUserEmail(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const all = cookieStore.getAll()
    const authParts = all
      .filter(c => /sb-.+-auth-token(\.\d+)?$/.test(c.name))
      .sort((a, b) => a.name.localeCompare(b.name))
    if (authParts.length === 0) return null

    let raw = authParts.map(c => c.value).join('')
    if (raw.startsWith('base64-')) {
      raw = Buffer.from(raw.slice('base64-'.length), 'base64').toString('utf-8')
    }
    const session = JSON.parse(raw)
    const accessToken: string | undefined = session?.access_token
    if (!accessToken) return null

    const payload = accessToken.split('.')[1]
    if (!payload) return null
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'))
    return typeof claims.email === 'string' ? claims.email : null
  } catch {
    return null
  }
}
