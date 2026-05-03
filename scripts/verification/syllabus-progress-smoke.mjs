// 3D Syllabus Navigator SQL contract smoke (Sprint 4 / S4-3).
//
// Does NOT call the LLM. Exercises migration 062's user_topic_progress + get_subject_progress RPC:
//   a. Pre-clean leftover S4-3 SMOKE rows.
//   b. Seed two topics (different subjects) + owner + stranger users.
//   c. Insert user_topic_progress for owner across both topics.
//   d. UNIQUE (user_id, topic_id) rejects duplicate insert.
//   e. mastery_level CHECK rejects values >1 and <0.
//   f. Update mastery_level; updated_at advances.
//   g. RLS: stranger cannot see owner's progress rows.
//   h. RLS: stranger cannot insert progress for owner's user_id.
//   i. get_subject_progress RPC returns one row per subject, mastered_topics counts only ≥0.8.
//   j. Cleanup.
//
// Run: node --env-file=.env.local scripts/verification/syllabus-progress-smoke.mjs

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !serviceKey || !anonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(2);
}
const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

let pass = 0, fail = 0;
function ok(name) { pass++; console.log(`  PASS  ${name}`); }
function bad(name, err) { fail++; console.error(`  FAIL  ${name}: ${err}`); }
async function step(name, fn) {
  try { await fn(); ok(name); } catch (e) { bad(name, e?.message || String(e)); }
}

const SMOKE_PREFIX = 'S4-3 SMOKE';
let polityTopicId = null;
let historyTopicId = null;
let ownerId = null;
let strangerId = null;
let ownerSb = null;
let strangerSb = null;

