// Sprint 9-C — Remotion-side bundle loader. We mirror lib/schema/educational
// here (rather than importing) because the Remotion compilation graph is
// excluded from the Next tsconfig, so it cannot reach `@/lib/schema/...`
// without rewiring the Remotion bundler. These are the same field shapes,
// scoped to what the compositions actually read.

export interface SceneInput {
  position: number;
  start: number;
  end: number;
  type: 'intro' | 'formula' | 'board' | 'comfy' | 'recap' | 'quiz' | 'outro';
  description: string;
}

export interface NoteMarkerInput {
  id: number | string;
  timestamp: number;
  text: string;
}

export interface QuizMarkerInput {
  id: number | string;
  timestamp: number;
  concept: string;
  question: string;
}

export interface TimelineInput {
  topic: string;
  title: string;
  duration: number;
  scenes: SceneInput[];
  noteMarkers: NoteMarkerInput[];
  quizMarkers: QuizMarkerInput[];
}

export interface FormulaSheetEntry {
  name: string;
  expression: string;
  where: Record<string, string>;
}

export interface NotesInput {
  title: string;
  summary: string;
  key_points: string[];
  formula_sheet: FormulaSheetEntry[];
  real_world_analogies: string[];
  common_mistakes: string[];
  exam_relevance: string;
}

export interface McqInput {
  id: number;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  concept: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizInput {
  topic: string;
  mcq: McqInput[];
  conceptual: Array<{ id: number; question: string; model_answer: string; concept: string }>;
}

export interface MetadataInput {
  topic: { slug: string; title: string; formula?: string };
  narration?: { script?: string; word_count?: number; actual_seconds?: number };
  video?: { duration?: number; width?: number; height?: number };
}

// What the compositions actually need at render-time. Producer (render.ts)
// loads, validates, and forwards this shape via inputProps.
export interface EducationalBundleInput {
  timeline: TimelineInput;
  metadata: MetadataInput;
  notes: NotesInput;
  quiz: QuizInput;
  // Concept metadata (only present for Sprint 9-B concept jobs). Optional —
  // lecture jobs leave this undefined and the layer falls back to the
  // formula_sheet entries from notes.
  concept?: {
    detected_topic?: string;
    detected_concepts?: Array<{ name: string; definition?: string; formula?: string }>;
    formulas?: string[];
    learning_objectives?: string[];
    confusions?: string[];
  };
  // Optional inline subtitles (parsed SRT) for the subtitle overlay.
  subtitles?: Array<{ startSec: number; endSec: number; text: string }>;
}
