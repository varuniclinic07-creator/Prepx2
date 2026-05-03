// Lists the calling user's podcast episodes (last 30) plus today's row if it
// exists. Refreshes signed URLs lazily per row so the player never gets a
// stale link from cached state.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getOrRefreshEpisodeUrl } from '@/lib/podcast/storage';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: rows } = await supabase
    .from('podcast_episodes')
    .select('id, date, status, script_text, audio_url, audio_path, signed_url_expires_at, gs_topics_covered, duration_seconds')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(30);

  const episodes = await Promise.all((rows ?? []).map(async (ep) => {
    let audio_url = ep.audio_url ?? null;
    if (ep.status === 'completed' && ep.audio_path) {
      try {
        audio_url = await getOrRefreshEpisodeUrl(ep.id);
      } catch {
        // fall back to stored audio_url
      }
    }
    return {
      id: ep.id,
      date: ep.date,
      status: ep.status,
      audio_url,
      script_excerpt: (ep.script_text ?? '').slice(0, 240),
      gs_topics_covered: ep.gs_topics_covered ?? [],
      duration_seconds: ep.duration_seconds,
    };
  }));

  return NextResponse.json({ episodes });
}
