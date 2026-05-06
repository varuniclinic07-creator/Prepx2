// Sprint 9-D Phase C — POST /api/concepts/[id]/query
//
// Mirror of /api/lectures/[id]/query, scoped to concept_jobs.metadata.concept_index.
// See lectures/[id]/query/route.ts for the architecture write-up — every
// principle is identical (deterministic retrieval first, opt-in LLM phrasing,
// cache deterministic only).

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { answerQuery, normalize, type QueryResult } from '@/lib/learning/query-engine';
import type { ConceptIndex } from '@/lib/learning/concept-index';

const CACHE_MAX = 256;
const cache = new Map<string, QueryResult>();

function cacheGet(key: string): QueryResult | undefined {
  const v = cache.get(key);
  if (!v) return undefined;
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

function shape(result: QueryResult, conceptJobId: string, cached: boolean) {
  return {
    conceptId: conceptJobId,
    query: result.query,
    intent: result.intent,
    matchedConcept: result.matchedConcept,
    confidence: result.confidence,
    timestamps: result.timestamps,
    replaySegments: result.replaySegments,
    formulas: result.formulas,
    relatedNotes: result.relatedNotes,
    learningObjectives: result.learningObjectives,
    relatedQuiz: result.relatedQuizMcqIds,
    sourceScenes: result.scenePositions,
    relatedQuizMcqIds: result.relatedQuizMcqIds,
    scenePositions: result.scenePositions,
    answer: result.answer,
    cached,
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: conceptJobId } = await ctx.params;
  if (!UUID_RE.test(conceptJobId)) {
    return NextResponse.json({ error: 'Invalid conceptId' }, { status: 400 });
  }

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const q: string = String(body?.q ?? body?.query ?? '').trim();
  const phrase: boolean = body?.phrase === true;
  if (!q) return NextResponse.json({ error: 'q (query) required' }, { status: 400 });
  if (q.length > 500) return NextResponse.json({ error: 'q too long (max 500)' }, { status: 400 });

  const { data: job, error } = await sb
    .from('concept_jobs')
    .select('id, status, metadata')
    .eq('id', conceptJobId)
    .maybeSingle();

  if (error || !job) {
    return NextResponse.json({ error: 'concept not found' }, { status: 404 });
  }
  if (job.status !== 'completed') {
    return NextResponse.json({ error: `concept not ready (status: ${job.status})` }, { status: 409 });
  }

  const index: ConceptIndex | undefined = (job.metadata as any)?.concept_index;
  if (!index || !Array.isArray(index.concepts)) {
    return NextResponse.json({ error: 'concept_index missing on this concept' }, { status: 422 });
  }

  const cacheKey = `${conceptJobId}::${normalize(q)}`;
  let result = cacheGet(cacheKey);
  let cached = !!result;
  if (!result) {
    result = await answerQuery({ index, q, phrase: false });
    cacheSet(cacheKey, result);
  }

  if (phrase) {
    try {
      const phrased = await answerQuery({ index, q, phrase: true });
      result = { ...result, answer: phrased.answer };
    } catch (e: any) {
      return NextResponse.json({
        ...shape(result, conceptJobId, cached),
        phraseError: e?.message || 'phrasing unavailable',
      });
    }
  }

  return NextResponse.json(shape(result, conceptJobId, cached));
}
