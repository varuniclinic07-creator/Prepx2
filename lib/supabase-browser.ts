import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export function createClient() {
  try {
    return createClientComponentClient()
  } catch {
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
}
