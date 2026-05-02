// /api/topic/[id]/mindmap
//   GET — returns the latest 'ready' mindmap for a topic plus its nodes.
// Public (RLS on animated_mindmaps + mindmap_nodes already restricts to
// status='ready' for non-admins). The route still requires an authenticated
// session because the underlying tables are RLS-gated to authenticated.

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: topicId } = await ctx.params;
  if (!topicId) return NextResponse.json({ error: 'topic id required' }, { status: 400 });

  const sb = await createClient();

  const { data: mindmap, error: mErr } = await sb
    .from('animated_mindmaps')
    .select('id, topic_id, chapter_id, title, layout, status, preview_url, created_at, updated_at')
    .eq('topic_id', topicId)
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
  if (!mindmap) return NextResponse.json({ mindmap: null, nodes: [] });

  const { data: nodes, error: nErr } = await sb
    .from('mindmap_nodes')
    .select('id, parent_id, label, summary, depth, position, color_hint')
    .eq('mindmap_id', mindmap.id)
    .order('depth', { ascending: true });

  if (nErr) return NextResponse.json({ error: nErr.message }, { status: 500 });

  return NextResponse.json({ mindmap, nodes: nodes || [] });
}
