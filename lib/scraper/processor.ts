// Real BullMQ processor for research-jobs. Replaces the B2-4 deferred no-op.
//
// One agent_tasks row per source. The processor runs the full
// scrape→enrich→link chain inline for each new article. We do not fan out
// to per-article jobs because main's task model is per-source and the
// inline chain finishes within a single dispatch (each step is small).

import { scrapeSourceOnce, enrichArticle, linkArticleToTopics } from './pipeline';
import { getAdminClient } from '../supabase-admin';
import { spawnAgent } from '../agents/hermes-dispatch';

export async function processResearchJob(
  job: { data: Record<string, any> },
  taskId: string,
): Promise<Record<string, any>> {
  const sourceId: string | undefined = job.data?.sourceId;
  if (!sourceId) return { taskId, skipped: 'no sourceId' };

  const scrape = await scrapeSourceOnce(sourceId);
  let enriched = 0;
  let linked = 0;
  const refreshedTopicIds = new Set<string>();
  const errors: string[] = [];

  for (const articleId of scrape.newArticleIds) {
    const e = await enrichArticle(articleId);
    if (e.ok) enriched += 1;
    else if (e.error) errors.push(`enrich ${articleId}: ${e.error}`);

    const l = await linkArticleToTopics(articleId);
    if (l.ok) {
      linked += l.linked;
      for (const tid of l.topicIds) refreshedTopicIds.add(tid);
    } else if (l.error && l.error !== 'no_embedding') {
      errors.push(`link ${articleId}: ${l.error}`);
    }
  }

  // Cascade: each newly-linked topic gets a content-job to refresh derived
  // material (smart-book chapters, summaries). Cap at 20 to avoid stampedes.
  if (refreshedTopicIds.size > 0) {
    const admin = getAdminClient();
    const slice = Array.from(refreshedTopicIds).slice(0, 20);
    for (const topicId of slice) {
      await spawnAgent(admin, {
        agentType: 'content',
        payload: { source: 'research-cascade', topicId, reason: 'newly_linked_article' },
        priority: 2,
      });
    }
  }

  return {
    taskId,
    sourceId,
    scraped: scrape.scraped,
    inserted: scrape.inserted,
    duplicates: scrape.duplicates,
    errored: scrape.errored,
    enriched,
    linkedRows: linked,
    cascadedTopics: refreshedTopicIds.size,
    errors: errors.slice(0, 10),
    lastError: scrape.lastError,
  };
}
