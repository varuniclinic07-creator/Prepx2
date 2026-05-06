// Sprint 9-D Phase A — query engine.
//
// Pure deterministic retrieval over a ConceptIndex. Returns structured
// educational data only — replay_segments + matched concept + notes +
// formulas + quiz ids + objectives + intent.
//
// LLM phrasing is opt-in (phrase=true) and goes through phraseAnswer() in
// a separate exported function. The engine itself is LLM-free so:
//   - smokes are deterministic (no token variance)
//   - cache keys are stable
//   - the engine works offline / without API keys
//   - hallucination surface is zero in the retrieval layer
//
// Retrieval policy (deterministic, ranked):
//   1. exact name match (case-insensitive) → confidence 0.99
//   2. token-overlap score = (concept.search_tokens ∩ query.tokens) / len(concept)
//      pick the highest scorer; confidence = score, clamped 0..0.95
//   3. nothing matched → return matchedConcept: null, low-confidence
//      'general-recap' fallback that points at the whole-lecture timeline.

import type { ConceptIndex, IndexedConcept } from './concept-index';
import { classify, normalize, tokens, type QueryIntent } from './intent';

export interface QueryResult {
  // Echo of the user-facing question + the engine's classification.
  query: string;
  intent: QueryIntent;
  // The concept the engine matched, or null when no concept hit (in which
  // case the result is the lecture-level recap fallback).
  matchedConcept: { id: string; name: string; definition: string } | null;
  confidence: number;                                    // 0..1
  // Time ranges to surface (player jump targets / chapter highlights).
  timestamps: Array<{ start: number; end: number }>;
  replaySegments: Array<{ start: number; end: number }>;
  // Scene indices into timeline.scenes.
  scenePositions: number[];
  // Formulas the matched concept owns (or the lecture-level formula on
  // fallback).
  formulas: string[];
  // Notes excerpted from LectureNotes.key_points the concept appears in.
  relatedNotes: Array<{ idx: number; text: string }>;
  relatedQuizMcqIds: number[];
  learningObjectives: string[];
  // Optional natural-language answer. Present iff phrase=true. Engine
  // never invents this — it's null when the LLM call wasn't made.
  answer: string | null;
}

export interface AnswerQueryOpts {
  index: ConceptIndex;
  q: string;
  // When true, runs ONE aiChat call to wrap the deterministic retrieval
  // in a teacher-style natural-language sentence. Defaults to false to
  // keep tests deterministic.
  phrase?: boolean;
  // Optional caller-supplied chat function for unit tests / DI. Production
  // callers leave this undefined and the engine uses the project router.
  chat?: (args: { system: string; user: string }) => Promise<string>;
}

const FALLBACK_DEF = 'Concept not directly indexed — showing the lecture as a whole.';

function rankConcepts(qTokens: string[], concepts: IndexedConcept[]): { c: IndexedConcept; score: number } | null {
  if (qTokens.length === 0 || concepts.length === 0) return null;

  let best: { c: IndexedConcept; score: number } | null = null;
  const qSet = new Set(qTokens);

  for (const c of concepts) {
    if (c.search_tokens.length === 0) continue;
    let hits = 0;
    for (const t of c.search_tokens) if (qSet.has(t)) hits++;
    // Score = harmonic-ish blend that rewards covering the concept name
    // (recall on concept tokens) more than spurious extra query tokens.
    const score = hits / c.search_tokens.length;
    if (!best || score > best.score) best = { c, score };
  }

  if (!best || best.score === 0) return null;
  return best;
}

function pickConcept(index: ConceptIndex, subject: string, normalizedQuery: string): { c: IndexedConcept; confidence: number } | null {
  // 1. exact (case-insensitive) name match against either the subject
  //    extracted from the intent OR the full normalized query — covers
  //    "What is voltage?" → subject "voltage" AND "voltage" alone.
  for (const c of index.concepts) {
    if (c.name.toLowerCase() === subject.toLowerCase() || c.name.toLowerCase() === normalizedQuery) {
      return { c, confidence: 0.99 };
    }
  }
  // 2. ranked token overlap on subject first, then full query as fallback.
  const subjectTokens = tokens(subject || '');
  const ranked = rankConcepts(subjectTokens, index.concepts) ?? rankConcepts(tokens(normalizedQuery), index.concepts);
  if (ranked) {
    // Clamp to (0, 0.95] — exact match owns 0.99.
    return { c: ranked.c, confidence: Math.min(0.95, Math.max(0.01, ranked.score)) };
  }
  return null;
}

function buildRecapResult(query: string, intent: QueryIntent, index: ConceptIndex): QueryResult {
  // Cover the whole composition. Useful for 'give-recap' and for the
  // no-match fallback.
  return {
    query,
    intent,
    matchedConcept: null,
    confidence: intent === 'give-recap' ? 0.85 : 0.1,
    timestamps: [{ start: 0, end: index.duration }],
    replaySegments: [{ start: 0, end: index.duration }],
    scenePositions: [],
    formulas: index.concepts.flatMap((c) => c.formulas).filter((v, i, a) => a.indexOf(v) === i),
    relatedNotes: [],
    relatedQuizMcqIds: [],
    learningObjectives: [],
    answer: null,
  };
}

// ─── Main entry ────────────────────────────────────────────────────────

