// CA Daily Bundle SQL contract smoke (Sprint 2, Epic 5.3).
//
// Does NOT call the LLM. Exercises the migration 056 contract:
//   a. Seed 3 research_articles (status='linked'). source_id is a free-form text
//      column in research_articles (no research_sources table).
//   b. Insert ca_daily_bundles row (status='generating'), then 3 ca_bundle_articles.
//   c. Flip bundle status='published'; verify article_count update via PATCH.
//   d. Verify UNIQUE (bundle_date) — duplicate date insert must 23505.
//   e. Verify UNIQUE (bundle_id, article_id) on ca_bundle_articles must 23505.
//   f. Insert ca_bundle_reads (per-article + whole-bundle); verify both unique partial indexes.
//   g. Cleanup all rows (cascades through FKs).
//
// Run: node --env-file=.env.local scripts/verification/ca-bundle-smoke.mjs

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

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

async function step(name, fn) {
  try { await fn(); ok(name); } catch (e) { bad(name, e?.message || String(e)); }
}

const articleIds = [];
let bundleId = null;
let userId = null;
const bundleArticleIds = [];
// Use a date 1 year in the future to avoid colliding with real bundles.
const bundleDate = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0];
const sourceTag = `smoke-${Date.now()}`;

async function main() {
  console.log('— CA Daily Bundle SQL contract smoke —');

  await step('pre-clean any leftover smoke bundles for this date', async () => {
    // CASCADE wipes ca_bundle_articles and ca_bundle_reads.
    await sb.from('ca_daily_bundles').delete().eq('bundle_date', bundleDate);
  });

  await step('seed 3 research_articles', async () => {
    const now = new Date().toISOString();
    for (let i = 0; i < 3; i++) {
      const { data: art, error: aErr } = await sb.from('research_articles').insert({
        source_id: sourceTag,
        source_url: `https://smoke.example.com/article-${Date.now()}-${i}`,
        title: `SMOKE article ${i}`,
        summary: `Summary for smoke article ${i}.`,
        body: `Body content of smoke article ${i}.`,
        content_hash: `smoke-${Date.now()}-${i}`,
        tags: ['Polity', 'GS-II'],
        status: 'linked',
        published_at: now,
        scraped_at: now,
      }).select('id').single();
      if (aErr) throw new Error(`research_articles insert ${i}: ${aErr.message}`);
      articleIds.push(art.id);
    }
    if (articleIds.length !== 3) throw new Error(`expected 3 article ids, got ${articleIds.length}`);
  });

  await step('insert ca_daily_bundles row (status=generating)', async () => {
    const { data, error } = await sb.from('ca_daily_bundles').insert({
      bundle_date: bundleDate,
      theme: 'SMOKE: Today in UPSC',
      subtitle: 'Three smoke stories',
      syllabus_tags: ['Polity', 'GS-II'],
      summary: 'Smoke bundle covering three smoke articles for contract verification.',
      status: 'generating',
      generated_by_agent: 'SMOKE',
      article_count: 0,
    }).select('id, bundle_date, status, article_count').single();
    if (error) throw new Error(error.message);
    if (data.status !== 'generating') throw new Error(`status not generating: ${data.status}`);
    if (data.article_count !== 0) throw new Error(`article_count not 0: ${data.article_count}`);
    bundleId = data.id;
  });

  await step('insert 3 ca_bundle_articles rows', async () => {
    for (let i = 0; i < 3; i++) {
      const { data, error } = await sb.from('ca_bundle_articles').insert({
        bundle_id: bundleId,
        article_id: articleIds[i],
        relevance: ['prelims', 'mains', 'both'][i],
        key_points: [`Point A ${i}`, `Point B ${i}`],
        position: i,
        cluster_label: i < 2 ? 'Polity & Governance' : 'Misc',
      }).select('id').single();
      if (error) throw new Error(`ca_bundle_articles insert ${i}: ${error.message}`);
      bundleArticleIds.push(data.id);
    }
  });

  await step('flip bundle to published with article_count=3', async () => {
    const { data, error } = await sb.from('ca_daily_bundles').update({
      status: 'published',
      article_count: 3,
    }).eq('id', bundleId).select('status, article_count, updated_at, created_at').single();
    if (error) throw new Error(error.message);
    if (data.status !== 'published') throw new Error(`status not published: ${data.status}`);
    if (data.article_count !== 3) throw new Error(`article_count not 3: ${data.article_count}`);
    if (!data.updated_at || !data.created_at) throw new Error('missing timestamps');
    // updated_at trigger should have advanced past created_at.
    if (new Date(data.updated_at).getTime() < new Date(data.created_at).getTime()) {
      throw new Error('updated_at not advanced by trigger');
    }
  });

  await step('UNIQUE (bundle_date) rejects duplicate (23505)', async () => {
    const { error } = await sb.from('ca_daily_bundles').insert({
      bundle_date: bundleDate, // same date as bundleId
      theme: 'DUP',
      summary: 'dup',
      status: 'generating',
    });
    if (!error) throw new Error('expected unique-violation, got success');
    if (error.code !== '23505') throw new Error(`expected 23505, got ${error.code}: ${error.message}`);
  });

  await step('UNIQUE (bundle_id, article_id) rejects duplicate (23505)', async () => {
    const { error } = await sb.from('ca_bundle_articles').insert({
      bundle_id: bundleId,
      article_id: articleIds[0], // already inserted above
      relevance: 'both',
      key_points: [],
      position: 99,
      cluster_label: 'dup',
    });
    if (!error) throw new Error('expected unique-violation, got success');
    if (error.code !== '23505') throw new Error(`expected 23505, got ${error.code}: ${error.message}`);
  });

  await step('seed user for ca_bundle_reads owner', async () => {
    const { data: u } = await sb.from('users').select('id').limit(1).maybeSingle();
    if (u?.id) {
      userId = u.id;
      return;
    }
    // No users exist — create a synthetic auth user for the FK.
    const email = `smoke-ca-${Date.now()}@example.com`;
    const { data: created, error } = await sb.auth.admin.createUser({
      email,
      password: 'SmokeP@ss123!',
      email_confirm: true,
    });
    if (error) throw new Error(`createUser: ${error.message}`);
    userId = created.user.id;
    // Mirror into public.users if a row isn't auto-created.
    await sb.from('users').upsert({ id: userId, email }, { onConflict: 'id' });
  });

  await step('insert ca_bundle_reads (per-article)', async () => {
    const { error } = await sb.from('ca_bundle_reads').insert({
      user_id: userId,
      bundle_id: bundleId,
      article_id: articleIds[0],
    });
    if (error) throw new Error(error.message);
  });

  await step('UNIQUE per-article read rejects duplicate (23505)', async () => {
    const { error } = await sb.from('ca_bundle_reads').insert({
      user_id: userId,
      bundle_id: bundleId,
      article_id: articleIds[0], // same triple
    });
    if (!error) throw new Error('expected unique-violation, got success');
    if (error.code !== '23505') throw new Error(`expected 23505, got ${error.code}: ${error.message}`);
  });

  await step('insert whole-bundle read (article_id NULL)', async () => {
    const { error } = await sb.from('ca_bundle_reads').insert({
      user_id: userId,
      bundle_id: bundleId,
      article_id: null,
    });
    if (error) throw new Error(error.message);
  });

  await step('UNIQUE whole-bundle read rejects duplicate (23505)', async () => {
    const { error } = await sb.from('ca_bundle_reads').insert({
      user_id: userId,
      bundle_id: bundleId,
      article_id: null, // same (user, bundle) with NULL article
    });
    if (!error) throw new Error('expected unique-violation, got success');
    if (error.code !== '23505') throw new Error(`expected 23505, got ${error.code}: ${error.message}`);
  });

  await step('cleanup bundle + articles', async () => {
    // ON DELETE CASCADE from ca_daily_bundles handles ca_bundle_articles + reads.
    if (bundleId) await sb.from('ca_daily_bundles').delete().eq('id', bundleId);
    for (const id of articleIds) {
      await sb.from('research_articles').delete().eq('id', id);
    }
    // Leave the smoke user — auth.admin.createUser is rate-limited and other
    // smokes may reuse the public.users row.
  });

  console.log(`\n— ${pass} pass / ${fail} fail —`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('UNEXPECTED', e);
  process.exit(2);
});
