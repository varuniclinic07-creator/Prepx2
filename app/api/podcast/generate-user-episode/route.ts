import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { textToSpeech } from '@/lib/ai-router';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from('podcast_episodes')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .single();

  if (existing?.status === 'completed') return NextResponse.json({ episode: existing });

  const { data: globalEp } = await supabase
    .from('daily_dhwani')
    .select('script_text, gs_paper')
    .eq('date', today)
    .single();

  if (!globalEp?.script_text) {
    return NextResponse.json({ error: 'No episode generated for today yet' }, { status: 404 });
  }

  const { data: episode, error: insertErr } = await supabase
    .from('podcast_episodes')
    .upsert({
      user_id: user.id,
      date: today,
      script_text: globalEp.script_text,
      status: 'generating',
      gs_topics_covered: globalEp.gs_paper ? [globalEp.gs_paper] : [],
    }, { onConflict: 'user_id,date' })
    .select()
    .single();

  if (insertErr || !episode) {
    return NextResponse.json({ error: 'Failed to create episode' }, { status: 500 });
  }

  try {
    const audioBuffer = await textToSpeech(globalEp.script_text.slice(0, 4000));
    const base64 = audioBuffer.toString('base64');
    const audioUrl = `data:audio/mp3;base64,${base64}`;

    const { data: updated } = await supabase
      .from('podcast_episodes')
      .update({ audio_url: audioUrl, status: 'completed' })
      .eq('id', episode.id)
      .select()
      .single();

    return NextResponse.json({ episode: updated });
  } catch {
    await supabase
      .from('podcast_episodes')
      .update({ status: 'failed' })
      .eq('id', episode.id);
    return NextResponse.json({ error: 'TTS generation failed' }, { status: 500 });
  }
}
