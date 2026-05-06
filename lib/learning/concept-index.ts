// Sprint 9-D Phase B — concept index builder.
//
// Walks the educational artifacts produced by 9-A/9-B/9-C and folds them
// into ONE deterministic structure: every concept maps to its scenes,
// timestamps, formulas, notes, quiz items, and learning objectives.
// This is the canonical retrieval surface the query engine searches.
//
// Inputs (all already on disk in outputs/<bundle>/):
//   - timeline.json   (scenes + noteMarkers + quizMarkers)
//   - mvp-notes.json  (LectureNotes — key_points + formula_sheet + analogies)
//   - mvp-quiz.json   (LectureQuiz — 5 mcq + 5 conceptual)
//   - metadata.json   (topic + narration + concept block from 9-B)
//
// Output: ConceptIndex — embedded into metadata.concept_index by the
// processors. The query engine never re-parses the source files at
// query-time; it reads the embedded index.

import { tokens } from './intent';

export interface IndexedConcept {
  // Stable ID derived from the concept name. Stays valid across regenerations
  // as long as the name is stable.
  id: string;
  name: string;
  // First-class definition. For Sprint 9-B concept jobs this comes from the
  // extractor; for 9-A lecture jobs we synthesize it from the matched
  // noteMarker text or the simplifier summary.
  definition: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  // Tokenized name + aliases for keyword overlap. All lowercase, stopwords
  // removed. Pre-computed at build-time so the engine is O(concepts) not
  // O(concepts × tokens) per query.
  search_tokens: string[];
  // Scene positions (timeline.scenes[].position) where this concept is
  // taught. Lets Remotion / a future player highlight chapter chips.
  scene_positions: number[];
  // Inclusive [start, end] second ranges. For the typical 9-A lecture this
  // collapses to one range covering the whole board scene; for richer
  // multi-concept lectures we'll get one range per noteMarker the concept
  // appears in.
  timestamps: Array<{ start: number; end: number }>;
  // Replay segments. Same shape as `timestamps`. Kept distinct so future
  // logic (e.g. extend intro/outro padding) can diverge without breaking
  // analytics on raw timestamps.
  replay_segments: Array<{ start: number; end: number }>;
  // Formula expressions associated with this concept. Pulled from
  // metadata.topic.formula + notes.formula_sheet[*] when their tokens
  // overlap with the concept name.
  formulas: string[];
  // ids into LectureNotes.key_points (1-indexed, line-equivalent) AND the
  // raw note text. Frontend can render these directly without hitting
  // notes.json.
  related_notes: Array<{ idx: number; text: string }>;
  // ids into LectureQuiz.mcq[].id where the question.concept matches this
  // concept's name.
  related_quiz_mcq_ids: number[];
  // Learning objective texts (from 9-B concept block) that mention this
  // concept by token overlap.
  learning_objectives: string[];
}

export interface ConceptIndex {
  // Provenance — bumped when the index format changes.
  version: '9d-1';
  // bundle slug + title for cheap rendering of the parent context.
  topic: { slug: string; title: string };
  // Total composition duration in seconds (mirrors timeline.duration).
  duration: number;
  concepts: IndexedConcept[];
}

// ─── Inputs (loose shapes — we tolerate missing fields) ────────────────

interface TimelineLite {
  topic: string;
  title: string;
  duration: number;
  scenes: Array<{ position: number; start: number; end: number; type: string; description: string }>;
  noteMarkers: Array<{ id: number | string; timestamp: number; text: string }>;
  quizMarkers?: Array<{ id: number | string; timestamp: number; concept: string; question: string }>;
}

interface NotesLite {
  title: string;
  summary: string;
  key_points: string[];
  formula_sheet: Array<{ name: string; expression: string; where: Record<string, string> }>;
  real_world_analogies?: string[];
  common_mistakes?: string[];
}

interface QuizLite {
  topic: string;
  mcq: Array<{ id: number; question: string; concept: string }>;
  conceptual?: Array<{ id: number; concept: string }>;
}

interface MetadataConceptBlock {
  detected_topic?: string;
  detected_concepts?: Array<{ name: string; definition?: string; formula?: string; difficulty?: 'beginner'|'intermediate'|'advanced' }>;
  formulas?: string[];
  learning_objectives?: string[];
}

interface MetadataLite {
  topic: { slug: string; title: string; formula?: string };
  concept?: MetadataConceptBlock;
}

// ─── Helpers ───────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'concept';
}

// Tighter overlap: how many of `needle`'s tokens appear in `haystack`.
function tokenHits(needle: string[], haystack: Set<string>): number {
  let n = 0;
  for (const t of needle) if (haystack.has(t)) n++;
  return n;
}

// ─── Builder ───────────────────────────────────────────────────────────

export interface BuildConceptIndexInput {
  timeline: TimelineLite;
  notes: NotesLite;
  quiz: QuizLite;
  metadata: MetadataLite;
}

