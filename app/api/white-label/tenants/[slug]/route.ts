import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const { slug } = params;
  const supabase = await createClient();
  const { data: tenant } = await supabase.from('white_label_tenants').select('*').eq('slug', slug).single();
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // Approximate user count stub per spec
  const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
  return NextResponse.json({ tenant, users: count || 0 });
}
