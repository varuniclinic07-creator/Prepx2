// Compute per-topic "freshness/demand" priority signals.
// Persisted nightly to research_priority_signals.

import { createClient as createServiceClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

function svc() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) return createServiceClient(url, key, { auth: { persistSession: false } });
  return supabase;
}

export interface TopicSignal {
  topic_id: string;
  signal_score: number;
  signals: {
    weak_users: number;
    days_since_update: number;
    source_mentions_today: number;
    research_links_7d: number;
  };
}

/**
 * Aggregates the three signals from spec:
 *  - weak_users: distinct users with weak_areas pointing at this topic
 *  - days_since_update: how long since topics.updated_at was bumped
 *  - source_mentions_today: research_articles whose tags overlap topic title (last 24h)
 *  - research_links_7d: research_topic_links count in last 7 days (proxy for "trending in research feed")
 *
 * signal_score is a simple weighted sum; the consumer (script picker / Hermes
 * content sweep) treats it as ordinal, not as a probability.
 */
export async function computeResearchPrioritySignals(): Promise<TopicSignal[]> {
  const sb = svc();
  // Pull all topics that have content (skip empties).
  const { data: topics, error } = await sb
    .from('topics')
    .select('id, title, updated_at');
  if (error || !topics) return [];

  // weak_users counts in batch
  const { data: weak } = await sb
    .from('user_weak_areas')
    .select('topic_id, user_id');
  const weakByTopic = new Map<string, Set<string>>();
  for (const w of weak ?? []) {
    if (!w.topic_id) continue;
    if (!weakByTopic.has(w.topic_id)) weakByTopic.set(w.topic_id, new Set());
    weakByTopic.get(w.topic_id)!.add(w.user_id);
  }

  // research_links last 7d
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
  const { data: links7 } = await sb
    .from('research_topic_links')
    .select('topic_id, created_at')
    .gte('created_at', sevenDaysAgo);
  const links7ByTopic = new Map<string, number>();
  for (const l of links7 ?? []) {
    links7ByTopic.set(l.topic_id, (links7ByTopic.get(l.topic_id) ?? 0) + 1);
  }

  // source_mentions_today: recent research_articles whose title/tags include the topic title.
  const today = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data: recentArticles } = await sb
    .from('research_articles')
    .select('id, title, tags')
    .gte('scraped_at', today);

  const out: TopicSignal[] = [];
  const now = Date.now();
  for (const t of topics) {
    const weak_users = weakByTopic.get(t.id)?.size ?? 0;
    const updatedAt = t.updated_at ? new Date(t.updated_at).getTime() : 0;
    const days_since_update = updatedAt ? Math.floor((now - updatedAt) / 86400_000) : 999;
    const research_links_7d = links7ByTopic.get(t.id) ?? 0;
    let source_mentions_today = 0;
    const titleLower = (t.title ?? '').toLowerCase();
    for (const a of recentArticles ?? []) {
      const hayTitle = (a.title ?? '').toLowerCase();
      const hayTags = (a.tags ?? []).map((x: string) => x.toLowerCase());
      if (titleLower && (hayTitle.includes(titleLower) || hayTags.some((tag: string) => tag.includes(titleLower)))) {
        source_mentions_today++;
      }
    }

    const signal_score =
      weak_users * 3 +
      Math.min(days_since_update, 90) * 0.2 +
      source_mentions_today * 5 +
      research_links_7d * 1.5;

    out.push({
      topic_id: t.id,
      signal_score,
      signals: { weak_users, days_since_update, source_mentions_today, research_links_7d },
    });
  }

  // Persist top 200 (rolling window — older rows are kept for trend analysis).
  const top = out.sort((a, b) => b.signal_score - a.signal_score).slice(0, 200);
  if (top.length > 0) {
    const rows = top.map(s => ({
      topic_id: s.topic_id,
      signal_score: s.signal_score,
      signals: s.signals,
    }));
    const { error: insErr } = await sb.from('research_priority_signals').insert(rows);
    if (insErr) console.warn('[priority-signals] insert failed', insErr.message);
  }
  return top;
}
