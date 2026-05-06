// Sprint 9-E Phase A — POST /api/learning/events
//
// Authenticated user records ONE learning event. Server validates:
//   - lecture_job_id exists and is owned by caller (RLS enforces this on
//     the events INSERT — but we also validate the concept_id is in the
//     lecture's concept_index so callers cannot fabricate concept ids).
// On success, fires refreshConceptMemory() so the snapshot is up-to-date
// before the response returns.

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';
import { recordLearningEvent } from '@/lib/learning/memory';

const BodySchema = z.object({
  lectureJobId: z.string().uuid(),
  conceptId: z.string().min(1).max(64).optional().nullable(),
  conceptName: z.string().min(1).max(120).optional().nullable(),
  eventType: z.enum([
    'replay_clicked',
    'concept_queried',
    'quiz_failed',
    'quiz_passed',
    'note_opened',
    'recap_requested',
  ]),
  metadata: z.record(z.string(), z.any()).optional(),
});

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(', ') },
      { status: 400 },
    );
  }

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { lectureJobId, conceptId, conceptName, eventType, metadata } = parsed.data;

  // Validate the lecture exists + belongs to caller, and that the concept
  // (if any) is one the lecture actually indexed. This is the trust
  // boundary — past this point the heuristic can run unverified.
  const { data: job } = await sb
    .from('lecture_jobs')
    .select('id, status, metadata')
    .eq('id', lectureJobId)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: 'lecture not found' }, { status: 404 });
  if (job.status !== 'completed') {
    return NextResponse.json({ error: 'lecture not ready' }, { status: 409 });
  }

  let resolvedConceptName: string | null = conceptName ?? null;
  if (conceptId) {
    const idx = (job.metadata as any)?.concept_index;
    const concept = idx?.concepts?.find((c: any) => c.id === conceptId);
    if (!concept) {
      return NextResponse.json({ error: 'unknown conceptId for this lecture' }, { status: 422 });
    }
    resolvedConceptName = resolvedConceptName || concept.name;
  }

  await recordLearningEvent({
    userId: user.id,
    lectureJobId,
    conceptId: conceptId ?? null,
    conceptName: resolvedConceptName,
    eventType,
    metadata: metadata ?? {},
  });

  return NextResponse.json({ ok: true });
}
