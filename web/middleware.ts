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
  const scriptSrc = isDev
    ? `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' blob: ${mergeScript}`
    : `script-src 'self' 'nonce-${nonce}' blob: ${mergeScript}`
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://images.unsplash.com",
    "font-src 'self'",
    "media-src 'self' blob:",
    `connect-src 'self' blob: https://*.supabase.co wss://*.supabase.co https://*.elevenlabs.io wss://*.elevenlabs.io https://*.livekit.cloud wss://*.livekit.cloud ${mergeApi}`,
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
  const isAssessProtected = /^\/assess\/[^/]+\/(onboard|interview|complete)/.test(path)

  const role = user?.app_metadata?.role as string | undefined
  const isAdmin = user?.app_metadata?.is_admin === true

  // Dashboard routes require auth
  if (isDashboard && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  // Dashboard is for hirers (and admins). Candidates who stumble in
  // get bounced to the landing page with a hint.
  if (isDashboard && user && !isAdmin && role !== 'hirer') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('error', 'Hirer access only.')
    return NextResponse.redirect(url)
  }

  // Assessment routes (onboard/interview/complete) require auth
  // But redirect to the assessment landing page, not /login
  if (isAssessProtected && !user) {
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
