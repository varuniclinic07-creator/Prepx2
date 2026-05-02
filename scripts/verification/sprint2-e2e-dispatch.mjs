// Sprint 2 end-to-end dispatch verification.
//
// Counterpart to scripts/verification/sprint3-e2e-dispatch.mjs. Where the
// per-feature SQL smokes only verify the DB layer, this script exercises the
// real BullMQ worker + real LLM cascade + real cloud Supabase for the three
// LLM-driven Sprint 2 features:
//
//   S2-2  smart-book chapter generation  (content-jobs / processContentJob)
//   S2-3  content refiner                 (refine-jobs  / processRefineJob)
//   S2-4  CA daily bundle                 (bundle-jobs  / processBundleJob)
//
// (S2-1 weak-area injection is RPC-driven, no LLM, no BullMQ — already covered
// by weak-area-injection-smoke.mjs at the RPC level.)
//
// Flow:
//   1. Seed a topic + a stranger user.
//   2. Dispatch a content-job for the topic. Wait until terminal.
//      Assert: chapters row inserted for topicId with non-empty
//              detailed_content + flesch_kincaid_grade + at least one mnemonic.
//   3. Dispatch a refine-job pointed at the chapter we just generated.
//      Assert: artifact_quality_audits row in terminal status (passed |
//              flagged | rejected) with quality_score > 0.
//   4. Seed 3 research_articles (status='linked'), pre-clean any prior
//      ca_daily_bundles row for today's IST date, dispatch a bundle-job.
//      Assert: ca_daily_bundles row published with article_count >= 3.
//   5. Cleanup.
//
// Requires:
//   - hermes worker running locally (npm run worker:hermes)
//   - REDIS_URL reachable (defaults to localhost:6379)
//
// Run: node --env-file=.env.local scripts/verification/sprint2-e2e-dispatch.mjs

import { createClient } from '@supabase/supabase-js';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(2);
}
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const sb = createClient(url, key, { auth: { persistSession: false } });

let pass = 0, fail = 0;
function ok(name)        { pass++; console.log(`  PASS  ${name}`); }
function bad(name, err)  { fail++; console.error(`  FAIL  ${name}: ${err}`); }
async function step(name, fn) { try { await fn(); ok(name); } catch (e) { bad(name, e?.message || String(e)); } }

const TOPIC_TITLE = `E2E Sprint2 Smoke ${Date.now()}`;
const TEST_EMAIL  = `smoke-s2-e2e-${Date.now()}@prepx.local`;
const DEADLINE_MS = 8 * 60 * 1000;
const POLL_MS     = 2_000;

const redis = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

function makeQueue(name) {
  return new Queue(name, { connection: redis });
}

async function ensureRedis() {
  const r = await redis.ping();
  if (r !== 'PONG') throw new Error(`redis ping returned ${r}`);
}

async function dispatch(agentType, queueName, payload, userId) {
  const { data, error } = await sb.from('agent_tasks').insert({
    agent_type: agentType,
    status:     'queued',
    payload,
    user_id:    userId ?? null,
    priority:   5,
    max_retries: 3,
  }).select('id').single();
  if (error || !data?.id) throw new Error(`agent_tasks insert: ${error?.message || 'no id'}`);
  const taskId = data.id;
  const q = makeQueue(queueName);
  await q.add(agentType, { ...payload, taskId }, {
    jobId: taskId,
    priority: 5,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
  });
  await q.close();
  return taskId;
}

async function waitForTerminal(taskId, label) {
  const start = Date.now();
  while (Date.now() - start < DEADLINE_MS) {
    const { data, error } = await sb.from('agent_tasks')
      .select('status, last_error, retry_count').eq('id', taskId).single();
    if (error) throw new Error(`poll ${label}: ${error.message}`);
    if (['succeeded', 'failed', 'dead_letter', 'completed'].includes(data.status)) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`         ↳ ${label} terminal=${data.status} retries=${data.retry_count} elapsed=${elapsed}s`);
      if (data.status !== 'succeeded' && data.status !== 'completed') {
        throw new Error(`${label} ended in ${data.status}: ${data.last_error || '(no message)'}`);
      }
      return data;
    }
    await new Promise(r => setTimeout(r, POLL_MS));
  }
  throw new Error(`${label} did not reach terminal state in ${DEADLINE_MS / 1000}s`);
}

function todayInIst() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return fmt.format(new Date());
}

let topicId = null;
let userId  = null;
let chapterId = null;
let articleIds = [];
const seededSourceId = `e2e-smoke-${Date.now()}`;

