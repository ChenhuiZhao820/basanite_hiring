import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function csp(nonce: string, isDev: boolean): string {
  // Per-request nonce replaces `'unsafe-inline'` in script-src so any future
  // reflected/stored XSS cannot execute without knowing the current nonce.
  // Dev mode still needs `unsafe-eval` for Next.js HMR; prod does not.
  //
  // Merge.dev: their React Link SDK injects their CDN script + iframe + their
  // dialog script tags inline at runtime, so we have to allow their domain
  // explicitly. They publish an allowlist guide at
  // https://docs.merge.dev/integrations/security/csp/ — these are the
  // entries that match.
  // Wildcard *.merge.dev because the SDK distributes its dialog as an iframe
  // off the same origin it loaded the script from (cdn.merge.dev/index.html),
  // and they may rotate hostnames per environment. Confirmed via DevTools
  // that the iframe src is https://cdn.merge.dev/index.html, not the
  // link.merge.dev I originally guessed.
  const mergeScript = "https://*.merge.dev https://merge-link-cdn-prod.s3.amazonaws.com"
  const mergeFrame = "https://*.merge.dev"
  const mergeApi = "https://*.merge.dev"
  // Google Analytics 4 — gtag.js script, data collection endpoint, and the
  // optional Tag Manager container that some installs route through. Only
  // active when NEXT_PUBLIC_GA_MEASUREMENT_ID is set, but allowing them here
  // unconditionally is safe — they don't activate without the inline gtag
  // init script, which is gated in app/layout.tsx.
  const gaScript = "https://www.googletagmanager.com https://*.googletagmanager.com"
  const gaConnect = "https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com"
  const gaImg = "https://www.google-analytics.com https://*.google-analytics.com https://*.googletagmanager.com"
  const scriptSrc = isDev
    ? `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' blob: ${mergeScript} ${gaScript}`
    : `script-src 'self' 'nonce-${nonce}' blob: ${mergeScript} ${gaScript}`
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://images.unsplash.com ${gaImg}`,
    "font-src 'self'",
    "media-src 'self' blob:",
    `connect-src 'self' blob: https://*.supabase.co wss://*.supabase.co https://*.elevenlabs.io wss://*.elevenlabs.io https://*.livekit.cloud wss://*.livekit.cloud ${mergeApi} ${gaConnect}`,
    `frame-src 'self' ${mergeFrame}`,
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}

function generateNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

export async function middleware(request: NextRequest) {
  const nonce = generateNonce()
  const isDev = process.env.NODE_ENV === 'development'
  const cspHeader = csp(nonce, isDev)

  // Propagate the nonce into the rendering pipeline so Server Components
  // can read it via `headers().get('x-nonce')` when they need to mark a
  // specific inline <script> tag with the matching nonce attribute.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', cspHeader)

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isDashboard = path.startsWith('/dashboard')
  // NOTE: /onboard is intentionally NOT protected — it hosts the candidate
  // sign-up / sign-in form, so a brand-new (unauthenticated) candidate must
  // be able to reach it. Locking it behind auth bounced new candidates to the
  // landing page and made self-serve onboarding impossible. The sensitive
  // actions invoked from onboard (/cv-upload, /start) are independently
  // auth-gated server-side via assertCandidateSession, so this is safe.
  const isAssessProtected = /^\/assess\/[^/]+\/(interview|complete)/.test(path)

  const role = user?.app_metadata?.role as string | undefined
  const isAdmin = user?.app_metadata?.is_admin === true
  // ENG-57: is_candidate must live in app_metadata, never user_metadata.
  // Supabase exposes auth.updateUser({ data: ... }) to clients (writes
  // user_metadata) — a candidate could otherwise call it from the
  // browser console with `{ is_candidate: false }` and bypass this
  // gate. app_metadata is service-role-only; the only writer is the
  // /api/auth/tag-candidate route.
  const isCandidate = user?.app_metadata?.is_candidate === true

  // Suspended accounts (repeated corroborated prompt-injection attempts,
  // or a manual admin action) are parked on /suspended until an admin
  // reinstates them. The flag lives in app_metadata — service-role-only,
  // same tamper-proofing rationale as is_candidate below. Admins are
  // exempt so an accidental self-suspension can't lock the admin out.
  const isSuspended = user?.app_metadata?.suspended === true
  if (isSuspended && !isAdmin && isDashboard) {
    const url = request.nextUrl.clone()
    url.pathname = '/suspended'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Dashboard routes require auth
  if (isDashboard && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  // Dashboard is for hirers (and admins). Candidates get bounced even if
  // their app_metadata.role somehow says 'hirer' — the is_candidate flag
  // wins.
  if (isDashboard && user && !isAdmin && (isCandidate || role !== 'hirer')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('error', 'Hirer access only.')
    return NextResponse.redirect(url)
  }

  // DEV-ONLY local-testing bypass (see web/lib/assess-auth.ts). When active,
  // candidates reach the interview without a Supabase session, so the
  // interview/complete auth gate below would wrongly bounce them. Double-
  // gated: never active in production, and requires the explicit flag that
  // lives only in gitignored .env files.
  const testCandidateBypass =
    process.env.NODE_ENV !== 'production' &&
    process.env.ALLOW_TEST_CANDIDATE === '1'

  // Assessment routes (interview/complete) require auth
  // But redirect to the assessment landing page, not /login
  if (isAssessProtected && !user && !testCandidateBypass) {
    const url = request.nextUrl.clone()
    // Extract token from path: /assess/{token}/onboard -> /assess/{token}
    const segments = path.split('/')
    url.pathname = `/assess/${segments[2]}`
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users from /login to /dashboard
  if (path === '/login' && user && !request.nextUrl.searchParams.has('verified')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  supabaseResponse.headers.set('Content-Security-Policy', cspHeader)
  return supabaseResponse
}

export const config = {
  matcher: [
    // Run on everything except static assets and image optimiser, so the CSP
    // header is attached to every HTML document and API response.
    '/((?!_next/static|_next/image|favicon.ico|icon.jpeg|.*\\..*).*)',
  ],
}
