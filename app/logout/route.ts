import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) throw new Error('Missing NEXT_PUBLIC_BASE_URL');
  return NextResponse.redirect(new URL('/', baseUrl), { status: 302 })
}