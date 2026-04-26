import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getTenantFromHost } from './lib/tenant'

type RateLimitEntry = { count: number; reset: number };
const rateMap = new Map<string, RateLimitEntry>();

function checkRateLimit(key: string, max: number): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry || now > entry.reset) {
    rateMap.set(key, { count: 1, reset: now + 60000 });
    return { allowed: true };
  }
  if (entry.count >= max) {
    return { allowed: false, retryAfter: Math.ceil((entry.reset - now) / 1000) };
  }
  entry.count += 1;
  return { allowed: true };
}

export async function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const path = request.nextUrl.pathname
  if (path.startsWith('/api/')) {
    let max = 1000
    if (path.startsWith('/api/payments/')) max = 30
    else if (
      path.startsWith('/api/astra') ||
      path.startsWith('/api/dhwani') ||
      path.startsWith('/api/mnemonics') ||
      path.startsWith('/api/battle-royale') ||
      path.startsWith('/api/interview') ||
      path.startsWith('/api/rank') ||
      path.startsWith('/api/mains') ||
      path.startsWith('/api/essay-colosseum')
    ) max = 100
    const { allowed, retryAfter } = checkRateLimit(`${ip}:${path}`, max)
    if (!allowed) {
      return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) },
      })
    }
  }

  const host = request.headers.get('host') || ''
  const tenant = getTenantFromHost(host)
  let res = NextResponse.next()
  if (tenant.slug) res.headers.set('x-tenant-slug', tenant.slug)

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
            request.cookies.set(name, value)
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  try {
    const { data: { user } } = await supabase.auth.getUser()

    const isAdminPath = request.nextUrl.pathname.startsWith('/admin')
    if (isAdminPath) {
      if (!user) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/login'
        return NextResponse.redirect(loginUrl)
      }
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
  } catch {
    // pass through
  }
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
