import 'server-only';
import { aiChat } from '../ai-router';

// Script Writer Agent (B2-3, Epic 6.1).
// Generates a 30-45 minute lecture script for a UPSC topic with structured
// markers (visual cues, narration chunks, chapters) so the renderer can
// drive ComfyUI/LTX 2.3 and the player can show chapter boundaries.

export interface ScriptMarker {
  time_seconds: number;
  visual_cue: string;
  narration_chunk: string;
  duration_seconds: number;
}

export interface ScriptChapter {
  time_seconds: number;
  label: string;
}

export interface GeneratedScript {
  title: string;
  scriptText: string;
  markers: ScriptMarker[];
  chapters: ScriptChapter[];
  durationSeconds: number;
  fleschKincaid: number | null;
  citations: { title: string; url: string }[];
  language: 'en' | 'hi';
}

const SYSTEM = `You are PrepX's AI lecture-script author for UPSC CSE preparation.
Write a {durationMinutes}-minute spoken lecture script in {language} for the topic below.

Hard requirements:
- Pace: 145 words/minute. A {durationMinutes}-minute script must be ~{wordTarget} words.
- Structure: 4-7 chapters with clear chapter titles. Each chapter 5-8 minutes.
- Every 30-45 seconds add a visual_cue describing what the renderer should show
  (3D animation, manim equation, classroom-board diagram, archival photo, map, etc.)
- Reading level: target Flesch-Kincaid grade 9-11 — simple sentences, concrete nouns.
- Cite at least 3 authoritative sources (NCERT, Laxmikanth, PIB, Yojana, IGNOU, ARC reports).
- No filler ("alright", "so basically", "as we all know"). No greetings/sign-offs.
- Hindi mode: pure Hindi (Devanagari) with technical terms in English in brackets.

Output JSON ONLY, no preamble. Schema:
{
  "title": "string (lecture title)",
  "scriptText": "full narration as one continuous string with \\n\\n between paragraphs",
  "chapters": [{"time_seconds": int, "label": "string"}],
  "markers": [{"time_seconds": int, "visual_cue": "string", "narration_chunk": "string", "duration_seconds": int}],
  "durationSeconds": int,
  "citations": [{"title": "string", "url": "string"}]
}`;

function fleschKincaidGrade(text: string): number | null {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (sentences === 0 || words.length === 0) return null;
  const syllables = words.reduce((acc, w) => acc + countSyllables(w), 0);
  return Math.round(((0.39 * (words.length / sentences)) + (11.8 * (syllables / words.length)) - 15.59) * 10) / 10;
}

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  const groups = w.match(/[aeiouy]+/g) || [];
  let count = groups.length;
  if (w.endsWith('e') && count > 1) count -= 1;
  return Math.max(1, count);
}

export interface GenerateScriptInput {
  topicTitle: string;
  topicBody?: string;
  syllabusTag?: string;
  paper?: string;
  durationMinutes?: number;
  language?: 'en' | 'hi';
}

export async function generateLectureScript(input: GenerateScriptInput): Promise<GeneratedScript> {
  const durationMinutes = input.durationMinutes ?? 30;
  const wordTarget = durationMinutes * 145;
  const language = input.language ?? 'en';

  const system = SYSTEM
    .replace(/{durationMinutes}/g, String(durationMinutes))
    .replace(/{wordTarget}/g, String(wordTarget))
    .replace(/{language}/g, language === 'hi' ? 'Hindi (Devanagari)' : 'English');

  const userPrompt = [
    `Topic: ${input.topicTitle}`,
    input.syllabusTag ? `Syllabus tag: ${input.syllabusTag}` : null,
    input.paper ? `Paper: ${input.paper}` : null,
    input.topicBody ? `\nReference notes:\n${input.topicBody.slice(0, 8000)}` : null,
  ].filter(Boolean).join('\n');

  const raw = await aiChat({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.35,
    maxTokens: 6000,
    jsonMode: true,
  });

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Some providers wrap in markdown fences. Strip and retry.
    const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
    parsed = JSON.parse(stripped);
  }

  if (!parsed?.title || !parsed?.scriptText) {
    throw new Error('script-writer: missing title/scriptText');
  }

  const scriptText: string = parsed.scriptText;
  const markers: ScriptMarker[] = Array.isArray(parsed.markers) ? parsed.markers : [];
  const chapters: ScriptChapter[] = Array.isArray(parsed.chapters) ? parsed.chapters : [];
  const durationSeconds = typeof parsed.durationSeconds === 'number'
    ? parsed.durationSeconds
    : durationMinutes * 60;
  const citations = Array.isArray(parsed.citations) ? parsed.citations : [];

  return {
    title: String(parsed.title),
    scriptText,
    markers,
    chapters,
    durationSeconds,
    fleschKincaid: fleschKincaidGrade(scriptText),
    citations,
    language,
  };
}
