// POST /api/admin/video/scripts — admin queues a script-generation job
//   for a topic. Body JSON: { topicId, durationMinutes?, language? }
//   Returns: { taskId, scriptId? } — scriptId arrives once the worker drains.
//
// PATCH /api/admin/video/scripts — admin approves a draft script and queues
//   it for rendering. Body JSON: { scriptId, action: 'approve' | 'reject' }

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';
import { spawnAgent } from '@/lib/agents/hermes-dispatch';

async function requireAdmin() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: 'Unauthorized' };
  const { data: profile } = await sb.from('users').select('role, id').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { ok: false as const, status: 403, error: 'Forbidden' };
  return { ok: true as const, userId: user.id };
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const topicId: string | undefined = body?.topicId;
  if (!topicId) return NextResponse.json({ error: 'topicId required' }, { status: 400 });
  const durationMinutes: number = Number(body?.durationMinutes) || 30;
  const language: 'en' | 'hi' = body?.language === 'hi' ? 'hi' : 'en';

  const admin = getAdminClient();
  const { data: topic } = await admin.from('topics').select('id').eq('id', topicId).maybeSingle();
  if (!topic) return NextResponse.json({ error: 'topic not found' }, { status: 404 });

  const result = await spawnAgent(admin, {
    agentType: 'script',
    payload: {
      source: 'admin-video-scripts',
      topicId,
      durationMinutes,
      language,
    },
    priority: 3,
  });
  return NextResponse.json({ taskId: result.taskId, queueName: result.queueName });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const scriptId: string | undefined = body?.scriptId;
  const action: string | undefined = body?.action;
  if (!scriptId || !['approve','reject'].includes(action || '')) {
    return NextResponse.json({ error: 'scriptId and action (approve|reject) required' }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data: script } = await admin.from('video_scripts').select('id, status').eq('id', scriptId).maybeSingle();
  if (!script) return NextResponse.json({ error: 'script not found' }, { status: 404 });
  if (script.status !== 'draft') {
    return NextResponse.json({ error: `script status is ${script.status}, must be draft` }, { status: 409 });
  }

  if (action === 'reject') {
    await admin.from('video_scripts').update({ status: 'failed' }).eq('id', scriptId);
    return NextResponse.json({ ok: true, status: 'failed' });
  }

  // approve → flip to 'approved' + queue render job
  await admin.from('video_scripts').update({
    status: 'approved',
    approved_at: new Date().toISOString(),
    approved_by: auth.userId,
  }).eq('id', scriptId);
  const result = await spawnAgent(admin, {
    agentType: 'render',
    payload: { source: 'admin-approve', scriptId },
    priority: 4,
  });
  return NextResponse.json({ ok: true, status: 'approved', renderTaskId: result.taskId });
}