export async function answerQuery(opts: AnswerQueryOpts): Promise<QueryResult> {
  const { index, q } = opts;
  const cls = classify(q);

  // ── give-recap → lecture-level summary, no concept lookup ──────────
  if (cls.intent === 'give-recap') {
    const r = buildRecapResult(q, 'give-recap', index);
    if (opts.phrase) r.answer = await phraseAnswer({ result: r, index, q, intent: 'give-recap', chat: opts.chat });
    return r;
  }

  // ── concept lookup for the other 4 intents ─────────────────────────
  const picked = pickConcept(index, cls.subject, cls.normalized);
  if (!picked) {
    // No concept hit — fall back to whole-lecture recap with the
    // user-supplied intent preserved.
    const r = buildRecapResult(q, cls.intent, index);
    if (opts.phrase) r.answer = await phraseAnswer({ result: r, index, q, intent: cls.intent, chat: opts.chat });
    return r;
  }

  const c = picked.c;

  // intent-specific timeranges:
  //   - jump-to-topic and explain-again → first segment is enough
  //   - what-is and show-formula → all segments (helpful for chapter chips)
  const ts =
    cls.intent === 'jump-to-topic' || cls.intent === 'explain-again'
      ? c.timestamps.slice(0, 1)
      : c.timestamps;
  const rs =
    cls.intent === 'jump-to-topic' || cls.intent === 'explain-again'
      ? c.replay_segments.slice(0, 1)
      : c.replay_segments;

  // intent-specific formulas:
  //   - show-formula always returns formulas; if none exist on the matched
  //     concept, fall back to the lecture-level formula list.
  let formulas = c.formulas;
  if (cls.intent === 'show-formula' && formulas.length === 0) {
    formulas = index.concepts.flatMap((x) => x.formulas).filter((v, i, a) => a.indexOf(v) === i);
  }

  const result: QueryResult = {
    query: q,
    intent: cls.intent,
    matchedConcept: { id: c.id, name: c.name, definition: c.definition },
    confidence: picked.confidence,
    timestamps: ts,
    replaySegments: rs,
    scenePositions: c.scene_positions,
    formulas,
    relatedNotes: c.related_notes,
    relatedQuizMcqIds: c.related_quiz_mcq_ids,
    learningObjectives: c.learning_objectives,
    answer: null,
  };

  if (opts.phrase) {
    result.answer = await phraseAnswer({ result, index, q, intent: cls.intent, chat: opts.chat });
  }

  return result;
}

// ─── Optional LLM phrasing layer ───────────────────────────────────────
// Single aiChat call. Only sees STRUCTURED retrieval — never raw timeline
// or transcript. Per user directive: the LLM may not invent timestamps,
// formulas, or concepts. It may only summarise / rephrase.

interface PhraseArgs {
  result: QueryResult;
  index: ConceptIndex;
  q: string;
  intent: QueryIntent;
  chat?: AnswerQueryOpts['chat'];
}

const PHRASE_SYSTEM = `You are a friendly UPSC exam tutor. You write ONE concise paragraph (≤80 words) explaining the concept to a student.

ABSOLUTE RULES:
- You are given STRUCTURED retrieval results below. NEVER invent facts.
- Use ONLY the provided definition, formulas, and notes.
- If the definition fallback says "Concept not directly indexed", offer a brief lecture-level recap instead.
- Do NOT mention timestamps, scene numbers, or quiz IDs in your answer — those are rendered separately by the UI.
- Do NOT use markdown, headers, or bullet lists. One short paragraph only.`;

function buildPhrasePrompt(args: PhraseArgs): { system: string; user: string } {
  const { result, index, q, intent } = args;
  const lines: string[] = [];
  lines.push(`Topic: ${index.topic.title}`);
  lines.push(`Student question: "${q}"`);
  lines.push(`Detected intent: ${intent}`);
  if (result.matchedConcept) {
    lines.push(`Matched concept: ${result.matchedConcept.name}`);
    lines.push(`Definition: ${result.matchedConcept.definition}`);
  } else {
    lines.push(`No concept matched — answer with a lecture-level recap.`);
  }
  if (result.formulas.length > 0) {
    lines.push(`Formulas (use verbatim): ${result.formulas.join('; ')}`);
  }
  if (result.relatedNotes.length > 0) {
    lines.push(`Related notes:`);
    result.relatedNotes.slice(0, 3).forEach((n) => lines.push(`  - ${n.text}`));
  }
  if (result.learningObjectives.length > 0) {
    lines.push(`Learning objectives covered:`);
    result.learningObjectives.slice(0, 2).forEach((o) => lines.push(`  - ${o}`));
  }
  return {
    system: PHRASE_SYSTEM,
    user: lines.join('\n'),
  };
}

export async function phraseAnswer(args: PhraseArgs): Promise<string> {
  const { system, user } = buildPhrasePrompt(args);
  // DI for tests; production import goes through the AI router.
  if (args.chat) {
    return (await args.chat({ system, user })).trim();
  }
  const { aiChat } = await import('../ai-router');
  const raw = await aiChat({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.3,
    maxTokens: 220,
  });
  return raw.trim();
}

// Re-export normalize for callers (smokes use this to canonicalize fixtures).
export { normalize };
