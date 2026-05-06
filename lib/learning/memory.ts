// Sprint 9-E Phase A+B+C — Adaptive Learning Memory engine.
//
// Pure deterministic. No LLM calls, no embeddings — counters + heuristics.
// Per user directive: "Keep adaptation deterministic initially. DO NOT jump
// into embeddings/vector-memory immediately. Start with counters, heuristics,
// semantic mappings, timeline interactions."
//
// Public surface:
//   recordLearningEvent({ userId, lectureJobId, conceptId?, eventType, metadata? })
//     → INSERTs one user_learning_events row + refreshes user_concept_memory.
//   classifyStruggle(counters) → { mastery_score, status }
//   refreshConceptMemory({ userId, lectureJobId, conceptId, conceptName })
//     → recomputes counters + status for one concept; UPSERTs.
//   listConceptMemory({ userId, lectureJobId })
//     → returns the per-concept snapshot for the lecture (used by Phase D recap).
//
// All writes go through the service-role admin client. Authenticated
// clients write events through the API route (RLS lets them INSERT
// own rows); the memory snapshot is recomputed server-side so the
// heuristic stays the single source of truth.

import { getAdminClient } from '../supabase-admin';

export type LearningEventType =
  | 'replay_clicked'
  | 'concept_queried'
  | 'quiz_failed'
  | 'quiz_passed'
  | 'note_opened'
  | 'recap_requested';

export interface ConceptCounters {
  replay_count: number;
  query_count: number;
  quiz_fail_count: number;
  quiz_pass_count: number;
}

export interface StruggleClassification {
  mastery_score: number;
  status: 'fresh' | 'engaged' | 'struggling' | 'mastered';
}

// ─── Phase B — deterministic struggle classifier ───────────────────────
//
// Heuristic rules (in priority order):
//   1. zero events                                          → fresh
//   2. quiz_pass >= 1 && quiz_fail == 0 && replay <= 1      → mastered
//   3. replay > 2  || query > 2 || quiz_fail >= 1           → struggling
//   4. otherwise                                            → engaged
//
// Mastery score:
//   start at 0.50
//   + 0.25 if quiz_pass > quiz_fail
//   - 0.25 if quiz_fail > quiz_pass
//   - 0.10 if replay_count > 2
//   - 0.10 if query_count  > 2
//   clamped to [0, 1], rounded to 2dp.

export function classifyStruggle(c: ConceptCounters): StruggleClassification {
  const total =
    c.replay_count + c.query_count + c.quiz_fail_count + c.quiz_pass_count;
  if (total === 0) {
    return { mastery_score: 0.5, status: 'fresh' };
  }

  let score = 0.5;
  if (c.quiz_pass_count > c.quiz_fail_count) score += 0.25;
  else if (c.quiz_fail_count > c.quiz_pass_count) score -= 0.25;
  if (c.replay_count > 2) score -= 0.1;
  if (c.query_count > 2) score -= 0.1;
  score = Math.max(0, Math.min(1, score));
  // 2dp rounding to align with NUMERIC(3,2).
  score = Math.round(score * 100) / 100;

  let status: StruggleClassification['status'];
  if (
    c.quiz_pass_count >= 1 &&
    c.quiz_fail_count === 0 &&
    c.replay_count <= 1
  ) {
    status = 'mastered';
  } else if (
    c.replay_count > 2 ||
    c.query_count > 2 ||
    c.quiz_fail_count >= 1
  ) {
    status = 'struggling';
  } else {
    status = 'engaged';
  }

  return { mastery_score: score, status };
}

// ─── Phase A — record one event ────────────────────────────────────────

export interface RecordEventInput {
  userId: string;
  lectureJobId: string;
  conceptId?: string | null;
  conceptName?: string | null;
  eventType: LearningEventType;
  metadata?: Record<string, unknown>;
}