export function buildConceptIndex(input: BuildConceptIndexInput): ConceptIndex {
  const { timeline, notes, quiz, metadata } = input;

  // ── Concept seed list ────────────────────────────────────────────────
  // Source of truth, in priority order:
  //   1. metadata.concept.detected_concepts (9-B extractor — best)
  //   2. quiz.mcq[].concept distinct values (9-A — concrete student-facing)
  //   3. fall back to the topic title itself as a single concept
  type Seed = { name: string; definition?: string; formula?: string; difficulty?: 'beginner'|'intermediate'|'advanced' };
  const seeds: Seed[] = [];
  const seenNames = new Set<string>();

  if (metadata.concept?.detected_concepts?.length) {
    for (const c of metadata.concept.detected_concepts) {
      const k = c.name?.trim();
      if (!k || seenNames.has(k.toLowerCase())) continue;
      seenNames.add(k.toLowerCase());
      seeds.push({ name: k, definition: c.definition, formula: c.formula, difficulty: c.difficulty });
    }
  }
  for (const q of quiz.mcq || []) {
    const k = q.concept?.trim();
    if (!k || seenNames.has(k.toLowerCase())) continue;
    seenNames.add(k.toLowerCase());
    seeds.push({ name: k });
  }
  if (seeds.length === 0) {
    seeds.push({ name: timeline.title, formula: metadata.topic.formula });
  }

  // ── Build per-concept entries ────────────────────────────────────────
  const concepts: IndexedConcept[] = [];

  for (const seed of seeds) {
    const nameTokens = tokens(seed.name);
    const tokenSet = new Set(nameTokens);

    // Note overlap → related_notes. We give credit for ANY token hit (low
    // bar) because notes are short and often paraphrase the concept name.
    const related_notes: Array<{ idx: number; text: string }> = [];
    notes.key_points?.forEach((p, i) => {
      const ptoks = new Set(tokens(p));
      if (tokenHits(nameTokens, ptoks) > 0) {
        related_notes.push({ idx: i + 1, text: p });
      }
    });

    // Quiz overlap → related_quiz_mcq_ids by exact (case-insensitive)
    // concept-name match, plus token overlap as a fallback.
    const related_quiz_mcq_ids = (quiz.mcq || [])
      .filter((q) => {
        if (!q.concept) return false;
        if (q.concept.toLowerCase() === seed.name.toLowerCase()) return true;
        const qtoks = new Set(tokens(q.concept));
        return tokenHits(nameTokens, qtoks) > 0;
      })
      .map((q) => q.id);

    // Formula association: keep formulas whose name OR expression token-
    // overlaps the concept, plus the topic-level formula when the concept
    // IS the topic.
    const formulas: string[] = [];
    if (seed.formula) formulas.push(seed.formula);
    notes.formula_sheet?.forEach((f) => {
      const ftoks = new Set([...tokens(f.name), ...tokens(f.expression)]);
      if (tokenHits(nameTokens, ftoks) > 0 && !formulas.includes(f.expression)) {
        formulas.push(f.expression);
      }
    });
    if (
      seed.name.toLowerCase() === timeline.title.toLowerCase() &&
      metadata.topic.formula &&
      !formulas.includes(metadata.topic.formula)
    ) {
      formulas.push(metadata.topic.formula);
    }
    // Pull in 9-B extractor formulas when present.
    metadata.concept?.formulas?.forEach((f) => {
      if (f && !formulas.includes(f)) formulas.push(f);
    });

    // noteMarker overlap → timestamps. We collapse adjacent markers (same
    // concept, sequential timestamps) into one [start, end) range.
    const markerRanges: Array<{ start: number; end: number }> = [];
    const sortedMarkers = [...(timeline.noteMarkers || [])].sort((a, b) => a.timestamp - b.timestamp);
    for (let i = 0; i < sortedMarkers.length; i++) {
      const m = sortedMarkers[i];
      const mtoks = new Set(tokens(m.text));
      const hits = tokenHits(nameTokens, mtoks);
      if (hits > 0) {
        const start = m.timestamp;
        const next = sortedMarkers[i + 1];
        const end = next ? next.timestamp : timeline.duration;
        markerRanges.push({ start, end });
      }
    }
    // If no marker hit, fall back to the board scene of the timeline (the
    // canonical "where the concept is taught" zone for 9-A/9-B lectures).
    let timestamps = markerRanges;
    if (timestamps.length === 0) {
      const board = timeline.scenes.find((s) => s.type === 'formula' || s.type === 'board');
      if (board) timestamps = [{ start: board.start, end: board.end }];
    }

    // Scene positions = timeline.scenes whose [start,end) intersects ANY
    // of the concept's timestamp ranges.
    const scene_positions: number[] = [];
    for (const s of timeline.scenes) {
      const overlaps = timestamps.some((r) => r.start < s.end && r.end > s.start);
      if (overlaps) scene_positions.push(s.position);
    }

    // Replay segments mirror timestamps for now; kept as a separate list so
    // future logic (e.g. add 1 s lead-in) can diverge without changing
    // analytics on the raw timestamps.
    const replay_segments = timestamps.map((r) => ({ ...r }));

    // Learning objectives: keep ones that mention the concept by name.
    const learning_objectives = (metadata.concept?.learning_objectives || []).filter((o) => {
      const otoks = new Set(tokens(o));
      return tokenHits(nameTokens, otoks) > 0;
    });

    // Definition fallback: 9-B definition wins; else first matching note;
    // else summary; else "<name> — see lecture for details."
    const definition =
      seed.definition?.trim() ||
      related_notes[0]?.text ||
      notes.summary ||
      `${seed.name} — see lecture for details.`;

    concepts.push({
      id: `cpt-${slugify(seed.name)}`,
      name: seed.name,
      definition,
      difficulty: seed.difficulty,
      search_tokens: nameTokens,
      scene_positions,
      timestamps,
      replay_segments,
      formulas,
      related_notes,
      related_quiz_mcq_ids,
      learning_objectives,
    });
  }

  return {
    version: '9d-1',
    topic: { slug: timeline.topic, title: timeline.title },
    duration: timeline.duration,
    concepts,
  };
}
