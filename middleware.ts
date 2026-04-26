import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getTenantFromHost } from './lib/tenant'

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const tenant = getTenantFromHost(host)
  const res = NextResponse.next()
  if (tenant.slug) res.headers.set('x-tenant-slug', tenant.slug)

  try {
    const supabase = createMiddlewareClient({ req: request, res })
    const { data: { session } } = await supabase.auth.getSession()

    const isAdminPath = request.nextUrl.pathname.startsWith('/admin')
    if (isAdminPath && !session) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      return NextResponse.redirect(loginUrl)
    }
    if (isAdminPath && session) {
      const { data: profile } = await supabase.from('users').select('role').eq('id', session.user.id).single()
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
