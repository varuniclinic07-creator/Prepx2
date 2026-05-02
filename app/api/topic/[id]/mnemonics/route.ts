// /api/topic/[id]/mnemonics
//   GET  Returns mnemonics published for a topic — catalog rows (user_id NULL)
//        plus rows owned by the calling user. RLS enforces this; the route
//        just fetches and shapes the response.

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: topicId } = await ctx.params;
  if (!topicId) return NextResponse.json({ error: 'topic id required' }, { status: 400 });

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await sb
    .from('mnemonic_artifacts')
    .select('id, topic_id, user_id, topic_query, style, text, explanation, scene_spec, render_status, comfy_video_url, generated_by, created_at')
    .eq('topic_id', topicId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data || [] });
}
