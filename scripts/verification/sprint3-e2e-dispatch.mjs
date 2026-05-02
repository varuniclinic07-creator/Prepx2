// Sprint 3 end-to-end dispatch verification.
//
// Unlike the per-feature SQL smokes, this script:
//   1) Seeds a test topic (and a stranger user) in cloud Supabase.
//   2) Pre-inserts the imagine_videos + interview_sessions rows the API
//      would normally create (the processors take id-bearing payloads).
//   3) Inserts an `agent_tasks` row per feature AND adds a BullMQ job to
//      the matching queue — same shape `spawnAgent()` does, but inline so
//      we don't have to import server-only TS modules from a .mjs script.
//   4) Polls `agent_tasks.status` for each task until terminal (succeeded
//      / failed / dead_letter), with a 4-minute deadline.
//   5) Asserts the feature row was actually populated by the processor:
//        mnemonic_artifacts: ≥2 rows for the topic with valid scene_spec
//        imagine_videos: voiceover_segments + scene_specs filled
//        animated_mindmaps: status='ready' + ≥3 nodes
//        interview_turns: 3 rows for round 1, one per judge
//   6) Cleans up.
//
// Requires:
//   - hermes worker running locally (npm run worker:hermes)
//   - REDIS_URL reachable from this script too (defaults to localhost:6379)
//
// Run: node --env-file=.env.local scripts/verification/sprint3-e2e-dispatch.mjs

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

const TOPIC_TITLE = `E2E Sprint3 Smoke ${Date.now()}`;
const TEST_EMAIL  = `smoke-s3-e2e-${Date.now()}@prepx.local`;
const DEADLINE_MS = 8 * 60 * 1000;
const POLL_MS     = 2_000;

// One IORedis connection reused across the 4 queues.
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
  // Match production defaultJobOptions so `failed` event handler exhausts at 3.
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

let topicId = null;
let userId  = null;
let imagineVideoId = null;
let interviewSessionId = null;

