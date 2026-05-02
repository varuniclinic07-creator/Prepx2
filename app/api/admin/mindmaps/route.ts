// /api/admin/mindmaps
//   GET  ?status=ready|generating|failed&topicId=...&limit=50&offset=0
//        Paginated mindmap listing with node counts.
//   POST { topicId, chapterId? }
//        Enqueue a mindmap generation job for a topic.

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';
import { spawnAgent } from '@/lib/agents/hermes-dispatch';

const ALLOWED_STATUSES = new Set(['generating', 'ready', 'failed']);

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
  const topicId = url.searchParams.get('topicId');
  const limit = Math.min(Number(url.searchParams.get('limit') || '50'), 200);
  const offset = Math.max(Number(url.searchParams.get('offset') || '0'), 0);

  const admin = getAdminClient();
  let query = admin
    .from('animated_mindmaps')
    .select('id, topic_id, chapter_id, title, layout, status, generated_by, preview_url, created_at, updated_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && ALLOWED_STATUSES.has(status)) query = query.eq('status', status);
  if (topicId) query = query.eq('topic_id', topicId);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach node counts.
  const ids = (data || []).map(r => r.id as string);
  const nodeCounts: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: counts } = await admin
      .from('mindmap_nodes')
      .select('mindmap_id')
      .in('mindmap_id', ids);
    for (const r of counts || []) {
      const k = r.mindmap_id as string;
      nodeCounts[k] = (nodeCounts[k] || 0) + 1;
    }
  }

  const items = (data || []).map(r => ({
    ...r,
    node_count: nodeCounts[r.id as string] || 0,
  }));

  return NextResponse.json({ items, total: count ?? 0, limit, offset });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const topicId: string | undefined = body?.topicId;
  const chapterId: string | undefined = body?.chapterId;
  if (!topicId) return NextResponse.json({ error: 'topicId required' }, { status: 400 });

  const admin = getAdminClient();
  const { data: topic } = await admin.from('topics').select('id').eq('id', topicId).maybeSingle();
  if (!topic) return NextResponse.json({ error: 'topic not found' }, { status: 404 });

  if (chapterId) {
    const { data: ch } = await admin.from('chapters').select('id').eq('id', chapterId).maybeSingle();
    if (!ch) return NextResponse.json({ error: 'chapter not found' }, { status: 404 });
  }

  const result = await spawnAgent(admin, {
    agentType: 'mindmap',
    payload: {
      source: 'admin-mindmaps',
      topicId,
      chapterId: chapterId || undefined,
      reason: 'admin_generate',
    },
    priority: 4,
  });

  return NextResponse.json({
    ok: true,
    taskId: result.taskId,
    queueName: result.queueName,
    jobId: result.jobId,
  });
}
