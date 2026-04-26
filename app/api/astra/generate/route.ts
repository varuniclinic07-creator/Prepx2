import { NextRequest, NextResponse } from 'next/server';
import { generateAstraScript } from '@/lib/astra-engine';
import { createClient } from '@/lib/supabase-server';

// AC-03: POST { topic, language } → generate script → save to Supabase
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, language = 'en' } = body;
    if (!topic || typeof topic !== 'string') {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    // Check cache first
    const supabase = createClient();
    const { data: existing } = await supabase
      .from('astra_scripts')
      .select('*')
      .eq('topic', topic)
      .eq('language', language)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      return NextResponse.json({ script: existing, cached: true });
    }

    // Generate new script
    const script = await generateAstraScript(topic, language);
    const { data, error } = await supabase
      .from('astra_scripts')
      .insert({
        topic: script.topic,
        subject: script.subject,
        script: script.frames,
        status: 'rendered',
        language: script.language,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ script: data, cached: false });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