async function main() {
  console.log('— Sprint 3 E2E dispatch (real worker, real LLM) —');
  console.log(`  redis: ${redisUrl}`);
  console.log(`  supabase: ${url.replace(/^https?:\/\//, '').slice(0, 32)}...`);

  await step('redis ping', ensureRedis);

  // Seed user (handle_new_user trigger writes the public.users row).
  await step('seed test user', async () => {
    const { data, error } = await sb.auth.admin.createUser({
      email: TEST_EMAIL, password: 'SmokeP@ss123!', email_confirm: true,
    });
    if (error) throw new Error(error.message);
    userId = data.user.id;
    await sb.from('users').upsert({ id: userId, email: TEST_EMAIL }, { onConflict: 'id' });
  });

  // Seed topic — the 4 processors all read from `topics`.
  await step('seed test topic', async () => {
    const { data, error } = await sb.from('topics').insert({
      title:        TOPIC_TITLE,
      subject:      'polity',
      syllabus_tag: 'GS2-Polity-FundamentalRights',
      content:      { intro: 'Article 21 protects life and personal liberty under the Indian Constitution.', body: 'Includes right to privacy, dignity, livelihood. Maneka Gandhi v Union of India (1978) expanded its scope.' },
    }).select('id').single();
    if (error) throw new Error(error.message);
    topicId = data.id;
  });

  // Pre-insert the rows the API would create (imagine + interview).
  await step('pre-insert imagine_videos row', async () => {
    // duration_seconds has CHECK >0 + DEFAULT 60; processor overwrites it. Don't pass 0.
    const { data, error } = await sb.from('imagine_videos').insert({
      user_id: userId,
      topic_query: 'Article 21 — life and liberty',
      voiceover_segments: [],
      scene_specs: [],
      render_status: 'r3f_only',
    }).select('id').single();
    if (error) throw new Error(error.message);
    imagineVideoId = data.id;
  });

  await step('pre-insert interview_sessions row', async () => {
    const { data, error } = await sb.from('interview_sessions').insert({
      user_id: userId,
      topic_focus: 'Polity',
      status: 'in_progress',
    }).select('id').single();
    if (error) throw new Error(error.message);
    interviewSessionId = data.id;
  });

  // ─── Dispatch all 4 in parallel ───────────────────────────────────────────
  let mnemonicTask, imagineTask, mindmapTask, interviewTask;
  await step('dispatch 4 jobs (mnemonic + imagine + mindmap + interview)', async () => {
    [mnemonicTask, imagineTask, mindmapTask, interviewTask] = await Promise.all([
      dispatch('mnemonic',  'mnemonic-jobs',  { topicId },                                                    null),
      dispatch('imagine',   'imagine-jobs',   { videoId: imagineVideoId, topicQuery: 'Article 21 — life and liberty', userId, durationSeconds: 60 }, userId),
      dispatch('mindmap',   'mindmap-jobs',   { topicId },                                                    null),
      dispatch('interview', 'interview-jobs', { sessionId: interviewSessionId, userId, phase: 'panel-question' }, userId),
    ]);
    console.log(`         ↳ tasks: mnemonic=${mnemonicTask.slice(0,8)} imagine=${imagineTask.slice(0,8)} mindmap=${mindmapTask.slice(0,8)} interview=${interviewTask.slice(0,8)}`);
  });

  // ─── Wait for all 4 to terminate ──────────────────────────────────────────
  await step('mnemonic job reaches succeeded',  () => waitForTerminal(mnemonicTask,  'mnemonic'));
  await step('imagine job reaches succeeded',   () => waitForTerminal(imagineTask,   'imagine'));
  await step('mindmap job reaches succeeded',   () => waitForTerminal(mindmapTask,   'mindmap'));
  await step('interview job reaches succeeded', () => waitForTerminal(interviewTask, 'interview'));

  // ─── Assert each feature row was actually populated ───────────────────────
  await step('mnemonic_artifacts populated for topic', async () => {
    const { data, error } = await sb.from('mnemonic_artifacts')
      .select('id, style, scene_spec, render_status').eq('topic_id', topicId);
    if (error) throw new Error(error.message);
    if (!data || data.length < 2) throw new Error(`expected ≥2 rows, got ${data?.length}`);
    for (const r of data) {
      if (!r.scene_spec || typeof r.scene_spec !== 'object') throw new Error(`scene_spec missing on style=${r.style}`);
      if (!Array.isArray(r.scene_spec.meshes) || r.scene_spec.meshes.length === 0) {
        throw new Error(`scene_spec.meshes empty on style=${r.style}`);
      }
    }
    console.log(`         ↳ ${data.length} mnemonic rows: ${data.map(r => r.style).join(', ')}`);
  });

  await step('imagine_videos row populated with beats + scenes', async () => {
    const { data, error } = await sb.from('imagine_videos')
      .select('voiceover_segments, scene_specs, duration_seconds, syllabus_tag').eq('id', imagineVideoId).single();
    if (error) throw new Error(error.message);
    if (!Array.isArray(data.voiceover_segments) || data.voiceover_segments.length === 0) {
      throw new Error('voiceover_segments empty after job');
    }
    if (!Array.isArray(data.scene_specs) || data.scene_specs.length === 0) {
      throw new Error('scene_specs empty after job');
    }
    if (data.scene_specs.length !== data.voiceover_segments.length) {
      throw new Error(`beat count mismatch: voiceover=${data.voiceover_segments.length} scenes=${data.scene_specs.length}`);
    }
    if (data.duration_seconds <= 0) throw new Error(`duration_seconds=${data.duration_seconds}`);
    console.log(`         ↳ ${data.voiceover_segments.length} beats, ${data.duration_seconds}s, tag=${data.syllabus_tag || '(none)'}`);
  });

  await step('animated_mindmaps row + nodes inserted', async () => {
    const { data: maps, error: e1 } = await sb.from('animated_mindmaps')
      .select('id, status, layout').eq('topic_id', topicId).order('created_at', { ascending: false }).limit(1);
    if (e1) throw new Error(e1.message);
    if (!maps || maps.length === 0) throw new Error('no animated_mindmaps row');
    const m = maps[0];
    if (m.status !== 'ready') throw new Error(`mindmap status=${m.status}`);
    const { data: nodes, error: e2 } = await sb.from('mindmap_nodes')
      .select('id, depth').eq('mindmap_id', m.id);
    if (e2) throw new Error(e2.message);
    if (!nodes || nodes.length < 3) throw new Error(`expected ≥3 nodes, got ${nodes?.length}`);
    const depths = new Set(nodes.map(n => n.depth));
    if (!depths.has(0)) throw new Error('no root (depth=0) node');
    console.log(`         ↳ mindmap ${m.id.slice(0,8)} layout=${m.layout} nodes=${nodes.length} depths=${[...depths].sort().join(',')}`);
  });

  await step('interview_turns has 3 round-1 rows (one per judge)', async () => {
    const { data, error } = await sb.from('interview_turns')
      .select('judge, turn_index, question').eq('session_id', interviewSessionId).eq('turn_index', 1);
    if (error) throw new Error(error.message);
    if (!data || data.length !== 3) throw new Error(`expected 3 rows, got ${data?.length}`);
    const judges = data.map(r => r.judge).sort();
    const expected = ['behavioural', 'chairperson', 'expert'];
    if (JSON.stringify(judges) !== JSON.stringify(expected)) {
      throw new Error(`judges mismatch: got ${judges.join(',')} expected ${expected.join(',')}`);
    }
    for (const r of data) {
      if (!r.question || r.question.length < 10) throw new Error(`question too short for ${r.judge}`);
    }
    console.log(`         ↳ 3 questions: ${data.map(r => `${r.judge.slice(0,4)}=${r.question.length}c`).join(' | ')}`);
  });

  // ─── Cleanup ──────────────────────────────────────────────────────────────
  await step('cleanup', async () => {
    if (interviewSessionId) await sb.from('interview_sessions').delete().eq('id', interviewSessionId);
    if (imagineVideoId)     await sb.from('imagine_videos').delete().eq('id', imagineVideoId);
    if (topicId)            await sb.from('topics').delete().eq('id', topicId);
    if (userId)             await sb.auth.admin.deleteUser(userId);
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
