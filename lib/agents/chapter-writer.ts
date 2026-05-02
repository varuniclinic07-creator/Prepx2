import 'server-only';
import { aiChat } from '../ai-router';
import { fleschKincaidGrade } from '../text/readability';

// Smart Book Chapter Writer Agent (Sprint 2, Epic 16.2).
// Generates a single approval-grade book chapter for a UPSC topic with
// strict structural & citation gates. The output is consumed by
// lib/video/processors.ts → processContentJob, which runs validateChapter
// before inserting into the `chapters` table.

export const CANONICAL_SOURCES = [
  'NCERT', 'Laxmikanth', 'PIB', 'Yojana', 'IGNOU', 'ARC',
] as const;
export type CanonicalSource = typeof CANONICAL_SOURCES[number];

export interface ChapterMnemonic {
  text: string;
  type: 'acronym' | 'story' | 'rhyme' | 'visual';
}

export interface ChapterMcq {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ChapterMains {
  question: string;
  expectedPoints: string[];
}

export interface ChapterCitation {
  source: CanonicalSource;
  reference: string;
  url?: string;
}

export interface ChapterCaLink {
  articleId: string;
  headline: string;
  url: string;
}

export interface GeneratedChapter {
  title: string;
  introduction: string;
  detailed_content: string;
  mnemonics: ChapterMnemonic[];
  mock_questions: ChapterMcq[];
  mains_questions: ChapterMains[];
  pyqs: { year: number; question: string }[];
  summary: string;
  ca_links: ChapterCaLink[];
  flesch_kincaid_grade: number;
  source_citations: ChapterCitation[];
  generated_by_agent: string;
}

export interface GenerateChapterInput {
  topicId: string;
  topicTitle: string;
  syllabusTag?: string | null;
  recentArticles?: Array<{ id: string; title: string; url: string }>;
}

const SYSTEM = `You are PrepX's Smart Book Chapter author for UPSC Civil Services aspirants.
Write ONE book-quality chapter for the topic provided. Your output replaces
a textbook section, so it must be exam-grade.

Hard requirements (every one is a gate):
- Reading level: Flesch-Kincaid grade target ≤ 10. Use short sentences, concrete nouns.
- Cite at least THREE distinct sources from this canonical set: NCERT, Laxmikanth, PIB, Yojana, IGNOU, ARC.
  In the detailed_content, place an inline tag [Source: NAME] in at least three different paragraphs.
- Mnemonics: 3-5 items, each with type one of acronym|story|rhyme|visual.
- Mock MCQs: exactly 5, each with 4 options, correctIndex 0..3, and a one-line explanation.
- Mains questions: exactly 3, each with 4-6 expectedPoints.
- Summary: 100-180 words, dense, no fluff.
- ca_links: include the recent articles I provide if relevant, otherwise an empty array.
- Output STRICT JSON only. No markdown. No preamble. No code fences.

Schema (every key is required):
{
  "title": "string",
  "introduction": "string (150-250 words, hooks the reader, sets stakes)",
  "detailed_content": "string (900-1500 words, multiple paragraphs separated by \\n\\n, contains [Source: NAME] tags)",
  "mnemonics": [{"text": "string", "type": "acronym|story|rhyme|visual"}],
  "mock_questions": [{"question":"string","options":["a","b","c","d"],"correctIndex":int,"explanation":"string"}],
  "mains_questions": [{"question":"string","expectedPoints":["string", ...]}],
  "pyqs": [{"year": int, "question": "string"}],
  "summary": "string",
  "ca_links": [{"articleId":"uuid","headline":"string","url":"string"}],
  "source_citations": [{"source":"NCERT|Laxmikanth|PIB|Yojana|IGNOU|ARC","reference":"string (book/chapter/page or PIB release id)","url":"optional string"}]
}`;

const STRICT_PREAMBLE = `Respond with JSON only — no markdown, no fences, no commentary. Begin your response with { and end with }.`;

function buildUserPrompt(input: GenerateChapterInput): string {
  const lines: string[] = [
    `Topic: ${input.topicTitle}`,
  ];
  if (input.syllabusTag) lines.push(`Syllabus tag: ${input.syllabusTag}`);
  if (input.recentArticles && input.recentArticles.length > 0) {
    lines.push('\nRecent linked current-affairs articles (use 0-3 in ca_links if directly relevant):');
    for (const a of input.recentArticles) {
      lines.push(`- ${a.id} | ${a.title} | ${a.url}`);
    }
  }
  return lines.join('\n');
}

function parseJsonLoose(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    const stripped = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();
    return JSON.parse(stripped);
  }
}

