import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';
import { textToSpeech } from '@/lib/ai-router';
import { uploadPodcastAudio, mintPodcastSignedUrl } from '@/lib/podcast/storage';

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
    .maybeSingle();

  if (existing?.status === 'completed' && existing.audio_url) {
    return NextResponse.json({ episode: existing });
  }

  const { data: globalEp } = await supabase
    .from('daily_dhwani')
    .select('script_text, gs_paper')
    .eq('date', today)
    .maybeSingle();

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
    const storagePath = `${user.id}/${today}.mp3`;
    await uploadPodcastAudio(storagePath, audioBuffer);
    const { url, expiresAt } = await mintPodcastSignedUrl(storagePath);

    const admin = getAdminClient();
    const { data: updated } = await admin
      .from('podcast_episodes')
      .update({
        audio_path: storagePath,
        audio_url: url,
        signed_url_expires_at: expiresAt,
        status: 'completed',
      })
      .eq('id', episode.id)
      .select()
      .single();

    return NextResponse.json({ episode: updated });
  } catch (e) {
    const admin = getAdminClient();
    await admin
      .from('podcast_episodes')
      .update({ status: 'failed' })
      .eq('id', episode.id);
    return NextResponse.json({
      error: 'TTS generation failed',
      detail: e instanceof Error ? e.message : 'unknown',
    }, { status: 500 });
  }
}
