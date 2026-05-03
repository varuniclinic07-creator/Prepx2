// Concept Shorts API — list, create, and manage 120-second revision shorts.
// Sprint 4-1.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';
import { spawnAgent } from '@/lib/agents/hermes-dispatch';
import { z } from 'zod';

const createSchema = z.object({
  topicId: z.string().uuid(),
  conceptTag: z.string().min(1).max(100),
  durationSeconds: z.number().min(30).max(300).default(120),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);

  const { data, error } = await supabase
    .from('concept_shorts')
    .select('id, topic_id, concept_tag, title, style, render_status, approval_status, duration_seconds, created_at')
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ shorts: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid body. Required: topicId (uuid), conceptTag (string), durationSeconds? (30-300)' }, { status: 400 });
  }

  // Optional: rate-limit check (5 shorts per 24h per user)
  const admin = getAdminClient();
  const { count } = await admin.from('concept_short_generations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('generated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  if (count && count >= 5) {
    return NextResponse.json({ error: 'Rate limit: 5 concept shorts per 24 hours' }, { status: 429 });
  }

  // Pre-insert row so shortId exists before the job runs
  const { data: preRow, error: insErr } = await admin.from('concept_shorts').insert({
    topic_id: body.topicId,
    user_id: user.id,
    concept_tag: body.conceptTag,
    duration_seconds: body.durationSeconds,
    render_status: 'r3f_only',
    approval_status: 'pending',
  }).select('id').single();

  if (insErr || !preRow) {
    return NextResponse.json({ error: insErr?.message || 'Insert failed' }, { status: 500 });
  }

  // Log generation for rate limiting
  await admin.from('concept_short_generations').insert({
    user_id: user.id,
    ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
  });

  // Spawn agent job
  const { taskId } = await spawnAgent(admin, {
    agentType: 'shorts',
    userId: user.id,
    payload: {
      topicId: body.topicId,
      conceptTag: body.conceptTag,
      durationSeconds: body.durationSeconds,
      shortId: preRow.id,
    },
  });

  return NextResponse.json({ shortId: preRow.id, taskId }, { status: 201 });
}
