import 'server-only';
import type { Job } from 'bullmq';
import { getAdminClient } from '../supabase-admin';
import { generateDailyBundle, type ArticleSummary } from '../agents/bundle-grouper';

// BullMQ processor for bundle-jobs (Sprint 2 / Epic 5.3).
//
// Daily flow:
//   1. Determine bundle_date (job.data or today in IST).
//   2. If a published bundle for that date already exists → no-op.
//   3. Pull last-36h linked|enriched research articles (≤ 30, newest first).
//   4. Refuse to emit a tiny bundle (< 3 articles).
//   5. Call generateDailyBundle() to cluster + tag.
//   6. Upsert ca_daily_bundles, then upsert ca_bundle_articles, then mark
//      bundle 'published' with article_count.
//   7. Return summary for agent_tasks.result.

const MIN_ARTICLES_PER_BUNDLE = 3;
const MAX_ARTICLES_PER_BUNDLE = 30;

function todayInIst(): string {
  // YYYY-MM-DD in Asia/Kolkata. Sprint 2 sweeps fire at 7 AM IST so this
  // matches the cron-emitting timezone for free.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date()); // en-CA → "YYYY-MM-DD"
}

export async function processBundleJob(
  job: Job,
  taskId: string,
): Promise<Record<string, any>> {
  const sb = getAdminClient();
  const bundleDate: string = (job.data?.bundleDate as string | undefined) || todayInIst();

  // Step 2 — already published?
  const { data: existing } = await sb
    .from('ca_daily_bundles')
    .select('id, status, article_count, theme')
    .eq('bundle_date', bundleDate)
    .maybeSingle();

  if (existing && existing.status === 'published' && (existing.article_count ?? 0) > 0) {
    return {
      taskId,
      bundleDate,
      bundleId: existing.id,
      skipped: true,
      reason: 'already_published',
    };
  }

  // Step 3 — pull candidate articles
  const since = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
  const { data: rawArticles, error: artErr } = await sb
    .from('research_articles')
    .select('id, title, source_url, summary, source_id, tags, published_at, scraped_at, status')
    .in('status', ['linked', 'enriched'])
    .gte('scraped_at', since)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(MAX_ARTICLES_PER_BUNDLE);

  if (artErr) {
    throw new Error(`processBundleJob: article fetch failed: ${artErr.message}`);
  }

  const candidates: ArticleSummary[] = (rawArticles ?? [])
    .filter(a => !!a.id && !!a.title && !!a.source_url)
    .map(a => ({
      id: a.id as string,
      title: a.title as string,
      url: a.source_url as string,
      summary: (a.summary as string | null) ?? null,
      source_id: (a.source_id as string) ?? 'unknown',
      syllabus_tags: Array.isArray(a.tags) ? (a.tags as string[]) : [],
    }));

  if (candidates.length < MIN_ARTICLES_PER_BUNDLE) {
    return {
      taskId,
      bundleDate,
      skipped: true,
      reason: 'not_enough_articles',
      candidateCount: candidates.length,
    };
  }

  // Step 5 — LLM cluster
  const grouped = await generateDailyBundle({ bundleDate, articles: candidates });

  // Step 6a — upsert bundle row, status='generating' first
  let bundleId: string;
  if (existing) {
    bundleId = existing.id as string;
    const { error: updateErr } = await sb
      .from('ca_daily_bundles')
      .update({
        theme: grouped.theme,
        subtitle: grouped.subtitle,
        summary: grouped.summary,
        syllabus_tags: grouped.syllabus_tags,
        status: 'generating',
        generated_by_agent: 'bundle-grouper-v1',
      })
      .eq('id', bundleId);
    if (updateErr) throw new Error(`processBundleJob: bundle update failed: ${updateErr.message}`);
  } else {
    const { data: inserted, error: insertErr } = await sb
      .from('ca_daily_bundles')
      .insert({
        bundle_date: bundleDate,
        theme: grouped.theme,
        subtitle: grouped.subtitle,
        summary: grouped.summary,
        syllabus_tags: grouped.syllabus_tags,
        status: 'generating',
        generated_by_agent: 'bundle-grouper-v1',
        article_count: 0,
      })
      .select('id')
      .single();
    if (insertErr || !inserted?.id) {
      throw new Error(`processBundleJob: bundle insert failed: ${insertErr?.message || 'no id'}`);
    }
    bundleId = inserted.id as string;
  }

  // Step 6b — upsert ca_bundle_articles rows
  const rows = grouped.articles.map(a => ({
    bundle_id: bundleId,
    article_id: a.articleId,
    relevance: a.relevance,
    key_points: a.key_points,
    position: a.position,
    cluster_label: a.cluster_label,
  }));

  const { error: upsertErr } = await sb
    .from('ca_bundle_articles')
    .upsert(rows, { onConflict: 'bundle_id,article_id' });
  if (upsertErr) {
    throw new Error(`processBundleJob: bundle_articles upsert failed: ${upsertErr.message}`);
  }

  // Step 6c — flip to published, stamp count
  const { error: publishErr } = await sb
    .from('ca_daily_bundles')
    .update({
      status: 'published',
      article_count: rows.length,
    })
    .eq('id', bundleId);
  if (publishErr) {
    throw new Error(`processBundleJob: publish flip failed: ${publishErr.message}`);
  }

  return {
    taskId,
    bundleId,
    bundleDate,
    articleCount: rows.length,
    theme: grouped.theme,
  };
}
