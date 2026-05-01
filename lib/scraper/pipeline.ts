import { scrapeAll, scrapeSource, ScrapedArticle } from './engine';
import { generateFromScrapedText, findClosestTopic, upsertTopicContent } from './ai-processor';
import { SOURCE_REGISTRY } from './config';
import { computeContentHash } from './dedup';
import { embedText, aiChat } from '../ai-router';
import { supabase } from '../supabase';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export interface PipelineResult {
  totalScraped: number;
  totalGenerated: number;
  totalUpdated: number;
  errors: string[];
  logs: string[];
}

// ── service-role client (only on server; falls back to anon for tests/CI) ──
function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) return createServiceClient(url, key, { auth: { persistSession: false } });
  return supabase;
}

// ─────────────────────────────────────────────────────────────────────────
// crawl_history persistence (B2-2 schema: source_id, source_name, total_articles,
//   articles_processed, articles_errored, crawled_at, duration_ms, last_error)
// ─────────────────────────────────────────────────────────────────────────
async function logCrawlHistory(row: {
  sourceId: string;
  sourceName?: string;
  total: number;
  processed: number;
  errored: number;
  durationMs: number;
  lastError?: string | null;
}) {
  const sb = serviceClient();
  const { error } = await sb.from('crawl_history').insert({
    source_id: row.sourceId,
    source_name: row.sourceName ?? null,
    total_articles: row.total,
    articles_processed: row.processed,
    articles_errored: row.errored,
    crawled_at: new Date().toISOString(),
    duration_ms: row.durationMs,
    last_error: row.lastError ?? null,
  });
  if (error) console.warn('[pipeline] crawl_history insert failed', error.message);
}

// ─────────────────────────────────────────────────────────────────────────
// 1. scrapeSourceOnce — fetch + dedup + INSERT raw rows.
// Idempotent on (source_id, content_hash) UNIQUE.
// ─────────────────────────────────────────────────────────────────────────
export interface ScrapeOnceResult {
  sourceId: string;
  scraped: number;
  inserted: number;
  duplicates: number;
  errored: number;
  newArticleIds: string[];
  lastError?: string;
}

