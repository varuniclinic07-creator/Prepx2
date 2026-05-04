import { createServerClient } from '@supabase/ssr'
import { createClient as createPlainClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'
import { cache } from 'react'

// Cookie path is the production auth flow (browser → SSR).
// Bearer fallback is for non-browser callers — the live E2E harness, native
// clients, server-to-server probes. The JWT is still verified end-to-end by
// supabase-js (signature + exp), so the fallback is not a security shortcut.
export const createClient = cache(async () => {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const auth = headerStore.get('authorization') || headerStore.get('Authorization')
  const bearer = auth?.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null

  if (bearer) {
    return createPlainClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${bearer}` } },
      },
    )
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from Server Component without response context
          }
        },
      },
    }
  )
})