async function main() {
  console.log('— Sprint 2 E2E dispatch (real worker, real LLM) —');
  console.log(`  redis: ${redisUrl}`);
  console.log(`  supabase: ${url.replace(/^https?:\/\//, '').slice(0, 32)}...`);

  await step('redis ping', ensureRedis);

  await step('seed test user', async () => {
    const { data, error } = await sb.auth.admin.createUser({
      email: TEST_EMAIL, password: 'SmokeP@ss123!', email_confirm: true,
    });
    if (error) throw new Error(error.message);
    userId = data.user.id;
    await sb.from('users').upsert({ id: userId, email: TEST_EMAIL }, { onConflict: 'id' });
  });

  await step('seed test topic', async () => {
    const { data, error } = await sb.from('topics').insert({
      title:        TOPIC_TITLE,
      subject:      'polity',
      syllabus_tag: 'GS2-Polity-FundamentalRights',
      content:      {
        intro: 'Article 21 protects life and personal liberty under the Indian Constitution.',
        body:  'Includes right to privacy, dignity, livelihood. Maneka Gandhi v Union of India (1978) expanded its scope. Article 21 has been read with Article 14 and 19 to form the golden triangle.',
      },
    }).select('id').single();
    if (error) throw new Error(error.message);
    topicId = data.id;
  });

  // ─── S2-2 — content-job (smart-book chapter) ──────────────────────────────
  let contentTask;
  await step('dispatch content-job (S2-2 smart-book chapter)', async () => {
    contentTask = await dispatch('content', 'content-jobs', { topicId }, null);
    console.log(`         ↳ task=${contentTask.slice(0, 8)}`);
  });

  await step('content-job reaches succeeded', () => waitForTerminal(contentTask, 'content'));

  await step('chapters row inserted with non-empty content + grade + mnemonics', async () => {
    const { data, error } = await sb.from('chapters')
      .select('id, title, detailed_content, mnemonics, mock_questions, summary, source_citations, flesch_kincaid_grade, status')
      .eq('topic_id', topicId)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error('no chapter row inserted');
    const ch = data[0];
    chapterId = ch.id;
    if (!ch.detailed_content || String(ch.detailed_content).trim().length < 100) {
      throw new Error(`detailed_content too short (${String(ch.detailed_content || '').length} chars)`);
    }
    if (typeof ch.flesch_kincaid_grade !== 'number' || ch.flesch_kincaid_grade <= 0) {
      throw new Error(`flesch_kincaid_grade=${ch.flesch_kincaid_grade} not a positive number`);
    }
    const mnemonics = Array.isArray(ch.mnemonics) ? ch.mnemonics : [];
    if (mnemonics.length < 1) throw new Error(`mnemonics empty`);
    const mocks = Array.isArray(ch.mock_questions) ? ch.mock_questions : [];
    console.log(`         ↳ chapter ${chapterId.slice(0, 8)} grade=${ch.flesch_kincaid_grade} status=${ch.status} mnemonics=${mnemonics.length} mocks=${mocks.length}`);
  });

  // ─── S2-3 — refine-job pointed at the chapter ─────────────────────────────
  let refineTask;
  await step('dispatch refine-job (S2-3 content refiner)', async () => {
    if (!chapterId) throw new Error('no chapterId from previous step');
    refineTask = await dispatch('refine', 'refine-jobs', {
      artifactType: 'smart_book_chapter',
      artifactId: chapterId,
      retriggerCount: 0,
    }, null);
    console.log(`         ↳ task=${refineTask.slice(0, 8)}`);
  });

  await step('refine-job reaches succeeded', () => waitForTerminal(refineTask, 'refine'));

  await step('artifact_quality_audits row in terminal status with positive score', async () => {
    const { data, error } = await sb.from('artifact_quality_audits')
      .select('id, status, quality_score, readability_grade, citation_count, syllabus_alignment_score, flags')
      .eq('artifact_type', 'smart_book_chapter')
      .eq('artifact_id', chapterId)
      .eq('retrigger_count', 0)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('no audit row');
    const terminal = ['passed', 'flagged', 'rejected', 'approved'];
    if (!terminal.includes(data.status)) throw new Error(`audit status=${data.status} not terminal`);
    if (typeof data.quality_score !== 'number' || data.quality_score <= 0) {
      throw new Error(`quality_score=${data.quality_score} not positive`);
    }
    const flagCount = Array.isArray(data.flags) ? data.flags.length : 0;
    console.log(`         ↳ audit status=${data.status} score=${data.quality_score} grade=${data.readability_grade} citations=${data.citation_count} flags=${flagCount}`);
  });

  // ─── S2-4 — bundle-job (CA daily bundle) ──────────────────────────────────
  // Pre-clean: any prior bundle for today (so the processor doesn't no-op as
  // already_published) AND seed 3 fresh linked articles.
  await step('seed 3 research_articles (status=linked) + pre-clean today bundle', async () => {
    const today = todayInIst();
    // Delete any existing bundle for today so processor sees a clean slate.
    const { data: existing } = await sb.from('ca_daily_bundles').select('id').eq('bundle_date', today);
    if (existing && existing.length > 0) {
      const ids = existing.map(b => b.id);
      await sb.from('ca_bundle_articles').delete().in('bundle_id', ids);
      await sb.from('ca_bundle_reads').delete().in('bundle_id', ids);
      await sb.from('ca_daily_bundles').delete().in('id', ids);
    }
    const seeds = [
      { title: 'CA E2E A — RBI repo rate decision',           summary: 'RBI holds repo rate at 6.5%, signals data-dependent stance ahead.' },
      { title: 'CA E2E B — Supreme Court on Article 21 scope',summary: 'Bench expands procedural due process under Article 21 in latest ruling.' },
      { title: 'CA E2E C — ISRO Gaganyaan abort-test success',summary: 'Crew escape system passes high-altitude test; manned mission on track.' },
    ];
    const inserts = seeds.map((s, i) => ({
      title: s.title,
      source_url: `https://example.test/sprint2-e2e/${seededSourceId}/${i}`,
      summary: s.summary,
      source_id: seededSourceId,
      status: 'linked',
      tags: ['polity', 'economy', 'science'].slice(i, i + 1),
      content_hash: `${seededSourceId}-${i}-${Math.random().toString(36).slice(2, 12)}`,
      scraped_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
    }));
    const { data, error } = await sb.from('research_articles').insert(inserts).select('id');
    if (error) throw new Error(error.message);
    articleIds = (data || []).map(r => r.id);
    if (articleIds.length !== 3) throw new Error(`expected 3 article rows, got ${articleIds.length}`);
  });

  let bundleTask;
  await step('dispatch bundle-job (S2-4 CA daily bundle)', async () => {
    bundleTask = await dispatch('bundle', 'bundle-jobs', {
      bundleDate: todayInIst(),
    }, null);
    console.log(`         ↳ task=${bundleTask.slice(0, 8)}`);
  });

  await step('bundle-job reaches succeeded', () => waitForTerminal(bundleTask, 'bundle'));

  await step('ca_daily_bundles row published with >=3 articles', async () => {
    const today = todayInIst();
    const { data: bundle, error: e1 } = await sb.from('ca_daily_bundles')
      .select('id, status, article_count, theme')
      .eq('bundle_date', today).maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!bundle) throw new Error('no bundle row for today');
    if (bundle.status !== 'published') throw new Error(`bundle status=${bundle.status} not published`);
    if ((bundle.article_count ?? 0) < 3) throw new Error(`article_count=${bundle.article_count} < 3`);
    const { data: linkedArticles, error: e2 } = await sb.from('ca_bundle_articles')
      .select('article_id, relevance, cluster_label, position')
      .eq('bundle_id', bundle.id);
    if (e2) throw new Error(e2.message);
    if (!linkedArticles || linkedArticles.length < 3) {
      throw new Error(`expected >=3 ca_bundle_articles rows, got ${linkedArticles?.length}`);
    }
    const seenSeeded = linkedArticles.filter(r => articleIds.includes(r.article_id)).length;
    console.log(`         ↳ bundle status=published article_count=${bundle.article_count} seeded-linked=${seenSeeded}/3 theme="${(bundle.theme || '').slice(0, 60)}"`);
  });

  // ─── Cleanup ──────────────────────────────────────────────────────────────
  await step('cleanup', async () => {
    const today = todayInIst();
    const { data: existing } = await sb.from('ca_daily_bundles').select('id').eq('bundle_date', today);
    if (existing && existing.length > 0) {
      const ids = existing.map(b => b.id);
      await sb.from('ca_bundle_articles').delete().in('bundle_id', ids);
      await sb.from('ca_bundle_reads').delete().in('bundle_id', ids);
      await sb.from('ca_daily_bundles').delete().in('id', ids);
    }
    if (articleIds.length > 0) {
      await sb.from('ca_bundle_articles').delete().in('article_id', articleIds);
      await sb.from('research_topic_links').delete().in('article_id', articleIds);
      await sb.from('research_articles').delete().in('id', articleIds);
    }
    if (chapterId) {
      await sb.from('artifact_quality_audits').delete().eq('artifact_id', chapterId);
      await sb.from('chapters').delete().eq('id', chapterId);
    }
    if (topicId) await sb.from('topics').delete().eq('id', topicId);
    if (userId)  await sb.auth.admin.deleteUser(userId);
  });

  await redis.quit();
  console.log(`\n— ${pass} pass / ${fail} fail —`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error('UNEXPECTED', e);
  try { await redis.quit(); } catch {}
  process.exit(2);
});