export async function scrapeSourceOnce(sourceId: string): Promise<ScrapeOnceResult> {
  const t0 = Date.now();
  const source = SOURCE_REGISTRY.find(s => s.id === sourceId);
  const out: ScrapeOnceResult = {
    sourceId, scraped: 0, inserted: 0, duplicates: 0, errored: 0, newArticleIds: [],
  };
  if (!source) {
    out.lastError = 'unknown_source';
    await logCrawlHistory({ sourceId, total: 0, processed: 0, errored: 1, durationMs: Date.now() - t0, lastError: out.lastError });
    return out;
  }

  let articles: ScrapedArticle[] = [];
  try {
    articles = await scrapeSource(sourceId);
  } catch (e: unknown) {
    out.lastError = e instanceof Error ? e.message : String(e);
    out.errored = 1;
    await logCrawlHistory({ sourceId, sourceName: source.name, total: 0, processed: 0, errored: 1, durationMs: Date.now() - t0, lastError: out.lastError });
    return out;
  }

  out.scraped = articles.length;
  const sb = serviceClient();

  for (const a of articles) {
    if (a.title === 'Scrape failed') { out.errored++; continue; }
    if (a.type === 'article' && a.content.length < 300) continue;

    const hash = computeContentHash(`${a.title}\n${a.content}`);
    const { data, error } = await sb
      .from('research_articles')
      .insert({
        source_id: a.sourceId,
        source_name: a.sourceName,
        source_url: a.url,
        content_hash: hash,
        title: a.title,
        body: a.content,
        language: 'en',
        status: 'raw',
        scraped_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      // 23505 unique violation → duplicate, expected.
      if ((error as { code?: string }).code === '23505') { out.duplicates++; continue; }
      out.errored++;
      out.lastError = error.message;
      continue;
    }
    if (data?.id) { out.inserted++; out.newArticleIds.push(data.id as string); }
  }

  await logCrawlHistory({
    sourceId, sourceName: source.name,
    total: out.scraped, processed: out.inserted, errored: out.errored,
    durationMs: Date.now() - t0, lastError: out.lastError ?? null,
  });
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// 2. enrichArticle — load row, summarise + tag + embed, status='enriched'.
// Idempotent: skips if already enriched.
// ─────────────────────────────────────────────────────────────────────────
export interface EnrichResult {
  articleId: string;
  ok: boolean;
  skipped?: 'already_enriched' | 'rejected' | 'too_short' | 'not_found';
  error?: string;
}

export async function enrichArticle(articleId: string): Promise<EnrichResult> {
  const sb = serviceClient();
  const { data: art, error: loadErr } = await sb
    .from('research_articles')
    .select('id, source_id, source_name, source_url, title, body, status')
    .eq('id', articleId)
    .single();
  if (loadErr || !art) return { articleId, ok: false, skipped: 'not_found' };
  if (art.status === 'enriched' || art.status === 'linked') return { articleId, ok: true, skipped: 'already_enriched' };
  if (art.status === 'rejected') return { articleId, ok: false, skipped: 'rejected' };
  if (!art.body || art.body.length < 200) {
    await sb.from('research_articles')
      .update({ status: 'rejected', reject_reason: 'too_short' })
      .eq('id', articleId);
    return { articleId, ok: false, skipped: 'too_short' };
  }

  // 2a — summary + tags via AI
  let summary = '';
  let tags: string[] = [];
  try {
    const raw = await aiChat({
      messages: [
        { role: 'system', content: 'You are a UPSC content analyst. Return strict JSON only.' },
        { role: 'user', content: `Summarise the article in 3 sentences for a UPSC aspirant and pick 3-7 syllabus tags from: GS1, GS2, GS3, GS4, polity, economy, geography, history, science, environment, ethics, international-relations, social-issues, security.\n\nTitle: ${art.title}\n\nBody (first 4000 chars):\n${art.body.slice(0, 4000)}\n\nReturn JSON: {"summary": "...", "tags": ["...","..."]}` },
      ],
      jsonMode: true,
      temperature: 0.2,
      maxTokens: 600,
    });
    const parsed = JSON.parse(raw);
    summary = String(parsed.summary || '').slice(0, 1200);
    tags = Array.isArray(parsed.tags) ? parsed.tags.map((t: unknown) => String(t).slice(0, 60)).slice(0, 10) : [];
  } catch (e: unknown) {
    summary = art.body.slice(0, 400);
    tags = [];
    console.warn('[enrichArticle] summary/tag failed, falling back', e);
  }

  // 2b — embedding
  let embedding: number[] | null = null;
  try {
    const [vec] = await embedText([`${art.title}\n${art.body.slice(0, 2000)}`]);
    if (Array.isArray(vec) && vec.length === 1536) embedding = vec;
  } catch (e: unknown) {
    console.warn('[enrichArticle] embed failed', e);
  }

  const { error: updErr } = await sb
    .from('research_articles')
    .update({
      summary,
      tags,
      embedding: embedding as unknown as string | null,
      status: 'enriched',
      enriched_at: new Date().toISOString(),
    })
    .eq('id', articleId);

  if (updErr) return { articleId, ok: false, error: updErr.message };
  return { articleId, ok: true };
}

// ─────────────────────────────────────────────────────────────────────────
// 3. linkArticleToTopics — semantic search, top-5 above 0.7 → links.
// Uses RPC match_topics_for_article (introduced in 052).
// ─────────────────────────────────────────────────────────────────────────
export interface LinkResult {
  articleId: string;
  linked: number;
  topicIds: string[];
  ok: boolean;
  error?: string;
}

export async function linkArticleToTopics(articleId: string): Promise<LinkResult> {
  const sb = serviceClient();
  const { data: art, error: loadErr } = await sb
    .from('research_articles')
    .select('id, embedding, status')
    .eq('id', articleId)
    .single();
  if (loadErr || !art) return { articleId, linked: 0, topicIds: [], ok: false, error: 'not_found' };
  if (!art.embedding) return { articleId, linked: 0, topicIds: [], ok: false, error: 'no_embedding' };

  const { data: matches, error: rpcErr } = await sb.rpc('match_topics_for_article', {
    query_embedding: art.embedding,
    match_threshold: 0.7,
    match_count: 5,
  });
  if (rpcErr) return { articleId, linked: 0, topicIds: [], ok: false, error: rpcErr.message };

  const rows = (matches ?? []) as Array<{ id: string; similarity: number }>;
  const out: LinkResult = { articleId, linked: 0, topicIds: [], ok: true };
  for (const m of rows) {
    const { error: linkErr } = await sb.from('research_topic_links').insert({
      article_id: articleId,
      topic_id: m.id,
      score: m.similarity,
      link_type: 'semantic',
    });
    if (!linkErr || (linkErr as { code?: string }).code === '23505') {
      out.linked += linkErr ? 0 : 1;
      out.topicIds.push(m.id);
    }
  }

  await sb.from('research_articles')
    .update({ status: 'linked' })
    .eq('id', articleId);

  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Legacy entrypoint preserved for /api/scrape/run. Delegates to the new
// split functions to keep behaviour but writes to research_articles too.
// ─────────────────────────────────────────────────────────────────────────
export async function runPipeline(
  sourceId?: string,
  regenerateAll: boolean = false
): Promise<PipelineResult> {
  const result: PipelineResult = { totalScraped: 0, totalGenerated: 0, totalUpdated: 0, errors: [], logs: [] };
  const log = (msg: string) => { result.logs.push(msg); console.log(`[Pipeline] ${msg}`); };
  const err = (msg: string) => { result.errors.push(msg); console.error(`[Pipeline] ${msg}`); };

  // Phase 1: scrape + insert raw
  log('Phase 1: scrape + dedup');
  const sources = sourceId ? [sourceId] : SOURCE_REGISTRY.filter(s => s.enabled).map(s => s.id);
  const articleIds: string[] = [];
  for (const sid of sources) {
    const r = await scrapeSourceOnce(sid);
    result.totalScraped += r.inserted + r.duplicates;
    articleIds.push(...r.newArticleIds);
    if (r.lastError) err(`${sid}: ${r.lastError}`);
  }

  // Phase 2: enrich + link
  log(`Phase 2: enrich + link (${articleIds.length} new)`);
  for (const id of articleIds) {
    const e = await enrichArticle(id);
    if (e.ok) result.totalGenerated++;
    else err(`enrich ${id} failed: ${e.error ?? e.skipped}`);
    const l = await linkArticleToTopics(id);
    if (l.ok) result.totalUpdated += l.linked;
    else err(`link ${id} failed: ${l.error}`);
  }

  // Phase 3 (optional): legacy topic upsert — only when regenerateAll is requested
  if (regenerateAll) {
    log('Phase 3: legacy topic upsert (regenerateAll)');
    let articles: ScrapedArticle[] = [];
    try {
      articles = sourceId ? await scrapeSource(sourceId) : await scrapeAll();
    } catch (e: unknown) { err(`legacy scrape: ${(e as Error).message}`); }
    for (const article of articles) {
      if (article.type === 'article' && article.content.length < 300) continue;
      if (article.title === 'Scrape failed') continue;
      try {
        const closest = await findClosestTopic(article.content);
        if (!closest) continue;
        const subject = article.sourceId.includes('yojana') || article.sourceId.includes('kurukshetra') ? 'polity' : 'economy';
        const syllabusTag = `${subject.startsWith('GS') ? subject : 'GS2-POL'}-L99`;
        const bilingual = await generateFromScrapedText(article.content, article.title, syllabusTag, article.url);
        const ok = await upsertTopicContent(closest.id, bilingual, syllabusTag, subject);
        if (ok) result.totalUpdated++;
      } catch (e: unknown) { err(`legacy enrich: ${(e as Error).message}`); }
    }
  }

  log(`Pipeline complete. Generated: ${result.totalGenerated}, Updated: ${result.totalUpdated}`);
  return result;
}
