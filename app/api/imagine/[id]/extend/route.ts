import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';
import { spawnAgent } from '@/lib/agents/hermes-dispatch';

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // RLS via the user's session — only the owner can read this row.
  const { data: existing, error: exErr } = await supabase
    .from('imagine_videos')
    .select('id, topic_query, duration_seconds, user_id')
    .eq('id', id)
    .maybeSingle();
  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const admin = getAdminClient();
  const result = await spawnAgent(admin, {
    agentType: 'imagine',
    userId: user.id,
    payload: {
      source: 'imagine-api-extend',
      extendVideoId: existing.id,
      topicQuery: existing.topic_query,
      userId: user.id,
      durationSeconds: 30,
    },
    priority: 4,
  });

  return NextResponse.json({ taskId: result.taskId, queueName: result.queueName, videoId: existing.id });
}
