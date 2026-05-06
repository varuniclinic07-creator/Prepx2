// Sprint 9-C Phase A — Unified Educational Schema (canonical Zod DSL).
//
// Single source of truth for the artifacts every learning pipeline emits:
// concept extractor, simplifier, lecture orchestrator, notes/quiz generators,
// timeline builder, and the new Remotion composition layer.
//
// Rule: every persisted artifact (timeline.json, notes.json, quiz.json,
// concept-metadata.json, manifest, etc.) is parsed against one of these
// schemas. Producers fail loud on shape drift; consumers read typed objects.
//
// We don't reshape existing files in this slice — the schemas are written to
// match what the pipeline already emits today. Phase C wires Remotion to
// these. Day-2: callers gradually migrate from ad-hoc interfaces to these
// canonical types.

import { z } from 'zod';

// ─── Atomic primitives ────────────────────────────────────────────────────

export const DifficultySchema = z.enum(['beginner', 'intermediate', 'advanced']);
export type Difficulty = z.infer<typeof DifficultySchema>;

export const LanguageSchema = z.enum(['en', 'hi', 'hinglish']);
export type Language = z.infer<typeof LanguageSchema>;

// ─── Formula ──────────────────────────────────────────────────────────────
// Matches LectureNotes.formula_sheet[i] AND simplifier.labels[i] (compatible
// supersets — the unified shape is the formula_sheet richer one).

export const FormulaLabelSchema = z.object({
  sym: z.string().min(1),
  meaning: z.string().min(1),
});
export type FormulaLabel = z.infer<typeof FormulaLabelSchema>;

export const FormulaSchema = z.object({
  name: z.string().min(1),
  expression: z.string().min(1),                        // ASCII form (V = I * R)
  expression_unicode: z.string().min(1).optional(),     // V = I × R
  where: z.record(z.string(), z.string()).default({}),  // sym → human meaning
});
export type Formula = z.infer<typeof FormulaSchema>;

// ─── Objective ────────────────────────────────────────────────────────────
// Maps to ExtractionResult.learningObjectives[i]. Stored as plain strings
// today; we wrap them so future analytics can attach mastery state.

export const ObjectiveSchema = z.object({
  id: z.string().min(1),                                 // 'obj-1', 'obj-2'…
  text: z.string().min(1),                               // verb-led sentence
  difficulty: DifficultySchema.optional(),
});
export type Objective = z.infer<typeof ObjectiveSchema>;

// ─── Concept ──────────────────────────────────────────────────────────────
// Maps to ExtractionResult.concepts[i] AND becomes the addressable unit for
// Sprint 9-D's "Ask This Explanation" feature.

export const ConceptSchema = z.object({
  id: z.string().min(1),                                 // 'cpt-voltage'
  name: z.string().min(1),
  definition: z.string().min(1),
  formula: z.string().optional(),                        // raw expression hint
  difficulty: DifficultySchema.optional(),
  related_objective_ids: z.array(z.string()).default([]),
});
export type Concept = z.infer<typeof ConceptSchema>;

// ─── Scene ────────────────────────────────────────────────────────────────
// Maps to timeline.json scenes[i]. The 'type' covers every renderer kind we
// emit today (intro/formula/outro from default plan; board/comfy from the
// orchestrator) plus the Remotion-composed kinds Phase C will introduce
// (recap, quiz). Adding new kinds is a non-breaking enum widen.

export const SceneTypeSchema = z.enum([
  'intro',
  'formula',
  'board',
  'comfy',
  'recap',
  'quiz',
  'outro',
]);
export type SceneType = z.infer<typeof SceneTypeSchema>;

export const SceneSchema = z.object({
  position: z.number().int().min(0),
  start: z.number().min(0),                              // seconds
  end: z.number().min(0),
  type: SceneTypeSchema,
  description: z.string().min(1),
  // Optional renderer-specific hints. Producers that don't have these omit
  // them; Remotion + ffmpeg consumers tolerate missing fields.
  scene_prompt: z.string().optional(),                   // comfy LTX prompt
  board_phase: z.string().optional(),                    // 'full-5-beat'
  asset_path: z.string().optional(),                     // local file ref
}).refine((s) => s.end >= s.start, {
  message: 'scene.end must be >= scene.start',
});
export type Scene = z.infer<typeof SceneSchema>;

// ─── TimelineMarker ───────────────────────────────────────────────────────
// Generic marker placed on the timeline. note/quiz markers are typed
// variants. Remotion uses these for chapter nav, replay markers, semantic
// overlay triggers.

export const TimelineMarkerKindSchema = z.enum([
  'note',
  'quiz',
  'chapter',
  'concept',
  'formula',
  'objective',
  'progress',
]);
export type TimelineMarkerKind = z.infer<typeof TimelineMarkerKindSchema>;

export const TimelineMarkerSchema = z.object({
  id: z.union([z.string(), z.number()]),
  kind: TimelineMarkerKindSchema,
  timestamp: z.number().min(0),                          // seconds
  duration: z.number().min(0).optional(),                // for ranges
  label: z.string().min(1),
  // Loose payload. Each kind documents its own contract (see NoteMarker /
  // QuizMarker below). We keep this open so Remotion overlays can attach
  // anything without a schema change.
  payload: z.record(z.string(), z.unknown()).default({}),
});
export type TimelineMarker = z.infer<typeof TimelineMarkerSchema>;

// Legacy shapes the existing timeline.json producer emits today. Kept as
// distinct schemas so we can validate live files without rewriting them.

export const NoteMarkerSchema = z.object({
  id: z.union([z.string(), z.number()]),
  timestamp: z.number().min(0),
  text: z.string().min(1),
});
export type NoteMarker = z.infer<typeof NoteMarkerSchema>;

