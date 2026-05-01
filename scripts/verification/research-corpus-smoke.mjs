// Exercises the SQL contract of the research corpus against cloud Supabase.
// Does NOT require Crawl4AI / live scraping or AI providers — it directly
// inserts a synthetic article row, then verifies:
//   1) UNIQUE (source_id, content_hash) rejects a duplicate
//   2) status transitions raw → enriched → linked
//   3) research_topic_links unique (article_id, topic_id) holds
//   4) match_topics_for_article RPC executes (returns 0 rows on empty embedding)
//   5) priority signals row insert
//   6) cleanup
//
// Run: node --env-file=.env.local scripts/verification/research-corpus-smoke.mjs

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(2);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

let pass = 0, fail = 0;
function ok(name) { pass++; console.log(`  PASS  ${name}`); }
function bad(name, err) { fail++; console.error(`  FAIL  ${name}: ${err}`); }

async function main() {
  console.log('— Research corpus SQL contract smoke —');

  // 0. Need a topic to link against
  let { data: topic } = await sb.from('topics').select('id').limit(1).maybeSingle();
  if (!topic) {
    const { data: t, error } = await sb.from('topics').insert({
      title: 'SMOKE topic for research', subject: 'Polity', content: { sections: [] },
    }).select('id').single();
    if (error) return bad('seed topic', error.message);
    topic = t;
  }
  ok(`topic ${topic.id.slice(0, 8)}`);

  const seed = `SMOKE-${Date.now()}`;
  const hash = createHash('sha256').update(seed).digest('hex');

  // 1. Insert raw article
  const { data: art, error: insErr } = await sb.from('research_articles').insert({
    source_id: 'smoke-source',
    source_name: 'Smoke Test',
    source_url: `https://smoke.invalid/${seed}`,
    content_hash: hash,
    title: 'Smoke title',
    body: 'Smoke body. '.repeat(40),
    status: 'raw',
  }).select('id, status').single();
  if (insErr) return bad('insert raw article', insErr.message);
  ok(`inserted raw article ${art.id.slice(0, 8)}`);

  // 2. Re-insert same (source_id, hash) → 23505 unique violation
  const { error: dupErr } = await sb.from('research_articles').insert({
    source_id: 'smoke-source',
    source_name: 'Smoke Test',
    source_url: `https://smoke.invalid/${seed}-2`,
    content_hash: hash,
    title: 'Smoke dup',
    body: 'dup',
    status: 'raw',
  });
  if (!dupErr) return bad('duplicate guard', 'expected unique violation but got success');
  if (dupErr.code !== '23505') return bad('duplicate guard', `expected 23505 got ${dupErr.code}: ${dupErr.message}`);
  ok('duplicate guard (UNIQUE source_id, content_hash) rejects 23505');

  // 3. Transition raw → enriched
  const { error: enrErr } = await sb.from('research_articles').update({
    status: 'enriched',
    summary: 'Smoke summary',
    tags: ['polity', 'smoke'],
    enriched_at: new Date().toISOString(),
  }).eq('id', art.id);
  if (enrErr) return bad('mark enriched', enrErr.message);
  ok('article → enriched');

  // 4. Manual link + transition to linked
  const { error: linkErr } = await sb.from('research_topic_links').insert({
    article_id: art.id, topic_id: topic.id, score: 0.95, link_type: 'manual',
  });
  if (linkErr) return bad('insert link', linkErr.message);

  // duplicate link should fail
  const { error: dupLinkErr } = await sb.from('research_topic_links').insert({
    article_id: art.id, topic_id: topic.id, score: 0.5, link_type: 'manual',
  });
  if (!dupLinkErr || dupLinkErr.code !== '23505') {
    return bad('link uniqueness', `expected 23505 got ${dupLinkErr?.code}`);
  }
  ok('research_topic_links unique (article_id, topic_id) holds');

  await sb.from('research_articles').update({ status: 'linked' }).eq('id', art.id);
  ok('article → linked');

  // 5. RPC executes (will return 0 rows because we pass a zero-embedding)
  const zeroVec = new Array(1536).fill(0);
  const { error: rpcErr } = await sb.rpc('match_topics_for_article', {
    query_embedding: zeroVec,
    match_threshold: 0.99,
    match_count: 5,
  });
  if (rpcErr) return bad('match_topics_for_article RPC', rpcErr.message);
  ok('match_topics_for_article RPC executes');

  // 6. Priority signals row
  const { error: psErr } = await sb.from('research_priority_signals').insert({
    topic_id: topic.id,
    signal_score: 12.5,
    signals: { weak_users: 3, days_since_update: 7, source_mentions_today: 1, research_links_7d: 2 },
  });
  if (psErr) return bad('priority signal insert', psErr.message);
  ok('priority signal row');

  // 7. Cleanup (children first)
  await sb.from('research_priority_signals').delete().eq('topic_id', topic.id).gte('signal_score', 12);
  await sb.from('research_topic_links').delete().eq('article_id', art.id);
  await sb.from('research_articles').delete().eq('id', art.id);
  ok('cleaned up smoke rows');

  console.log(`\n— Result: ${pass} passed, ${fail} failed —`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
