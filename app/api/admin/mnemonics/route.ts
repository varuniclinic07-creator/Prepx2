// /api/admin/mnemonics
//   GET  ?status=r3f_only|queued|rendering|rendered|failed&topicId=<uuid>&limit=50&offset=0
//   POST { topicId } -> spawns a mnemonic-job for the public catalog

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';
import { spawnAgent } from '@/lib/agents/hermes-dispatch';

const ALLOWED_STATUSES = new Set(['r3f_only', 'queued', 'rendering', 'rendered', 'failed']);

async function requireAdmin() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: 'Unauthorized' };
  const { data: profile } = await sb.from('users').select('role, id').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { ok: false as const, status: 403, error: 'Forbidden' };
  return { ok: true as const, userId: user.id };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const topicId = url.searchParams.get('topicId') || url.searchParams.get('topic');
  const limit = Math.min(Number(url.searchParams.get('limit') || '50'), 200);
  const offset = Math.max(Number(url.searchParams.get('offset') || '0'), 0);

  const admin = getAdminClient();
  let query = admin.from('mnemonic_artifacts')
    .select('id, topic_id, user_id, topic_query, style, text, explanation, render_status, generated_by, created_at, topics(title)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && ALLOWED_STATUSES.has(status)) {
    query = query.eq('render_status', status);
  }
  if (topicId) {
    query = query.eq('topic_id', topicId);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data || [], total: count ?? 0, limit, offset });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const topicId: string | undefined = body?.topicId;
  if (!topicId) return NextResponse.json({ error: 'topicId required' }, { status: 400 });

  const admin = getAdminClient();
  const { data: topic } = await admin.from('topics').select('id').eq('id', topicId).maybeSingle();
  if (!topic) return NextResponse.json({ error: 'topic not found' }, { status: 404 });

  const result = await spawnAgent(admin, {
    agentType: 'mnemonic',
    payload: {
      source: 'admin-mnemonics-regenerate',
      topicId,
    },
    priority: 3,
  });

  return NextResponse.json({
    ok: true,
    taskId: result.taskId,
    queueName: result.queueName,
    jobId: result.jobId,
  });
}
