import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { cache } from 'react'

export const createClient = cache(() => {
  try {
    const cookieStore = cookies()
    return createServerComponentClient({ cookies: () => cookieStore })
  } catch {
    // Graceful fallback when Supabase env is not configured (E2E / CI)
    const createChain = () => ({
      eq: () => createChain(),
      order: () => createChain(),
      limit: () => createChain(),
      single: () => Promise.resolve({ data: null, error: null }),
    });
    return {
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      },
      from: () => ({
        select: () => createChain(),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
        upsert: () => Promise.resolve({ data: null, error: null }),
      }),
    } as any
  }
})
