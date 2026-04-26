import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { generateDhwaniScript } from '@/lib/dhwani-engine';
import { z } from 'zod';

const BodySchema = z.object({}).optional();

export async function POST(request: NextRequest) {
  let raw: unknown;
  try { raw = await request.json(); } catch { raw = {}; }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((e: any) => e.message).join(', ') }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const result = await generateDhwaniScript();
    if (result.script_text?.length > 10000) {
      return NextResponse.json({ error: 'Input too long. Max 10,000 chars.' }, { status: 413 });
    }
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase.from('daily_dhwani').upsert({
      date: today, gs_paper: result.gs_paper, stories: result.stories as any, script_text: result.script_text, audio_url: null, created_at: new Date().toISOString(),
    }).select().single();
    if (error) { console.error('[Dhwani] DB error:', error); return NextResponse.json({ error: 'Database error' }, { status: 500 }); }
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    console.error('[Dhwani] Generation error:', e?.message || e);
    return NextResponse.json({ error: e?.message || 'Generation failed' }, { status: 500 });
  }
}
