import 'server-only';
import { aiChat } from '../ai-router';

// Bundle grouper (Sprint 2 / Epic 5.3).
//
// Reads N research articles from the last 36h, asks the LLM to:
//   - cluster them into 3-5 sub-themes
//   - tag each as prelims | mains | both
//   - extract 2-3 key points per article
//   - derive an overall theme + 100-word summary + syllabus_tags
//
// Returns a strict JSON shape consumed by lib/bundles/processors.ts. Validates
// that every input article appears in the output before returning — we'd
// rather throw and let BullMQ retry than ship a bundle with dropped articles.

export interface ArticleSummary {
  id: string;
  title: string;
  url: string;
  summary: string | null;
  source_id: string;
  syllabus_tags?: string[];
}

export interface BundleArticleAssignment {
  articleId: string;
  relevance: 'prelims' | 'mains' | 'both';
  key_points: string[];
  cluster_label: string;
  position: number;
}

export interface BundleOutput {
  theme: string;
  subtitle: string;
  summary: string;
  syllabus_tags: string[];
  articles: BundleArticleAssignment[];
}

const SYSTEM_PROMPT = `You are PrepX's Current Affairs Bundle Grouper, a UPSC editor.

Given a list of recent news articles, you will:
  1. Cluster them into 3 to 5 sub-themes (cluster_label).
  2. For EVERY article, classify exam relevance as one of:
       "prelims"  (factual/static + dates + names worth memorising),
       "mains"    (analytical/issue-driven, GS2/GS3 ideas, debate angles),
       "both"     (covers both prelims facts and mains analysis).
  3. Extract 2-3 crisp key_points per article (each <= 25 words).
  4. Derive an overall bundle theme (5-10 words), a one-line subtitle (<= 90 chars),
     a tight 80-100 word summary, and a syllabus_tags array of UPSC syllabus
     fragments (e.g. "GS2 Polity", "GS3 Economy", "GS3 Environment").
  5. Position articles 0..N-1 in display order — strongest/most universal first.

Rules:
  - EVERY input article id MUST appear in the output exactly once.
  - Do not invent article ids; use the ids provided.
  - Do not drop articles even if they seem off-topic — give them their own cluster.
  - Output STRICT JSON ONLY, matching this schema:

{
  "theme": "string",
  "subtitle": "string",
  "summary": "string",
  "syllabus_tags": ["string"],
  "articles": [
    {
      "articleId": "uuid",
      "relevance": "prelims" | "mains" | "both",
      "key_points": ["string", "string"],
      "cluster_label": "string",
      "position": 0
    }
  ]
}`;

function buildUserPrompt(args: { bundleDate: string; articles: ArticleSummary[] }): string {
  const lines = args.articles.map((a, i) => {
    const tag = a.syllabus_tags && a.syllabus_tags.length > 0
      ? ` [tags: ${a.syllabus_tags.join(', ')}]`
      : '';
    return `${i + 1}. id=${a.id} | source=${a.source_id}${tag}
   title: ${a.title}
   url: ${a.url}
   summary: ${a.summary ?? '(none)'}`;
  }).join('\n\n');

  return `Bundle date: ${args.bundleDate}
Total articles: ${args.articles.length}

ARTICLES:
${lines}

Group these into a daily UPSC bundle. Return strict JSON per the schema.`;
}

function tryParseJson(raw: string): unknown {
  // The model occasionally wraps JSON in fences; strip them.
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  return JSON.parse(trimmed);
}

function validateAndCoerce(
  input: ArticleSummary[],
  parsed: unknown,
): BundleOutput {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('bundle-grouper: model returned non-object');
  }
  const obj = parsed as Record<string, unknown>;

  const theme = typeof obj.theme === 'string' ? obj.theme.trim() : '';
  const subtitle = typeof obj.subtitle === 'string' ? obj.subtitle.trim() : '';
  const summary = typeof obj.summary === 'string' ? obj.summary.trim() : '';
  const syllabusTagsRaw = Array.isArray(obj.syllabus_tags) ? obj.syllabus_tags : [];
  const articlesRaw = Array.isArray(obj.articles) ? obj.articles : null;

  if (!theme) throw new Error('bundle-grouper: missing theme');
  if (!summary) throw new Error('bundle-grouper: missing summary');
  if (!articlesRaw) throw new Error('bundle-grouper: missing articles array');

  const inputIds = new Set(input.map(a => a.id));
  const seen = new Set<string>();
  const assignments: BundleArticleAssignment[] = [];

  for (const a of articlesRaw) {
    if (!a || typeof a !== 'object') continue;
    const row = a as Record<string, unknown>;
    const articleId = typeof row.articleId === 'string' ? row.articleId : null;
    if (!articleId || !inputIds.has(articleId) || seen.has(articleId)) continue;

    const relevanceRaw = typeof row.relevance === 'string' ? row.relevance : 'both';
    const relevance: 'prelims' | 'mains' | 'both' =
      relevanceRaw === 'prelims' || relevanceRaw === 'mains' ? relevanceRaw : 'both';

    const keyPointsRaw = Array.isArray(row.key_points) ? row.key_points : [];
    const key_points = keyPointsRaw
      .filter(p => typeof p === 'string' && (p as string).trim().length > 0)
      .map(p => (p as string).trim())
      .slice(0, 3);

    const cluster_label = typeof row.cluster_label === 'string' && row.cluster_label.trim()
      ? row.cluster_label.trim()
      : 'General';

    const positionRaw = typeof row.position === 'number' ? row.position : assignments.length;
    const position = Number.isFinite(positionRaw) && positionRaw >= 0 ? Math.floor(positionRaw) : assignments.length;

    assignments.push({ articleId, relevance, key_points, cluster_label, position });
    seen.add(articleId);
  }

  // Ensure every input article got assigned. If model dropped any, append
  // them under a 'Misc' cluster — we do NOT silently lose articles.
  for (const a of input) {
    if (!seen.has(a.id)) {
      assignments.push({
        articleId: a.id,
        relevance: 'both',
        key_points: a.summary ? [a.summary.slice(0, 200)] : [],
        cluster_label: 'Misc',
        position: assignments.length,
      });
      seen.add(a.id);
    }
  }

  // Re-flow positions to a dense 0..N-1 sequence in the order we have.
  assignments.sort((a, b) => a.position - b.position);
  assignments.forEach((row, idx) => { row.position = idx; });

  const syllabus_tags = syllabusTagsRaw
    .filter(t => typeof t === 'string' && (t as string).trim().length > 0)
    .map(t => (t as string).trim())
    .slice(0, 12);

  return {
    theme: theme.slice(0, 120),
    subtitle: subtitle.slice(0, 200),
    summary: summary.slice(0, 1500),
    syllabus_tags,
    articles: assignments,
  };
}

export async function generateDailyBundle(args: {
  bundleDate: string;
  articles: ArticleSummary[];
}): Promise<BundleOutput> {
  if (!args.articles || args.articles.length === 0) {
    throw new Error('generateDailyBundle: no articles supplied');
  }

  const userPrompt = buildUserPrompt(args);
  const raw = await aiChat({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: userPrompt },
    ],
    temperature: 0.3,
    maxTokens: 4000,
    jsonMode: true,
  });

  let parsed: unknown;
  try {
    parsed = tryParseJson(raw);
  } catch (err: any) {
    throw new Error(`bundle-grouper: JSON parse failed: ${err?.message || String(err)}`);
  }

  return validateAndCoerce(args.articles, parsed);
}
