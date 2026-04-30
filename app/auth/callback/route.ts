import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// OAuth + magic-link callback. Exchanges the code for a session, then routes
// the user to onboarding (if their public.users row has no baseline_score yet)
// or to the dashboard (if they've already completed the diagnostic).
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const errorParam = requestUrl.searchParams.get('error_description') || requestUrl.searchParams.get('error')

  // Honor an explicit ?next=/path return-to (must be a same-origin path to
  // prevent open-redirect abuse).
  const nextParam = requestUrl.searchParams.get('next')
  const safeNext = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : null

  // If Supabase OAuth bounced back with an error, surface it on /login
  // rather than silently redirecting to /.
  if (errorParam && !code) {
    const loginUrl = new URL('/login', requestUrl.origin)
    loginUrl.searchParams.set('error', errorParam.slice(0, 200))
    return NextResponse.redirect(loginUrl)
  }

  // Default destination: home. Will be overridden after we read the user row.
  let destination = safeNext || '/'
  const response = NextResponse.redirect(new URL(destination, requestUrl.origin))

  if (!code) return response

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    const loginUrl = new URL('/login', requestUrl.origin)
    loginUrl.searchParams.set('error', exchangeError.message.slice(0, 200))
    return NextResponse.redirect(loginUrl)
  }

  // Route fresh users (baseline_score still NULL) to /onboarding unless the
  // caller passed an explicit ?next=. Failures here are non-fatal — fall back
  // to '/'.
  if (!safeNext) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('baseline_score')
          .eq('id', user.id)
          .maybeSingle()
        if (!profile || profile.baseline_score == null) {
          destination = '/onboarding'
        }
      }
    } catch {
      // network / RLS hiccup: keep destination = '/'
    }
  }

  // Rebuild the response with the resolved destination, preserving the
  // session cookies just written.
  const finalResponse = NextResponse.redirect(new URL(destination, requestUrl.origin))
  for (const cookie of response.cookies.getAll()) {
    finalResponse.cookies.set(cookie)
  }
  return finalResponse
}
