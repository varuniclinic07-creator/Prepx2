import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';
import { spawnAgent } from '@/lib/agents/hermes-dispatch';

const BodySchema = z.object({
  topicQuery: z.string().min(2).max(500),
  durationSeconds: z.number().int().min(15).max(300).optional(),
});

export async function POST(req: NextRequest) {
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const durationSeconds = parsed.data.durationSeconds ?? 60;
  const topicQuery = parsed.data.topicQuery.trim();

  const admin = getAdminClient();
  const { data: inserted, error: insertErr } = await admin
    .from('imagine_videos')
    .insert({
      user_id: user.id,
      topic_query: topicQuery,
      duration_seconds: durationSeconds,
      voiceover_segments: [],
      scene_specs: [],
      render_status: 'r3f_only',
      generated_by: 'imagine-engine-v1',
    })
    .select('id')
    .single();

  if (insertErr || !inserted?.id) {
    return NextResponse.json({ error: insertErr?.message || 'Insert failed' }, { status: 500 });
  }
  const videoId = inserted.id as string;

  const result = await spawnAgent(admin, {
    agentType: 'imagine',
    userId: user.id,
    payload: {
      source: 'imagine-api',
      videoId,
      topicQuery,
      userId: user.id,
      durationSeconds,
    },
    priority: 4,
  });

  return NextResponse.json({ videoId, taskId: result.taskId, queueName: result.queueName });
}

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('imagine_videos')
    .select('id, topic_query, syllabus_tag, duration_seconds, scene_specs, render_status, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data || [] });
}
