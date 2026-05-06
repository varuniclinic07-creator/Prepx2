// Sprint 9-B — Concept extraction. Given parsed source text, ask the AI router
// to identify (a) the canonical topic title, (b) the core concepts the student
// must understand, (c) the formulas/relations involved, (d) likely points of
// confusion, (e) difficulty + suggested learning objectives.
//
// The extractor is the "diagnostic teacher" stage. The simplifier stage that
// follows turns this structured plan into a teacher-style script.

import { aiChat } from '../ai-router';

export interface ExtractedConcept {
  name: string;
  definition: string;
  formula?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface ExtractionResult {
  topic: string;                              // canonical title, e.g. "Ohm's Law"
  topicSlug: string;                          // 'ohms-law'
  summary: string;                            // 1-2 sentence overview
  concepts: ExtractedConcept[];               // 1-5 core concepts
  formulas: string[];                         // explicit formulas/relations
  confusions: string[];                       // common misconceptions
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  learningObjectives: string[];               // 2-5 measurable objectives
}

const SYSTEM_PROMPT = `You are an expert STEM teacher analyzing a student's source document.
Your job: identify the ONE central topic and the concepts a learner must master.

Rules:
- Pick exactly ONE central topic. If multiple appear, choose the one with most coverage.
- 1-5 concepts maximum. Each concept must have a one-sentence definition.
- Include any formulas/relations as plain text (V = I × R, F = ma, etc.).
- List 2-4 likely confusions a beginner would have.
- 2-5 learning objectives, each starting with a verb (Define, Calculate, Apply, Compare, …).
- Difficulty: beginner | intermediate | advanced — based on content density.

Respond with STRICT JSON, no prose:
{
  "topic": "string",
  "topicSlug": "kebab-case-slug",
  "summary": "string",
  "concepts": [{"name":"string","definition":"string","formula":"optional string","difficulty":"beginner|intermediate|advanced"}],
  "formulas": ["string"],
  "confusions": ["string"],
  "difficulty": "beginner|intermediate|advanced",
  "learningObjectives": ["string"]
}`;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'concept';
}

function safeParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Some models wrap in ```json … ``` despite jsonMode
    const m = /\{[\s\S]*\}/.exec(raw);
    if (m) {
      try { return JSON.parse(m[0]) as T; } catch { /* fall through */ }
    }
    return null;
  }
}

export async function extractConcepts(sourceText: string): Promise<ExtractionResult> {
  const userMsg =
    `SOURCE TEXT (truncated to first 60k chars):\n\n${sourceText}\n\n` +
    `Extract the central topic, concepts, formulas, confusions, difficulty, ` +
    `and learning objectives as STRICT JSON per the schema above.`;

  const raw = await aiChat({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMsg },
    ],
    temperature: 0.2,
    maxTokens: 1800,
    jsonMode: true,
  });

  const parsed = safeParse<Partial<ExtractionResult>>(raw);
  if (!parsed || !parsed.topic) {
    throw new Error(`extractConcepts: AI returned unparseable JSON: ${raw.slice(0, 200)}`);
  }

  const topic = parsed.topic.trim();
  const topicSlug = parsed.topicSlug?.trim() || slugify(topic);

  return {
    topic,
    topicSlug,
    summary: parsed.summary?.trim() || '',
    concepts: Array.isArray(parsed.concepts) ? parsed.concepts.slice(0, 5) : [],
    formulas: Array.isArray(parsed.formulas) ? parsed.formulas.slice(0, 8) : [],
    confusions: Array.isArray(parsed.confusions) ? parsed.confusions.slice(0, 6) : [],
    difficulty: (parsed.difficulty as ExtractionResult['difficulty']) || 'beginner',
    learningObjectives: Array.isArray(parsed.learningObjectives)
      ? parsed.learningObjectives.slice(0, 5)
      : [],
  };
}
