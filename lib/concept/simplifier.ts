// Sprint 9-B — Convert an ExtractionResult into a teacher-style script + a
// LECTURE_PLAN-shaped object the canonical orchestrator can consume.
//
// We keep the plan shape identical to scripts/verification/mvp-e2e-lecture.ts
// LECTURE_PLAN so Phase C only needs to teach the script how to *load* an
// external plan via PLAN_JSON env var. No new shot kinds, no new fields.
//
// Plan rules:
//   - 60-120 s total (default 90)
//   - 3 shots, linear: [intro comfy 0-3] [board 3-(N-3)] [outro comfy (N-3)-N]
//   - board_phase pinned to 'full-5-beat' (works for any topic — 5 narrated beats)
//   - formula picked from extraction.formulas[0] (or "" when none)
//   - labels derived from formulas + concept names (best-effort)

import type { ExtractionResult } from './extractor';
import { aiChat } from '../ai-router';

export interface SimplifiedScript {
  title: string;
  formula: string;
  formulaUnicode: string;
  labels: Array<{ sym: string; meaning: string }>;
  beatsScript: string;          // 5 sentences, narrated over the board write-on
  introVo: string;              // 3 s opening line
  outroVo: string;              // 3 s closing line
  durationSeconds: number;      // 60-120
}

export interface SimplifiedPlan {
  topic: string;                // slug
  title: string;
  formula: string;
  formula_unicode: string;
  labels: Array<{ sym: string; meaning: string }>;
  shots: Array<{
    position: number;
    kind: 'comfy' | 'board';
    start: number;
    end: number;
    scene_prompt?: string;
    board_phase?: string;
    description: string;
  }>;
}

const SIMPLIFIER_SYSTEM = `You are a master teacher writing a 60-120 second cinematic explainer.
Style: friendly, clear, beginner-first. Active voice. No filler.

Given an extracted concept plan, produce a SHORT script with EXACTLY:
- introVo: ONE sentence (~3 s spoken) hooking the viewer with a relatable scenario.
- beatsScript: 5 short sentences (~5 s each) that walk a student from the question to the formula to a worked intuition. Each sentence advances the explanation.
- outroVo: ONE sentence (~3 s spoken) closing with a takeaway or call-to-think.
- formula: the canonical formula in ASCII (use 'x' for multiply, '/' for divide).
- formulaUnicode: same formula but with proper Unicode (× ÷ √ etc).
- labels: 1-4 symbol→meaning pairs (e.g. {"sym":"V","meaning":"Voltage (Volts)"}).
- title: human-readable topic title.
- durationSeconds: 60, 75, 90, 105, or 120 — pick what fits the content.

Respond with STRICT JSON only:
{
  "title":"string",
  "formula":"string",
  "formulaUnicode":"string",
  "labels":[{"sym":"string","meaning":"string"}],
  "beatsScript":"string (5 sentences separated by spaces or periods)",
  "introVo":"string",
  "outroVo":"string",
  "durationSeconds": 60|75|90|105|120
}`;

function safeParse<T>(raw: string): T | null {
  try { return JSON.parse(raw) as T; } catch {
    const m = /\{[\s\S]*\}/.exec(raw);
    if (m) { try { return JSON.parse(m[0]) as T; } catch { /* fall */ } }
    return null;
  }
}

export async function simplifyToScript(extraction: ExtractionResult): Promise<SimplifiedScript> {
  const userMsg =
    `EXTRACTED PLAN:\n` +
    `Topic: ${extraction.topic}\n` +
    `Summary: ${extraction.summary}\n` +
    `Concepts:\n${extraction.concepts.map(c => `  - ${c.name}: ${c.definition}${c.formula ? ` (formula: ${c.formula})` : ''}`).join('\n')}\n` +
    `Formulas: ${extraction.formulas.join('; ') || 'none'}\n` +
    `Common confusions: ${extraction.confusions.join('; ') || 'none'}\n` +
    `Difficulty: ${extraction.difficulty}\n` +
    `Learning objectives:\n${extraction.learningObjectives.map(o => `  - ${o}`).join('\n')}\n\n` +
    `Write a 60-120 s teacher-style explainer. Output STRICT JSON per the schema.`;

  const raw = await aiChat({
    messages: [
      { role: 'system', content: SIMPLIFIER_SYSTEM },
      { role: 'user', content: userMsg },
    ],
    temperature: 0.5,
    maxTokens: 1200,
    jsonMode: true,
  });

  const parsed = safeParse<Partial<SimplifiedScript>>(raw);
  if (!parsed || !parsed.title || !parsed.beatsScript) {
    throw new Error(`simplifyToScript: AI returned unparseable JSON: ${raw.slice(0, 200)}`);
  }

  const dur = [60, 75, 90, 105, 120].includes(parsed.durationSeconds as number)
    ? (parsed.durationSeconds as number)
    : 90;

  return {
    title: parsed.title.trim(),
    formula: parsed.formula?.trim() || '',
    formulaUnicode: parsed.formulaUnicode?.trim() || parsed.formula?.trim() || '',
    labels: Array.isArray(parsed.labels) ? parsed.labels.slice(0, 4) : [],
    beatsScript: parsed.beatsScript.trim(),
    introVo: parsed.introVo?.trim() || '',
    outroVo: parsed.outroVo?.trim() || '',
    durationSeconds: dur,
  };
}

// Builds the LECTURE_PLAN shape the orchestrator script consumes. The board
// phase 'full-5-beat' fills the middle of the timeline; comfy intro/outro
// bookend at 3 s each.
export function buildPlanFromScript(args: {
  topicSlug: string;
  script: SimplifiedScript;
}): SimplifiedPlan {
  const total = args.script.durationSeconds;
  const introEnd = 3;
  const outroStart = total - 3;

  return {
    topic: args.topicSlug,
    title: args.script.title,
    formula: args.script.formula,
    formula_unicode: args.script.formulaUnicode,
    labels: args.script.labels,
    shots: [
      {
        position: 0,
        kind: 'comfy',
        start: 0,
        end: introEnd,
        scene_prompt: 'wide cinematic shot of a friendly teacher in front of a green chalkboard, daylight from a side window, classroom interior, photorealistic, 35mm lens',
        description: 'intro-classroom-shot',
      },
      {
        position: 1,
        kind: 'board',
        start: introEnd,
        end: outroStart,
        board_phase: 'full-5-beat',
        description: 'board-write-on-recap',
      },
      {
        position: 2,
        kind: 'comfy',
        start: outroStart,
        end: total,
        scene_prompt: 'closer cinematic shot of a teacher smiling and gesturing thank you, classroom, warm soft light, photorealistic',
        description: 'outro-classroom-shot',
      },
    ],
  };
}
