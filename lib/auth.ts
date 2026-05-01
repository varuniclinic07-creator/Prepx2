/**
 * Server-side auth helpers. Use from Server Components and route handlers.
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Redirect to /login if no user. Returns the user otherwise.
 * Use this at the top of authenticated Server Components.
 */
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect('/login');
  return user;
}
