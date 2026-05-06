import { promises as fs } from 'fs';
import path from 'path';
import { aiChat } from '@/lib/ai-router';

// Strict-shape JSON for a lecture-end quiz: 5 MCQ + 5 conceptual.
// Validated on write so callers (and the smoke harness) get a hard fail
// rather than malformed downstream payloads.

export interface LectureQuizMcq {
  id: number;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  concept: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface LectureQuizConceptual {
  id: number;
  question: string;
  model_answer: string;
  concept: string;
}

export interface LectureQuiz {
  topic: string;
  mcq: LectureQuizMcq[];
  conceptual: LectureQuizConceptual[];
}

export interface GenerateLectureQuizOpts {
  topic: string;
  scriptText: string;
  outputDir: string;
}

export interface GenerateLectureQuizResult {
  quizJsonPath: string;
  quiz: LectureQuiz;
}

const SYSTEM_PROMPT = `You are a UPSC CSE quiz writer. You design exam-grade questions for Indian civil-services aspirants. Output STRICT JSON ONLY — no prose outside the JSON.`;

function parseJsonLoose(raw: string): any {
  try { return JSON.parse(raw); } catch {}
  const stripped = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try { return JSON.parse(stripped); } catch {}
  const first = stripped.indexOf('{');
  const last = stripped.lastIndexOf('}');
  if (first >= 0 && last > first) {
    return JSON.parse(stripped.slice(first, last + 1));
  }
  throw new Error('JSON parse failed (no recoverable object found)');
}

function userPrompt(topic: string, scriptText: string) {
  return `Generate a STRICT JSON quiz for the topic "${topic}" using the lecture script below as the source of truth.

Schema:
{
  "topic": "${topic}",
  "mcq": [
    {
      "id": 1,
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct_index": 0,
      "explanation": "...",
      "concept": "voltage|current|resistance|formula",
      "difficulty": "easy|medium|hard"
    }
  ],
  "conceptual": [
    { "id": 1, "question": "...", "model_answer": "...", "concept": "..." }
  ]
}

Rules:
- mcq MUST have EXACTLY 5 entries with ids 1..5.
- Each mcq.options MUST have EXACTLY 4 distinct entries.
- correct_index MUST be an integer 0..3.
- explanation MUST be non-empty and explain WHY the correct answer is correct.
- difficulty MUST be one of "easy", "medium", "hard".
- conceptual MUST have EXACTLY 5 entries with ids 1..5.
- conceptual.model_answer MUST be at least 30 characters.
- Output valid JSON only — no markdown fences, no prose outside the JSON.

LECTURE SCRIPT:
${scriptText}`;
}

function validateQuiz(obj: any): asserts obj is LectureQuiz {
  const errs: string[] = [];
  if (!obj || typeof obj !== 'object') errs.push('not an object');
  if (typeof obj?.topic !== 'string' || !obj.topic.trim()) errs.push('topic missing');
  if (!Array.isArray(obj?.mcq) || obj.mcq.length !== 5) errs.push(`mcq must have exactly 5 entries (got ${obj?.mcq?.length})`);
  else {
    obj.mcq.forEach((q: any, i: number) => {
      if (typeof q?.id !== 'number') errs.push(`mcq[${i}].id missing`);
      if (typeof q?.question !== 'string' || !q.question.trim()) errs.push(`mcq[${i}].question missing`);
      if (!Array.isArray(q?.options) || q.options.length !== 4) errs.push(`mcq[${i}].options must have exactly 4 entries`);
      else if (q.options.some((o: any) => typeof o !== 'string' || !o.trim())) errs.push(`mcq[${i}].options has empty/non-string entry`);
      if (typeof q?.correct_index !== 'number' || q.correct_index < 0 || q.correct_index > 3 || !Number.isInteger(q.correct_index)) {
        errs.push(`mcq[${i}].correct_index must be integer 0..3`);
      }
      if (typeof q?.explanation !== 'string' || !q.explanation.trim()) errs.push(`mcq[${i}].explanation missing`);
      if (typeof q?.concept !== 'string' || !q.concept.trim()) errs.push(`mcq[${i}].concept missing`);
      if (!['easy', 'medium', 'hard'].includes(q?.difficulty)) errs.push(`mcq[${i}].difficulty invalid`);
    });
  }
  if (!Array.isArray(obj?.conceptual) || obj.conceptual.length !== 5) errs.push(`conceptual must have exactly 5 entries (got ${obj?.conceptual?.length})`);
  else {
    obj.conceptual.forEach((c: any, i: number) => {
      if (typeof c?.id !== 'number') errs.push(`conceptual[${i}].id missing`);
      if (typeof c?.question !== 'string' || !c.question.trim()) errs.push(`conceptual[${i}].question missing`);
      if (typeof c?.model_answer !== 'string' || c.model_answer.trim().length < 30) {
        errs.push(`conceptual[${i}].model_answer must be >=30 chars (got ${c?.model_answer?.length ?? 0})`);
      }
      if (typeof c?.concept !== 'string' || !c.concept.trim()) errs.push(`conceptual[${i}].concept missing`);
    });
  }
  if (errs.length) throw new Error(`LectureQuiz validation failed: ${errs.join('; ')}`);
}

export async function generateLectureQuiz(opts: GenerateLectureQuizOpts): Promise<GenerateLectureQuizResult> {
  const { topic, scriptText, outputDir } = opts;

  const raw = await aiChat({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt(topic, scriptText) },
    ],
    jsonMode: true,
    temperature: 0.3,
    maxTokens: 3500,
  });

  const parsed = parseJsonLoose(raw);
  validateQuiz(parsed);

  await fs.mkdir(outputDir, { recursive: true });
  const quizJsonPath = path.join(outputDir, 'mvp-quiz.json');
  await fs.writeFile(quizJsonPath, JSON.stringify(parsed, null, 2), 'utf8');

  return { quizJsonPath, quiz: parsed };
}
