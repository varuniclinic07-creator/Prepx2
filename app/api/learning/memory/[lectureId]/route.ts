// Sprint 9-E Phase C — GET /api/learning/memory/[lectureId]
//
// Returns the per-concept memory snapshot for the calling user against a
// given lecture: counters + mastery_score + status, ordered by lowest
// mastery first. Phase D's recap UI consumes this.

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { listConceptMemory } from '@/lib/learning/memory';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: NextRequest, ctx: { params: Promise<{ lectureId: string }> }) {
  const { lectureId } = await ctx.params;
  if (!UUID_RE.test(lectureId)) {
    return NextResponse.json({ error: 'Invalid lectureId' }, { status: 400 });
  }

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Confirm ownership via RLS-scoped read of lecture_jobs.
  const { data: job } = await sb
    .from('lecture_jobs')
    .select('id, status')
    .eq('id', lectureId)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: 'lecture not found' }, { status: 404 });

  const memory = await listConceptMemory({ userId: user.id, lectureJobId: lectureId });

  return NextResponse.json({
    lectureId,
    concepts: memory,
    summary: {
      total: memory.length,
      struggling: memory.filter((m) => m.status === 'struggling').length,
      mastered:   memory.filter((m) => m.status === 'mastered').length,
      engaged:    memory.filter((m) => m.status === 'engaged').length,
      fresh:      memory.filter((m) => m.status === 'fresh').length,
    },
  });
}
