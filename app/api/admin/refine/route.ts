// /api/admin/refine
//   GET  ?status=&artifactType=&limit=50&offset=0
//        Paginated audit listing for the admin refine queue.
//   POST { artifactType, artifactId }
//        Enqueue a fresh refine-job for an existing artifact.

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';
import { spawnAgent } from '@/lib/agents/hermes-dispatch';
import type { RefineArtifactType } from '@/lib/queue/types';

const ALLOWED_STATUSES = new Set(['queued', 'running', 'passed', 'flagged', 'rejected', 'approved']);
const ALLOWED_ARTIFACT_TYPES: Set<RefineArtifactType> = new Set([
  'lecture_script',
  'smart_book_chapter',
  'research_article',
  'quiz_question',
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
  const artifactType = url.searchParams.get('artifactType');
  const limit = Math.min(Number(url.searchParams.get('limit') || '50'), 200);
  const offset = Math.max(Number(url.searchParams.get('offset') || '0'), 0);

  const admin = getAdminClient();
  let query = admin.from('artifact_quality_audits')
    .select(
      'id, artifact_type, artifact_id, status, quality_score, readability_grade, citation_count, syllabus_alignment_score, flags, remediations, admin_decision, admin_notes, decided_at, retrigger_count, created_at, updated_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && ALLOWED_STATUSES.has(status)) {
    query = query.eq('status', status);
  }
  if (artifactType && ALLOWED_ARTIFACT_TYPES.has(artifactType as RefineArtifactType)) {
    query = query.eq('artifact_type', artifactType);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data || [], total: count ?? 0, limit, offset });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const artifactType = body?.artifactType as RefineArtifactType | undefined;
  const artifactId = body?.artifactId as string | undefined;

  if (!artifactType || !ALLOWED_ARTIFACT_TYPES.has(artifactType)) {
    return NextResponse.json({ error: 'artifactType must be one of: lecture_script, smart_book_chapter, research_article, quiz_question' }, { status: 400 });
  }
  if (!artifactId) {
    return NextResponse.json({ error: 'artifactId required' }, { status: 400 });
  }

  const admin = getAdminClient();

  // Determine retriggerCount = 1 + max(retrigger_count) for this artifact, so
  // we don't violate the unique (artifact_type, artifact_id, retrigger_count).
  const { data: prior } = await admin.from('artifact_quality_audits')
    .select('retrigger_count')
    .eq('artifact_type', artifactType)
    .eq('artifact_id', artifactId)
    .order('retrigger_count', { ascending: false })
    .limit(1)
    .maybeSingle();
  const retriggerCount = prior ? Number(prior.retrigger_count) + 1 : 0;

  const result = await spawnAgent(admin, {
    agentType: 'refine',
    payload: {
      source: 'admin-refine-trigger',
      artifactType,
      artifactId,
      retriggerCount,
    },
    priority: 4,
  });

  return NextResponse.json({
    ok: true,
    taskId: result.taskId,
    queueName: result.queueName,
    jobId: result.jobId,
    retriggerCount,
  });
}