export const QuizMarkerSchema = z.object({
  id: z.union([z.string(), z.number()]),
  timestamp: z.number().min(0),
  concept: z.string().min(1),
  question: z.string().min(1),
});
export type QuizMarker = z.infer<typeof QuizMarkerSchema>;

// ─── QuizItem ─────────────────────────────────────────────────────────────
// Canonical MCQ + conceptual shapes (matches lib/lecture/quiz.ts).

export const QuizMcqSchema = z.object({
  id: z.number().int().min(1),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correct_index: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
  concept: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});
export type QuizMcq = z.infer<typeof QuizMcqSchema>;

export const QuizConceptualSchema = z.object({
  id: z.number().int().min(1),
  question: z.string().min(1),
  model_answer: z.string().min(30),
  concept: z.string().min(1),
});
export type QuizConceptual = z.infer<typeof QuizConceptualSchema>;

// "Quiz item" = a single quiz row, independent of bucket. Useful for
// Remotion quiz scenes that render one item at a time.
export const QuizItemSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('mcq'), data: QuizMcqSchema }),
  z.object({ kind: z.literal('conceptual'), data: QuizConceptualSchema }),
]);
export type QuizItem = z.infer<typeof QuizItemSchema>;

export const QuizBundleSchema = z.object({
  topic: z.string().min(1),
  mcq: z.array(QuizMcqSchema).length(5),
  conceptual: z.array(QuizConceptualSchema).length(5),
});
export type QuizBundle = z.infer<typeof QuizBundleSchema>;

// ─── Note ─────────────────────────────────────────────────────────────────
// Canonical note shape (matches lib/lecture/notes.ts LectureNotes).

export const NoteSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  key_points: z.array(z.string().min(1)).min(5).max(7),
  formula_sheet: z.array(FormulaSchema.extend({
    // notes.ts emits 'where' as a Record<string, string> directly; the
    // unified Formula already matches.
  })).min(1),
  real_world_analogies: z.array(z.string().min(1)).min(1),
  common_mistakes: z.array(z.string().min(1)).min(1),
  exam_relevance: z.string().min(1),
});
export type Note = z.infer<typeof NoteSchema>;

// ─── Timeline ─────────────────────────────────────────────────────────────
// Matches outputs/mvp/timeline.json verbatim.

export const TimelineSchema = z.object({
  topic: z.string().min(1),
  title: z.string().min(1),
  duration: z.number().min(0),
  scenes: z.array(SceneSchema).min(1),
  noteMarkers: z.array(NoteMarkerSchema).default([]),
  quizMarkers: z.array(QuizMarkerSchema).default([]),
  // Phase C addition: typed timeline markers. Older files won't have this;
  // producers may set it, consumers may read it.
  markers: z.array(TimelineMarkerSchema).optional(),
});
export type Timeline = z.infer<typeof TimelineSchema>;

// ─── EducationalBundle ────────────────────────────────────────────────────
// Top-level container that aggregates everything produced for ONE lecture or
// concept. This is the shape Remotion's renderProps consumes, and the shape
// Sprint 9-D's "Ask This Explanation" runtime indexes against.

export const VideoMetaSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  duration: z.number().min(0),
  v_codec: z.string().min(1).optional(),
  a_codec: z.string().min(1).optional(),
  path: z.string().optional(),
});
export type VideoMeta = z.infer<typeof VideoMetaSchema>;

export const EducationalBundleSchema = z.object({
  // Identity
  bundle_id: z.string().min(1),                          // lectureId or conceptId
  bundle_kind: z.enum(['lecture', 'concept']),
  topic: z.object({
    slug: z.string().min(1),
    title: z.string().min(1),
  }),
  language: LanguageSchema.default('en'),
  difficulty: DifficultySchema.default('beginner'),
  generated_at: z.string().min(1),                       // ISO

  // Pedagogical core
  concepts: z.array(ConceptSchema).default([]),
  formulas: z.array(FormulaSchema).default([]),
  objectives: z.array(ObjectiveSchema).default([]),

  // Rendered artifacts
  timeline: TimelineSchema,
  notes: NoteSchema.optional(),
  quiz: QuizBundleSchema.optional(),
  video: VideoMetaSchema.optional(),

  // Free-form provenance: stage timings, cache hits, source excerpts.
  provenance: z.record(z.string(), z.unknown()).default({}),
});
export type EducationalBundle = z.infer<typeof EducationalBundleSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────

export function safeParseEducational<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): { ok: true; data: z.infer<T> } | { ok: false; error: string } {
  const r = schema.safeParse(data);
  if (r.success) return { ok: true, data: r.data };
  const msg = r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  return { ok: false, error: msg };
}

// Convenience adapters for the existing producers. These let Phase C's
// Remotion entry point and Phase B's stage-log forwarder consume legacy
// output without an interim migration.

export function objectivesFromExtraction(raw: string[]): Objective[] {
  return raw.map((text, i) => ({ id: `obj-${i + 1}`, text }));
}

export function conceptsFromExtraction(
  raw: Array<{ name: string; definition: string; formula?: string; difficulty?: string }>
): Concept[] {
  return raw.map((c, i) => ({
    id: `cpt-${(c.name || `concept-${i + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32)}`,
    name: c.name,
    definition: c.definition,
    formula: c.formula,
    difficulty: (['beginner', 'intermediate', 'advanced'] as const).includes(c.difficulty as any)
      ? (c.difficulty as Difficulty)
      : undefined,
    related_objective_ids: [],
  }));
}

export function formulasFromExtraction(raw: string[]): Formula[] {
  return raw.map((expr, i) => ({
    name: `Formula ${i + 1}`,
    expression: expr,
    where: {},
  }));
}
