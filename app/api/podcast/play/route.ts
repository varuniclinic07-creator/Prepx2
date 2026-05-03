// Logs play progress to podcast_play_history. Called from the player on
// pause/end with elapsed seconds. Idempotent-ish: we always insert a new row
// rather than upsert so we can chart listening sessions later.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

const Body = z.object({
  episode_id: z.string().uuid(),
  played_seconds: z.number().int().min(0).max(60 * 60 * 4),
  completed: z.boolean().optional(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { error } = await supabase.from('podcast_play_history').insert({
    user_id: user.id,
    episode_id: parsed.episode_id,
    played_seconds: parsed.played_seconds,
    completed: parsed.completed ?? false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
