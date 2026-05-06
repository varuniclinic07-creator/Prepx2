import { promises as fs } from 'fs';
import path from 'path';
import { aiChat } from '@/lib/ai-router';
import { buildTopicPdf, type PdfSection } from '@/lib/pdf/topic-export';

// Strict-shape JSON for a single lecture's notes — fed by aiChat in jsonMode.
// Validated against the same shape on read-back so a smoke run can fail loud
// rather than ship malformed payloads downstream.

export interface LectureNotes {
  title: string;
  summary: string;
  key_points: string[];
  formula_sheet: {
    name: string;
    expression: string;
    where: Record<string, string>;
  }[];
  real_world_analogies: string[];
  common_mistakes: string[];
  exam_relevance: string;
}

export interface GenerateLectureNotesOpts {
  topic: string;
  scriptText: string;
  outputDir: string;
}

export interface GenerateLectureNotesResult {
  notesJsonPath: string;
  notesPdfPath: string;
  notes: LectureNotes;
}

const SYSTEM_PROMPT = `You are a UPSC CSE coaching note-maker. You write rigorous, exam-relevant notes for Indian civil-services aspirants. Output STRICT JSON ONLY — no prose outside the JSON.`;

// Tolerant JSON parser: tries direct parse, then markdown-stripped, then
// extracts the largest balanced {...} substring. Lower-tier providers
// occasionally truncate or wrap output even with jsonMode set.
function parseJsonLoose(raw: string): any {
  try { return JSON.parse(raw); } catch {}
  const stripped = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try { return JSON.parse(stripped); } catch {}
  const first = stripped.indexOf('{');
  const last = stripped.lastIndexOf('}');
  if (first >= 0 && last > first) {
    const slice = stripped.slice(first, last + 1);
    return JSON.parse(slice);
  }
  throw new Error('JSON parse failed (no recoverable object found)');
}

function userPrompt(topic: string, scriptText: string) {
  return `Generate STRICT JSON for the topic "${topic}" using the lecture script below as the source of truth.

Schema:
{
  "title": "${topic}",
  "summary": "<2-sentence overview>",
  "key_points": ["...", ...],   // 5 to 7 bullets, plain English
  "formula_sheet": [
    {
      "name": "<formula name>",
      "expression": "<formula, e.g. V = I * R>",
      "where": { "V": "voltage in volts", "I": "current in amperes", "R": "resistance in ohms" }
    }
  ],
  "real_world_analogies": ["water-pipe analogy: ...", "..."],
  "common_mistakes": ["...", "..."],
  "exam_relevance": "<2-3 sentences on UPSC relevance>"
}

Rules:
- key_points MUST have between 5 and 7 entries.
- formula_sheet MUST have at least 1 entry with non-empty expression and at least 1 variable in 'where'.
- real_world_analogies MUST have at least 2 entries.
- common_mistakes MUST have at least 2 entries.
- All strings non-empty; output valid JSON only — no markdown fences.

LECTURE SCRIPT:
${scriptText}`;
}

function validateNotes(obj: any): asserts obj is LectureNotes {
  const errs: string[] = [];
  if (!obj || typeof obj !== 'object') errs.push('not an object');
  if (typeof obj?.title !== 'string' || !obj.title.trim()) errs.push('title missing/empty');
  if (typeof obj?.summary !== 'string' || !obj.summary.trim()) errs.push('summary missing/empty');
  if (!Array.isArray(obj?.key_points) || obj.key_points.length < 5) errs.push(`key_points must have >=5 entries (got ${obj?.key_points?.length})`);
  if (!Array.isArray(obj?.formula_sheet) || obj.formula_sheet.length < 1) errs.push('formula_sheet must have >=1 entry');
  else {
    obj.formula_sheet.forEach((f: any, i: number) => {
      if (!f?.name || !f?.expression || !f?.where || typeof f.where !== 'object' || Object.keys(f.where).length < 1) {
        errs.push(`formula_sheet[${i}] malformed`);
      }
    });
  }
  if (!Array.isArray(obj?.real_world_analogies) || obj.real_world_analogies.length < 1) errs.push('real_world_analogies must have >=1 entry');
  if (!Array.isArray(obj?.common_mistakes) || obj.common_mistakes.length < 1) errs.push('common_mistakes must have >=1 entry');
  if (typeof obj?.exam_relevance !== 'string' || !obj.exam_relevance.trim()) errs.push('exam_relevance missing/empty');
  if (errs.length) throw new Error(`LectureNotes validation failed: ${errs.join('; ')}`);
}

