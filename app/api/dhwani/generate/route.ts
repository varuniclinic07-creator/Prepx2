import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { generateDhwaniScript } from '@/lib/dhwani-engine';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const result = await generateDhwaniScript();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('daily_dhwani')
      .upsert({
        date: today,
        gs_paper: result.gs_paper,
        stories: result.stories as any,
        script_text: result.script_text,
        audio_url: null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[Dhwani] DB error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    console.error('[Dhwani] Generation error:', e?.message || e);
    return NextResponse.json({ error: e?.message || 'Generation failed' }, { status: 500 });
  }
}
