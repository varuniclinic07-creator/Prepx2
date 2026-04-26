import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = createClient();
  const { data } = await supabase.from('white_label_tenants').select('*').order('created_at', { ascending: false });
  return NextResponse.json({ tenants: data || [] });
}

export async function POST(req: Request) {
  const body = await req.json() as {
    slug: string; name: string; primary_color: string; logo_url: string; ai_coach_name: string; setup_fee: number; monthly_fee: number;
  };
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data } = await supabase.from('white_label_tenants').insert(body).select().single();
  return NextResponse.json({ tenant: data });
}

export async function PATCH(req: Request) {
  const { id, status } = await req.json() as { id: string; status: string };
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await supabase.from('white_label_tenants').update({ status }).eq('id', id);
  return NextResponse.json({ ok: true });
}