// pdf-lib's standard Helvetica only encodes WinAnsi (single-byte). LLM output
// frequently contains Unicode math glyphs (Ω, ², ×, ², ³, →, etc.) that crash
// the encoder. We transliterate the common ones and strip anything else above
// 0xFF before rendering. The original JSON file keeps its full Unicode.
function sanitizeForWinAnsi(s: string): string {
  return s
    .replace(/Ω/g, 'ohm')
    .replace(/ω/g, 'omega')
    .replace(/μ/g, 'micro')
    .replace(/×/g, 'x')
    .replace(/÷/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/¹/g, '^1')
    .replace(/⁰/g, '^0')
    .replace(/⁴/g, '^4')
    .replace(/⁵/g, '^5')
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/≈/g, '~')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/≠/g, '!=')
    .replace(/…/g, '...')
    .replace(/•/g, '-')
    .replace(/[^\x00-\xFF]/g, '?');
}

function notesToPdfInput(notes: LectureNotes): Parameters<typeof buildTopicPdf>[0] {
  const S = sanitizeForWinAnsi;
  const sections: PdfSection[] = [
    { heading: 'Overview', body: S(notes.summary) },
    { heading: 'Key Points', body: 'The following points capture the essential concepts every aspirant should retain for both Prelims and Mains:', bullets: notes.key_points.map(S) },
  ];

  for (const f of notes.formula_sheet) {
    const whereBullets = Object.entries(f.where).map(([k, v]) => S(`${k} - ${v}`));
    const whereSentence = Object.entries(f.where).map(([k, v]) => S(`${k} represents ${v}`)).join('; ');
    sections.push({
      heading: S(`Formula: ${f.name}`),
      body: `Where ${whereSentence}.`,
      callout: S(f.expression),
      bullets: whereBullets,
    });
  }

  sections.push({ heading: 'Real-World Analogies', body: 'Connecting abstract theory to tangible scenarios accelerates recall during the exam:', bullets: notes.real_world_analogies.map(S) });
  sections.push({ heading: 'Common Mistakes', body: 'Watch for these classic traps that examiners repeatedly use to test conceptual depth:', bullets: notes.common_mistakes.map(S) });
  sections.push({ heading: 'UPSC Exam Relevance', body: S(notes.exam_relevance) });

  // Quick-recall checklist — flattens key_points + formulas + analogies into a
  // single revision-friendly bullet list at the end.
  const checklist: string[] = [
    ...notes.key_points.map((p) => S(`Concept: ${p}`)),
    ...notes.formula_sheet.map((f) => S(`Formula - ${f.name}: ${f.expression}`)),
    ...notes.real_world_analogies.map((a) => S(`Analogy: ${a}`)),
    ...notes.common_mistakes.map((m) => S(`Avoid: ${m}`)),
  ];
  sections.push({
    heading: 'Quick-Recall Checklist',
    body: 'Use this consolidated checklist for last-minute revision before the exam - every line corresponds to a high-yield idea covered above.',
    bullets: checklist,
  });

  return {
    title: S(notes.title),
    subtitle: `PrepX Lecture Notes - Generated ${new Date().toISOString().slice(0, 10)}`,
    sections,
    footer: 'PrepX - Generated by Hermes',
  };
}

export async function generateLectureNotes(opts: GenerateLectureNotesOpts): Promise<GenerateLectureNotesResult> {
  const { topic, scriptText, outputDir } = opts;

  const raw = await aiChat({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt(topic, scriptText) },
    ],
    jsonMode: true,
    temperature: 0.3,
    maxTokens: 3000,
  });

  const parsed = parseJsonLoose(raw);
  validateNotes(parsed);

  await fs.mkdir(outputDir, { recursive: true });
  const notesJsonPath = path.join(outputDir, 'mvp-notes.json');
  const notesPdfPath = path.join(outputDir, 'mvp-notes.pdf');

  await fs.writeFile(notesJsonPath, JSON.stringify(parsed, null, 2), 'utf8');

  const pdfBytes = await buildTopicPdf(notesToPdfInput(parsed));
  await fs.writeFile(notesPdfPath, pdfBytes);

  return { notesJsonPath, notesPdfPath, notes: parsed };
}
