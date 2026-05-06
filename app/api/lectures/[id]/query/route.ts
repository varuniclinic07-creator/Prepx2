// Sprint 9-D Phase C — POST /api/lectures/[id]/query
//
// Deterministic semantic-retrieval first; opt-in LLM phrasing layer when
// `phrase=true` (default false). Architecture per user directive:
//
//   - The semantic engine answers the question (timestamps, formulas,
//     replay segments, related notes, related quiz, learning objectives,
//     scene positions). It is LLM-free, cacheable, replayable.
//   - The LLM only changes HOW the answer sounds. It receives ONLY the
//     structured retrieval — never the raw timeline / transcript — and
//     may not invent timestamps, formulas, or concepts.
//   - Cache deterministic responses keyed on (lectureId, normalize(q)).
//     Phrased answers are NOT cached in this slice.

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { answerQuery, normalize, type QueryResult } from '@/lib/learning/query-engine';
import type { ConceptIndex } from '@/lib/learning/concept-index';
import { recordLearningEvent } from '@/lib/learning/memory';

// ─── In-memory deterministic cache ─────────────────────────────────────
// Key: `${lectureId}::${normalize(q)}`. Stores the structured retrieval
// only (answer field is always null in cache). Phrasing happens AFTER
// cache lookup so callers can flip phrase=true without re-running
// retrieval. Bounded LRU (256 entries) — restart-safe (in-memory only).

const CACHE_MAX = 256;
const cache = new Map<string, QueryResult>();

function cacheGet(key: string): QueryResult | undefined {
  const v = cache.get(key);
  if (!v) return undefined;
  // LRU touch
  cache.delete(key);
  cache.set(key, v);
  return v;
}

function cacheSet(key: string, value: QueryResult): void {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  if (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

// ─── Response shaping ──────────────────────────────────────────────────
// Add directive-aliased fields (`relatedQuiz`, `sourceScenes`) without
// breaking the engine's existing shape — old callers keep working.

function shape(result: QueryResult, lectureId: string, cached: boolean) {
  return {
    lectureId,
    query: result.query,
    intent: result.intent,
    matchedConcept: result.matchedConcept,
    confidence: result.confidence,
    timestamps: result.timestamps,
    replaySegments: result.replaySegments,
    formulas: result.formulas,
    relatedNotes: result.relatedNotes,
    learningObjectives: result.learningObjectives,
    // Directive aliases (richer surface for clients):
    relatedQuiz: result.relatedQuizMcqIds,
    sourceScenes: result.scenePositions,
    // Engine-native fields kept for back-compat:
    relatedQuizMcqIds: result.relatedQuizMcqIds,
    scenePositions: result.scenePositions,
    // Optional natural-language wrapper (null when phrase=false).
    answer: result.answer,
    cached,
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: lectureJobId } = await ctx.params;
  if (!UUID_RE.test(lectureJobId)) {
    return NextResponse.json({ error: 'Invalid lectureId' }, { status: 400 });
  }

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const q: string = String(body?.q ?? body?.query ?? '').trim();
  const phrase: boolean = body?.phrase === true;
  if (!q) return NextResponse.json({ error: 'q (query) required' }, { status: 400 });
  if (q.length > 500) return NextResponse.json({ error: 'q too long (max 500)' }, { status: 400 });

  // Load lecture job + its embedded concept_index. RLS already restricts to
  // owner; no admin client needed for the metadata column.
  const { data: job, error } = await sb
    .from('lecture_jobs')
    .select('id, status, metadata')
    .eq('id', lectureJobId)
    .maybeSingle();

  if (error || !job) {
    return NextResponse.json({ error: 'lecture not found' }, { status: 404 });
  }
  if (job.status !== 'completed') {
    return NextResponse.json({ error: `lecture not ready (status: ${job.status})` }, { status: 409 });
  }

  const index: ConceptIndex | undefined = (job.metadata as any)?.concept_index;
  if (!index || !Array.isArray(index.concepts)) {
    return NextResponse.json({ error: 'concept_index missing on this lecture' }, { status: 422 });
  }

  // Deterministic retrieval (cached).
  const cacheKey = `${lectureJobId}::${normalize(q)}`;
  let result = cacheGet(cacheKey);
  let cached = !!result;
  if (!result) {
    result = await answerQuery({ index, q, phrase: false });
    cacheSet(cacheKey, result);
  }

  // Optional phrasing — runs OUTSIDE the cache so it doesn't pollute the
  // deterministic store. Always a fresh aiChat call when requested.
  if (phrase) {
    try {
      const phrased = await answerQuery({ index, q, phrase: true });
      // Reuse cached deterministic fields, only borrow the natural-language wrapper.
      result = { ...result, answer: phrased.answer };
    } catch (e: any) {
      // Phrasing failure must NOT break the deterministic answer.
      return NextResponse.json({
        ...shape(result, lectureJobId, cached),
        phraseError: e?.message || 'phrasing unavailable',
      });
    }
  }

  // Sprint 9-E: fire-and-forget event recording. Only record when a real
  // concept matched — lecture-level recap fallbacks are tracked separately
  // via the recap_requested event (POSTed by the UI's recap action).
  if (result.matchedConcept) {
    void recordLearningEvent({
      userId: user.id,
      lectureJobId,
      conceptId: result.matchedConcept.id,
      conceptName: result.matchedConcept.name,
      eventType: 'concept_queried',
      metadata: { intent: result.intent, confidence: result.confidence },
    });
  }

  return NextResponse.json(shape(result, lectureJobId, cached));
}