async function ensureUser(emailHint) {
  const email = `${emailHint}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = 'SmokeP@ss123!';
  const { data: created, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`createUser ${emailHint}: ${error.message}`);
  await sb.from('users').upsert({ id: created.user.id, email }, { onConflict: 'id' });
  const anonSb = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error: signErr } = await anonSb.auth.signInWithPassword({ email, password });
  if (signErr) throw new Error(`sign-in ${emailHint}: ${signErr.message}`);
  return { id: created.user.id, sb: anonSb };
}

async function main() {
  console.log('— 3D Syllabus Navigator SQL contract smoke (S4-3) —');

  await step('pre-clean leftover S4-3 SMOKE rows', async () => {
    await sb.from('topics').delete().like('title', `${SMOKE_PREFIX}%`);
  });

  await step('seed topics (polity + history) + owner + stranger users', async () => {
    const { data: t1, error: e1 } = await sb.from('topics').insert({
      title: `${SMOKE_PREFIX} Polity Topic`, subject: 'polity', content: { intro: 'smoke', sections: [] },
    }).select('id').single();
    if (e1) throw new Error(`polity topic: ${e1.message}`);
    polityTopicId = t1.id;

    const { data: t2, error: e2 } = await sb.from('topics').insert({
      title: `${SMOKE_PREFIX} History Topic`, subject: 'history', content: { intro: 'smoke', sections: [] },
    }).select('id').single();
    if (e2) throw new Error(`history topic: ${e2.message}`);
    historyTopicId = t2.id;

    const owner = await ensureUser('smoke-syllabus-owner');
    ownerId = owner.id; ownerSb = owner.sb;
    const stranger = await ensureUser('smoke-syllabus-stranger');
    strangerId = stranger.id; strangerSb = stranger.sb;
  });

  await step('insert user_topic_progress for owner (both subjects)', async () => {
    const { error: e1 } = await ownerSb.from('user_topic_progress').insert({
      user_id: ownerId, topic_id: polityTopicId, subject: 'polity',
      quizzes_attempted: 4, quizzes_passed: 3, best_score_pct: 88, mastery_level: 0.85,
      last_activity_at: new Date().toISOString(),
    });
    if (e1) throw new Error(`polity insert: ${e1.message}`);

    const { error: e2 } = await ownerSb.from('user_topic_progress').insert({
      user_id: ownerId, topic_id: historyTopicId, subject: 'history',
      quizzes_attempted: 2, quizzes_passed: 1, best_score_pct: 55, mastery_level: 0.45,
    });
    if (e2) throw new Error(`history insert: ${e2.message}`);
  });

  await step('UNIQUE (user_id, topic_id) rejects duplicate', async () => {
    const { error } = await ownerSb.from('user_topic_progress').insert({
      user_id: ownerId, topic_id: polityTopicId, subject: 'polity', mastery_level: 0.5,
    });
    if (!error) throw new Error('expected UNIQUE rejection');
    if (error.code !== '23505') throw new Error(`expected 23505 got ${error.code}: ${error.message}`);
  });

  await step('mastery_level CHECK rejects >1 and <0', async () => {
    const tooHigh = await sb.from('user_topic_progress').insert({
      user_id: ownerId, topic_id: polityTopicId, subject: 'polity', mastery_level: 1.5,
    });
    if (!tooHigh.error || tooHigh.error.code !== '23514') {
      throw new Error(`expected 23514 for 1.5 got ${tooHigh.error?.code}: ${tooHigh.error?.message}`);
    }
    const tooLow = await sb.from('user_topic_progress').insert({
      user_id: ownerId, topic_id: polityTopicId, subject: 'polity', mastery_level: -0.1,
    });
    if (!tooLow.error || tooLow.error.code !== '23514') {
      throw new Error(`expected 23514 for -0.1 got ${tooLow.error?.code}: ${tooLow.error?.message}`);
    }
  });

  await step('update mastery_level; updated_at advances', async () => {
    const before = await sb.from('user_topic_progress')
      .select('updated_at').eq('user_id', ownerId).eq('topic_id', polityTopicId).single();
    await new Promise(r => setTimeout(r, 30));
    const { error } = await ownerSb.from('user_topic_progress').update({
      mastery_level: 0.95, quizzes_passed: 4, best_score_pct: 95,
    }).eq('user_id', ownerId).eq('topic_id', polityTopicId);
    if (error) throw new Error(error.message);
    const after = await sb.from('user_topic_progress')
      .select('updated_at, mastery_level').eq('user_id', ownerId).eq('topic_id', polityTopicId).single();
    if (after.data.mastery_level < 0.94) throw new Error(`mastery_level not updated: ${after.data.mastery_level}`);
    if (new Date(after.data.updated_at) <= new Date(before.data.updated_at)) {
      throw new Error('updated_at did not advance');
    }
  });

  await step('RLS: stranger cannot see owner progress', async () => {
    const { data, error } = await strangerSb.from('user_topic_progress').select('id').eq('user_id', ownerId);
    if (error) throw new Error(`stranger read: ${error.message}`);
    if (data && data.length > 0) throw new Error(`RLS leak: stranger saw ${data.length} owner rows`);
  });

  await step('RLS: stranger cannot insert progress for owner user_id', async () => {
    const { error } = await strangerSb.from('user_topic_progress').insert({
      user_id: ownerId, topic_id: historyTopicId, subject: 'history', mastery_level: 0.1,
    });
    if (!error) throw new Error('expected RLS rejection but insert succeeded');
    // Postgres returns 42501 (insufficient_privilege) or PostgREST returns generic error;
    // any error here is acceptable — what matters is the row didn't insert.
  });

  await step('get_subject_progress RPC returns per-subject aggregates', async () => {
    const { data, error } = await sb.rpc('get_subject_progress', { p_user_id: ownerId });
    if (error) throw new Error(error.message);
    if (!Array.isArray(data) || data.length === 0) throw new Error('rpc returned no rows');
    const polityRow = data.find(r => r.subject === 'polity');
    const historyRow = data.find(r => r.subject === 'history');
    if (!polityRow) throw new Error('no polity row in rpc');
    if (!historyRow) throw new Error('no history row in rpc');
    if (polityRow.mastered_topics < 1) throw new Error(`polity mastered_topics=${polityRow.mastered_topics} (expected ≥1 — owner has 0.95)`);
    if (Number(historyRow.mastered_topics) !== 0) throw new Error(`history mastered_topics=${historyRow.mastered_topics} (expected 0 — owner has 0.45)`);
  });

  await step('cleanup', async () => {
    await sb.from('user_topic_progress').delete().eq('user_id', ownerId);
    await sb.from('user_topic_progress').delete().eq('user_id', strangerId);
    if (polityTopicId) await sb.from('topics').delete().eq('id', polityTopicId);
    if (historyTopicId) await sb.from('topics').delete().eq('id', historyTopicId);
    if (ownerId) await sb.auth.admin.deleteUser(ownerId);
    if (strangerId) await sb.auth.admin.deleteUser(strangerId);
  });

  console.log(`\nResult: ${pass} pass, ${fail} fail`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error('UNCAUGHT', e); process.exit(2); });