export async function recordLearningEvent(input: RecordEventInput): Promise<void> {
  const admin = getAdminClient();
  const { error: insErr } = await admin.from('user_learning_events').insert({
    user_id: input.userId,
    lecture_job_id: input.lectureJobId,
    concept_id: input.conceptId ?? null,
    event_type: input.eventType,
    metadata: input.metadata ?? {},
  });
  if (insErr) {
    // Never throw into the caller's hot path — events are fire-and-forget.
    // Log and continue; the memory snapshot will simply lag this event.
    // eslint-disable-next-line no-console
    console.warn('[memory] event insert failed:', insErr.message);
    return;
  }

  // Concept-scoped events drive memory refresh. Lecture-level events
  // (recap_requested) don't touch concept memory.
  if (input.conceptId && input.conceptName) {
    await refreshConceptMemory({
      userId: input.userId,
      lectureJobId: input.lectureJobId,
      conceptId: input.conceptId,
      conceptName: input.conceptName,
    });
  }
}

// ─── Phase C — refresh derived memory snapshot ─────────────────────────

export interface RefreshConceptMemoryInput {
  userId: string;
  lectureJobId: string;
  conceptId: string;
  conceptName: string;
}

export async function refreshConceptMemory(input: RefreshConceptMemoryInput): Promise<void> {
  const admin = getAdminClient();

  // Aggregate counters from the events table (single round-trip via group-by
  // on event_type). Using a raw SELECT avoids the need for an RPC.
  const { data: rows, error } = await admin
    .from('user_learning_events')
    .select('event_type, created_at')
    .eq('user_id', input.userId)
    .eq('lecture_job_id', input.lectureJobId)
    .eq('concept_id', input.conceptId);
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[memory] event aggregate failed:', error.message);
    return;
  }

  const counters: ConceptCounters = {
    replay_count: 0,
    query_count: 0,
    quiz_fail_count: 0,
    quiz_pass_count: 0,
  };
  let lastTs: string | null = null;
  for (const r of rows ?? []) {
    if (r.event_type === 'replay_clicked')  counters.replay_count++;
    if (r.event_type === 'concept_queried') counters.query_count++;
    if (r.event_type === 'quiz_failed')     counters.quiz_fail_count++;
    if (r.event_type === 'quiz_passed')     counters.quiz_pass_count++;
    if (!lastTs || (r.created_at && r.created_at > lastTs)) lastTs = r.created_at;
  }

  const cls = classifyStruggle(counters);

  const { error: upsertErr } = await admin
    .from('user_concept_memory')
    .upsert(
      {
        user_id:        input.userId,
        lecture_job_id: input.lectureJobId,
        concept_id:     input.conceptId,
        concept_name:   input.conceptName,
        replay_count:    counters.replay_count,
        query_count:     counters.query_count,
        quiz_fail_count: counters.quiz_fail_count,
        quiz_pass_count: counters.quiz_pass_count,
        mastery_score:   cls.mastery_score,
        status:          cls.status,
        last_event_at:   lastTs,
      },
      { onConflict: 'user_id,lecture_job_id,concept_id' },
    );
  if (upsertErr) {
    // eslint-disable-next-line no-console
    console.warn('[memory] memory upsert failed:', upsertErr.message);
  }
}

// ─── Read API — list per-concept memory for a lecture ──────────────────

export interface ConceptMemoryRow {
  concept_id: string;
  concept_name: string;
  replay_count: number;
  query_count: number;
  quiz_fail_count: number;
  quiz_pass_count: number;
  mastery_score: number;
  status: StruggleClassification['status'];
  last_event_at: string | null;
}

export async function listConceptMemory(args: {
  userId: string;
  lectureJobId: string;
}): Promise<ConceptMemoryRow[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('user_concept_memory')
    .select('concept_id, concept_name, replay_count, query_count, quiz_fail_count, quiz_pass_count, mastery_score, status, last_event_at')
    .eq('user_id', args.userId)
    .eq('lecture_job_id', args.lectureJobId)
    .order('mastery_score', { ascending: true });
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[memory] list failed:', error.message);
    return [];
  }
  return (data ?? []) as ConceptMemoryRow[];
}
