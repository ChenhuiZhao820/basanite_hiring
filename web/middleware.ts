import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
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

  // Dashboard routes require auth
  if (isDashboard && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', path)
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

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/assess/:token/onboard', '/assess/:token/interview', '/assess/:token/complete'],
}