function normalizeChapter(parsed: any): GeneratedChapter {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('chapter-writer: parser returned non-object');
  }
  const detailed: string = String(parsed.detailed_content ?? '');
  const introduction: string = String(parsed.introduction ?? '');
  const summary: string = String(parsed.summary ?? '');

  const fk = fleschKincaidGrade(`${introduction}\n\n${detailed}\n\n${summary}`);
  if (fk === null) {
    throw new Error('chapter-writer: cannot compute F-K grade — empty body');
  }

  const mnemonics: ChapterMnemonic[] = Array.isArray(parsed.mnemonics)
    ? parsed.mnemonics.map((m: any) => ({
        text: String(m?.text ?? ''),
        type: (['acronym', 'story', 'rhyme', 'visual'] as const).includes(m?.type) ? m.type : 'story',
      })).filter((m: ChapterMnemonic) => m.text.length > 0)
    : [];

  const mocks: ChapterMcq[] = Array.isArray(parsed.mock_questions)
    ? parsed.mock_questions.map((q: any) => ({
        question: String(q?.question ?? ''),
        options: Array.isArray(q?.options) ? q.options.map((o: any) => String(o)).slice(0, 4) : [],
        correctIndex: Number.isInteger(q?.correctIndex) ? q.correctIndex : 0,
        explanation: String(q?.explanation ?? ''),
      })).filter((q: ChapterMcq) => q.question.length > 0 && q.options.length === 4)
    : [];

  const mains: ChapterMains[] = Array.isArray(parsed.mains_questions)
    ? parsed.mains_questions.map((q: any) => ({
        question: String(q?.question ?? ''),
        expectedPoints: Array.isArray(q?.expectedPoints) ? q.expectedPoints.map((p: any) => String(p)) : [],
      })).filter((q: ChapterMains) => q.question.length > 0)
    : [];

  const pyqs = Array.isArray(parsed.pyqs)
    ? parsed.pyqs.map((p: any) => ({
        year: Number.isInteger(p?.year) ? p.year : 0,
        question: String(p?.question ?? ''),
      })).filter((p: { year: number; question: string }) => p.question.length > 0)
    : [];

  const caLinks: ChapterCaLink[] = Array.isArray(parsed.ca_links)
    ? parsed.ca_links.map((c: any) => ({
        articleId: String(c?.articleId ?? ''),
        headline: String(c?.headline ?? ''),
        url: String(c?.url ?? ''),
      })).filter((c: ChapterCaLink) => c.articleId && c.headline)
    : [];

  const citations: ChapterCitation[] = Array.isArray(parsed.source_citations)
    ? parsed.source_citations
        .map((c: any) => {
          const src = String(c?.source ?? '');
          if (!CANONICAL_SOURCES.includes(src as CanonicalSource)) return null;
          return {
            source: src as CanonicalSource,
            reference: String(c?.reference ?? ''),
            url: c?.url ? String(c.url) : undefined,
          };
        })
        .filter((c: any): c is ChapterCitation => c !== null && c.reference.length > 0)
    : [];

  return {
    title: String(parsed.title ?? '').trim() || 'Untitled chapter',
    introduction,
    detailed_content: detailed,
    mnemonics,
    mock_questions: mocks,
    mains_questions: mains,
    pyqs,
    summary,
    ca_links: caLinks,
    flesch_kincaid_grade: fk,
    source_citations: citations,
    generated_by_agent: 'chapter-writer-v1',
  };
}

export async function generateSmartBookChapter(
  input: GenerateChapterInput,
): Promise<GeneratedChapter> {
  const userPrompt = buildUserPrompt(input);

  const callOnce = async (system: string) => aiChat({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    maxTokens: 6000,
    jsonMode: true,
  });

  let raw = '';
  try {
    raw = await callOnce(SYSTEM);
    const parsed = parseJsonLoose(raw);
    return normalizeChapter(parsed);
  } catch (firstErr: any) {
    // Retry once with a stricter "JSON only" preamble.
    try {
      raw = await callOnce(`${STRICT_PREAMBLE}\n\n${SYSTEM}`);
      const parsed = parseJsonLoose(raw);
      return normalizeChapter(parsed);
    } catch (secondErr: any) {
      throw new Error(
        `chapter-writer: both attempts failed. first=${firstErr?.message || firstErr}; second=${secondErr?.message || secondErr}`,
      );
    }
  }
}

export interface ChapterValidation {
  ok: boolean;
  errors: string[];
}

// Validates a GeneratedChapter (or a freshly-loaded chapters row reshaped to
// the same field names) against the Sprint 2 acceptance gates. Tolerances:
//   - F-K ≤ 10.5 (small slack vs the 10.0 prompt target)
//   - ≥ 3 citations total
//   - ≥ 2 distinct canonical sources
//   - ≥ 2 mnemonics
//   - ≥ 3 mock MCQs
export function validateChapter(c: GeneratedChapter): ChapterValidation {
  const errors: string[] = [];

  if (typeof c.flesch_kincaid_grade !== 'number') {
    errors.push('flesch_kincaid_grade missing');
  } else if (c.flesch_kincaid_grade > 10.5) {
    errors.push(`F-K grade ${c.flesch_kincaid_grade} exceeds 10.5 ceiling`);
  }

  const cites = Array.isArray(c.source_citations) ? c.source_citations : [];
  if (cites.length < 3) {
    errors.push(`only ${cites.length} citations (need ≥3)`);
  }
  const distinctSources = new Set(cites.map(x => x.source));
  if (distinctSources.size < 2) {
    errors.push(`only ${distinctSources.size} distinct sources (need ≥2)`);
  }

  const mnemonics = Array.isArray(c.mnemonics) ? c.mnemonics : [];
  if (mnemonics.length < 2) {
    errors.push(`only ${mnemonics.length} mnemonics (need ≥2)`);
  }

  const mocks = Array.isArray(c.mock_questions) ? c.mock_questions : [];
  if (mocks.length < 3) {
    errors.push(`only ${mocks.length} mock MCQs (need ≥3)`);
  }

  if (!c.summary || c.summary.trim().split(/\s+/).length < 50) {
    errors.push('summary too short (need ≥ ~50 words)');
  }

  return { ok: errors.length === 0, errors };
}
