import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';
import { spawnAgent } from '@/lib/agents/hermes-dispatch';

const BodySchema = z.object({
  topic: z.string().min(2).max(120),
  durationSeconds: z.number().int().min(20).max(120).optional(),
  style: z.enum(['classroom', 'concept-short']).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  language: z.enum(['en', 'hi', 'hinglish']).optional(),
  outputFormat: z.literal('mp4-1280x720').optional(),
  skipLtx: z.boolean().optional(),
  // Sprint 9-C slice-2 — opt-in Remotion parallel render.
  useRemotion: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminClient();

  // Pre-create the lecture_jobs row so the response can return its id and so
  // the worker has a target row when stage progress arrives.
  const { data: row, error: insertErr } = await admin
    .from('lecture_jobs')
    .insert({
      user_id: user.id,
      topic: parsed.data.topic,
      // Provisional lecture_id; the processor overwrites with the final
      // lec_{slug}_{hash}_{ts} once cache_hash is computed.
      lecture_id: `pending_${user.id}_${Date.now()}`,
      params: parsed.data,
      status: 'queued',
    })
    .select('id, lecture_id')
    .single();

  if (insertErr || !row?.id) {
    return NextResponse.json({ error: insertErr?.message || 'lecture_jobs insert failed' }, { status: 500 });
  }

  const dispatch = await spawnAgent(admin, {
    agentType: 'lecture_generate',
    userId: user.id,
    payload: {
      jobId: row.id,
      userId: user.id,
      topic: parsed.data.topic,
      durationSeconds: parsed.data.durationSeconds,
      style: parsed.data.style,
      difficulty: parsed.data.difficulty,
      language: parsed.data.language,
      outputFormat: parsed.data.outputFormat,
      skipLtx: parsed.data.skipLtx,
      useRemotion: parsed.data.useRemotion,
    },
    priority: 4,
  });

  // Stitch the agent_task into the row for traceability.
  await admin.from('lecture_jobs').update({ task_id: dispatch.taskId }).eq('id', row.id);

  return NextResponse.json({
    jobId: row.id,
    taskId: dispatch.taskId,
    queueName: dispatch.queueName,
    status: 'queued',
  }, { status: 202 });
}

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('lecture_jobs')
    .select('id, topic, status, progress_percent, lecture_id, created_at, updated_at, completed_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data || [] });
}
