import { NextRequest, NextResponse } from 'next/server';
import { generateAstraScript } from '@/lib/astra-engine';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

const BodySchema = z.object({ topic: z.string().min(1).max(10000), language: z.string().optional() });

export async function POST(request: NextRequest) {
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((e: any) => e.message).join(', ') }, { status: 400 });
  const { topic, language = 'en' } = parsed.data;

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data: existing } = await supabase.from('astra_scripts').select('*').eq('topic', topic).eq('language', language).order('created_at', { ascending: false }).limit(1).single();
    if (existing) return NextResponse.json({ script: existing, cached: true });

    const script = await generateAstraScript(topic, language);
    const { data, error } = await supabase.from('astra_scripts').insert({
      topic: script.topic, subject: script.subject, script: script.frames, status: 'rendered', language: script.language,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ script: data, cached: false });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
