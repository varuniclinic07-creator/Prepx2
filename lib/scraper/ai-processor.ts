import { aiChat } from '../ai-router';
import { embedText } from '../ai-router';
import { supabase } from '../supabase';

export interface EnrichedContent {
  title: string;
  definitions: string[];
  key_concepts: { title: string; body: string }[];
  pyqs: { year: number; question: string; answer: string }[];
  common_traps: string[];
  summary: string;
  source_url: string;
}

export interface BilingualContent {
  en: EnrichedContent;
  hi: EnrichedContent;
}

// ── Brands to NEVER mention in user-facing content ──
const BLOCKED_BRANDS = [
  'VisionIAS', 'visionias', 'DrishtiIAS', 'drishtiias',
  'InsightsOnIndia', 'insightsonindia', 'IAS Baba', 'iasbaba',
  'IAS Score', 'IASScore', 'iasscore', 'Shankar IAS', 'shankarias',
  'NextIAS', 'nextias', 'GSScore', 'gsscore',
  'GS Score', 'Laxmikant', 'Spectrum', 'Shankar',
];

function sanitizeContent(text: string): string {
  let clean = text;
  for (const brand of BLOCKED_BRANDS) {
    const re = new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    clean = clean.replace(re, '[Source]');
  }
  // Remove "Source] says", "according to [Source]" patterns
  clean = clean.replace(/according to \[Source\]/gi, 'as per official records');
  clean = clean.replace(/\[Source\] says/gi, 'official reports indicate');
  clean = clean.replace(/\[Source\] notes/gi, 'it is noted');
  return clean;
}

export async function generateFromScrapedText(
  rawText: string,
  topicTitle: string,
  syllabusTag: string,
  sourceUrl: string
): Promise<BilingualContent> {
  const systemPrompt = `You are a senior UPSC educator writing exam-ready study notes.
Write in simple English suitable for a 10th-pass aspirant aiming for IAS.
Focus on concepts, not rote memorization. Include exact Constitutional Articles, committee names, and dates.
NEVER mention coaching institutes, test prep brands, or private tutors by name. Use only official government and constitutional sources.
Return valid JSON only.`;

  const userPrompt = `Based on the following source material, create structured UPSC notes for "${topicTitle}" (${syllabusTag}).

Source material (first 4000 chars):
${rawText.slice(0, 4000)}

Return JSON:
{
  "title": "${topicTitle}",
  "definitions": ["...", "..."],
  "key_concepts": [
    {"title": "...", "body": "..."},
    {"title": "...", "body": "..."},
    {"title": "...", "body": "..."}
  ],
  "pyqs": [
    {"year": 2023, "question": "...", "answer": "..."},
    {"year": 2022, "question": "...", "answer": "..."}
  ],
  "common_traps": ["...", "..."],
  "summary": "...",
  "source_url": "${sourceUrl}"
}`;

  const raw = await aiChat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    jsonMode: true,
    temperature: 0.35,
    maxTokens: 2500,
  });

  let en: EnrichedContent;
  try {
    const parsed = JSON.parse(raw);
    en = {
      title: sanitizeContent(parsed.title || topicTitle),
      definitions: (parsed.definitions || []).map((d: string) => sanitizeContent(d)),
      key_concepts: (parsed.key_concepts || []).map((c: any) => ({ title: sanitizeContent(c.title || ''), body: sanitizeContent(c.body || '') })),
      pyqs: (parsed.pyqs || []).map((q: any) => ({ year: q.year || 2023, question: sanitizeContent(q.question || ''), answer: sanitizeContent(q.answer || '') })),
      common_traps: (parsed.common_traps || []).map((t: string) => sanitizeContent(t)),
      summary: sanitizeContent(parsed.summary || ''),
      source_url: sourceUrl,
    };
  } catch {
    en = {
      title: sanitizeContent(topicTitle),
      definitions: ['Definition pending AI generation.'],
      key_concepts: [{ title: 'Core Concept', body: 'Content being processed.' }],
      pyqs: [],
      common_traps: ['Check back after processing.'],
      summary: sanitizeContent(raw.slice(0, 500)),
      source_url: sourceUrl,
    };
  }

  // ── Hindi Translation ──
  const hiRaw = await aiChat({
    messages: [
      { role: 'system', content: 'You are a Hindi translator for UPSC study material. Translate into clear, exam-ready Hindi using Devanagari script. NEVER mention coaching institutes or private brands by name. Keep structure identical.' },
      { role: 'user', content: `Translate this UPSC topic into Hindi. Maintain JSON structure.\n\n${JSON.stringify(en)}` },
    ],
    jsonMode: true,
    temperature: 0.3,
    maxTokens: 2500,
  });

  let hi: EnrichedContent;
  try {
    const parsed = JSON.parse(hiRaw);
    hi = {
      title: sanitizeContent(parsed.title || `${topicTitle} (हिन्दी)`),
      definitions: (parsed.definitions || en.definitions).map((d: string) => sanitizeContent(d)),
      key_concepts: (parsed.key_concepts || en.key_concepts).map((c: any) => ({ title: sanitizeContent(c.title || ''), body: sanitizeContent(c.body || '') })),
      pyqs: (parsed.pyqs || en.pyqs).map((q: any) => ({ year: q.year || 2023, question: sanitizeContent(q.question || ''), answer: sanitizeContent(q.answer || '') })),
      common_traps: (parsed.common_traps || en.common_traps).map((t: string) => sanitizeContent(t)),
      summary: sanitizeContent(parsed.summary || en.summary),
      source_url: sourceUrl,
    };
  } catch {
    hi = { ...en, title: sanitizeContent(`${topicTitle} (हिन्दी)`) };
  }

  return { en, hi };
}

export async function findClosestTopic(text: string): Promise<{ id: string; title: string; similarity: number } | null> {
  const [embedding] = await embedText([text.slice(0, 1500)]);
  const { data } = await supabase.rpc('match_topics', { query_embedding: embedding, match_threshold: 0.7, match_count: 1 });
  if (!data || data.length === 0) return null;
  return { id: data[0].id, title: data[0].title, similarity: data[0].similarity };
}

export async function upsertTopicContent(
  topicId: string,
  bilingual: BilingualContent,
  syllabusTag: string,
  subject: string
) {
  const { error } = await supabase.from('topics').update({
    content: bilingual.en,
    content_hi: bilingual.hi,
    syllabus_tag: syllabusTag,
    subject,
    updated_at: new Date().toISOString(),
  }).eq('id', topicId);
  return !error;
}
