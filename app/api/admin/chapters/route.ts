// /api/admin/chapters
//   GET  ?status=generated_pending_approval&limit=50&offset=0
//        Paginated chapter listing for admin UI.
//   POST { topicId }
//        Enqueue a fresh content-job (chapter generation) for a topic.

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';
import { spawnAgent } from '@/lib/agents/hermes-dispatch';

const ALLOWED_STATUSES = new Set([
  'draft',
  'generated_pending_approval',
  'approved',
  'published',
  'rejected',
]);

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
  const limit = Math.min(Number(url.searchParams.get('limit') || '50'), 200);
  const offset = Math.max(Number(url.searchParams.get('offset') || '0'), 0);

  const admin = getAdminClient();
  let query = admin.from('chapters')
    .select('id, topic_id, title, chapter_num, version, flesch_kincaid_grade, source_citations, mnemonics, mock_questions, status, rejected_reason, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && ALLOWED_STATUSES.has(status)) {
    query = query.eq('status', status);
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
    agentType: 'content',
    payload: {
      source: 'admin-chapters-regenerate',
      topicId,
      reason: 'admin_regenerate',
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
