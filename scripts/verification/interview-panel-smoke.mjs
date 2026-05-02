// Live Interview Panel SQL contract smoke (Sprint 3 / S3-8).
//
// Does NOT call the LLM. Exercises migration 064:
//   1) Pre-clean rows for the test user
//   2) Seed a test user
//   3) Insert an interview_sessions row
//   4) Insert 3 interview_turns for turn_index=1 (chairperson, expert, behavioural)
//   5) UNIQUE(session_id, turn_index, judge) blocks duplicate turn rows
//   6) Update each turn with user_answer + score + feedback
//   7) Insert interview_debriefs row with valid scene_spec + strengths + weaknesses
//   8) UNIQUE(session_id) on debriefs blocks duplicate debrief
//   9) ON DELETE CASCADE: deleting the session removes turns + debrief
//   10) Final cleanup
//
// Run: node --env-file=.env.local scripts/verification/interview-panel-smoke.mjs

import { createClient } from '@supabase/supabase-js';

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

const TEST_EMAIL = `smoke-s38-${Date.now()}@prepx.local`;
const TOPIC_FOCUS = 'S3-8 SMOKE';

let userId = null;
let sessionId = null;
const turnIds = {};

// Minimal valid SceneSpec for inline insertion.
const sampleScene = {
  version: 1,
  background: 'primary',
  durationSeconds: 12,
  ambientIntensity: 0.6,
  meshes: [
    { kind: 'sphere',      position: [-2, 0.5, 0], color: 'cyan',    emissive: true, label: 'Chairperson' },
    { kind: 'icosahedron', position: [ 0, 0.5, 0], color: 'gold',    emissive: true, label: 'Expert' },
    { kind: 'torus',       position: [ 2, 0.5, 0], color: 'magenta', emissive: true, label: 'Behavioural' },
  ],
  cameraKeyframes: [
    { timeSeconds: 0,  position: [0, 1.2, 6], lookAt: [0, 0.5, 0] },
    { timeSeconds: 6,  position: [3, 1.5, 4], lookAt: [0, 0.5, 0] },
    { timeSeconds: 12, position: [-3, 1.5, 4], lookAt: [0, 0.5, 0] },
  ],
  labels: [
    { timeSeconds: 1, position: [0, 2, 0], text: 'Total: 24/30', durationSeconds: 4, size: 0.5 },
  ],
};

async function main() {
  console.log('— Live Interview Panel SQL contract smoke —');

  // 1. Pre-clean any prior rows tagged with our smoke topic.
  await step('pre-clean prior smoke rows', async () => {
    // First wipe sessions whose topic_focus matches the smoke marker.
    const { data: stale } = await sb
      .from('interview_sessions')
      .select('id')
      .eq('topic_focus', TOPIC_FOCUS);
    if (stale && stale.length > 0) {
      const ids = stale.map(s => s.id);
      // CASCADE deletes turns and debriefs.
      const { error } = await sb.from('interview_sessions').delete().in('id', ids);
      if (error) throw new Error(error.message);
    }
  });

  // 2. Seed a test user via auth.admin.createUser so the FK to auth.users is satisfied.
  await step('seed test user', async () => {
    const { data: created, error } = await sb.auth.admin.createUser({
      email: TEST_EMAIL,
      password: 'SmokeP@ss123!',
      email_confirm: true,
    });
    if (error) throw new Error(`createUser: ${error.message}`);
    userId = created.user.id;
    const { error: upErr } = await sb.from('users').upsert(
      { id: userId, email: TEST_EMAIL },
      { onConflict: 'id' },
    );
    if (upErr) throw new Error(`users upsert: ${upErr.message}`);
  });

  // 3. Insert interview session.
  await step('insert interview_sessions row (status=in_progress)', async () => {
    const { data, error } = await sb.from('interview_sessions').insert({
      user_id: userId,
      topic_focus: TOPIC_FOCUS,
      status: 'in_progress',
    }).select('id, status, total_score').single();
    if (error) throw new Error(error.message);
    if (data.status !== 'in_progress') throw new Error(`unexpected status ${data.status}`);
    if (data.total_score !== 0) throw new Error(`expected total_score 0, got ${data.total_score}`);
    sessionId = data.id;
  });

  // 4. Insert 3 turns for turn_index=1.
  await step('insert 3 interview_turns rows (turn_index=1)', async () => {
    const rows = [
      { session_id: sessionId, turn_index: 1, judge: 'chairperson', question: 'Why civil services?' },
      { session_id: sessionId, turn_index: 1, judge: 'expert',      question: 'Explain Article 21 (smoke).' },
      { session_id: sessionId, turn_index: 1, judge: 'behavioural', question: 'Describe a time integrity was tested.' },
    ];
    const { data, error } = await sb.from('interview_turns').insert(rows).select('id, judge');
    if (error) throw new Error(error.message);
    if (!data || data.length !== 3) throw new Error(`expected 3 rows, got ${data?.length}`);
    for (const r of data) turnIds[r.judge] = r.id;
  });

  // 5. UNIQUE(session_id, turn_index, judge) rejects duplicate.
  await step('UNIQUE(session_id, turn_index, judge) rejects duplicate', async () => {
    const { error } = await sb.from('interview_turns').insert({
      session_id: sessionId, turn_index: 1, judge: 'chairperson', question: 'dup',
    });
    if (!error) throw new Error('expected unique-violation, got success');
  });

  // 5b. CHECK constraint rejects invalid judge.
  await step('CHECK constraint rejects invalid judge value', async () => {
    const { error } = await sb.from('interview_turns').insert({
      session_id: sessionId, turn_index: 99, judge: 'imposter', question: 'bad',
    });
    if (!error) throw new Error('expected check-violation, got success');
  });

  // 5c. CHECK constraint rejects score out of range.
  await step('CHECK constraint rejects score=11', async () => {
    const { error } = await sb.from('interview_turns').update({ score: 11 }).eq('id', turnIds.chairperson);
    if (!error) throw new Error('expected check-violation on score=11, got success');
  });

  // 6. Update each turn with answer + score + feedback.
  await step('update turns with user_answer + score + feedback', async () => {
    const updates = [
      { id: turnIds.chairperson, score: 8, feedback: 'Clear and composed.', user_answer: 'I want to serve...' },
      { id: turnIds.expert,      score: 7, feedback: 'Good but missed nuance.', user_answer: 'Article 21 protects...' },
      { id: turnIds.behavioural, score: 9, feedback: 'Strong introspection.',   user_answer: 'Once during my internship...' },
    ];
    for (const u of updates) {
      const { error } = await sb.from('interview_turns').update({
        user_answer: u.user_answer, score: u.score, feedback: u.feedback,
      }).eq('id', u.id);
      if (error) throw new Error(error.message);
    }
    // Verify.
    const { data } = await sb.from('interview_turns')
      .select('judge, score, user_answer').eq('session_id', sessionId);
    if (!data || data.length !== 3) throw new Error('row count mismatch after update');
    const sum = data.reduce((s, r) => s + (r.score ?? 0), 0);
    if (sum !== 24) throw new Error(`expected score sum 24, got ${sum}`);
  });

  // 7. Insert interview_debriefs row.
  let debriefId = null;
  await step('insert interview_debriefs row with scene_spec + arrays', async () => {
    const { data, error } = await sb.from('interview_debriefs').insert({
      session_id: sessionId,
      summary: 'Solid first attempt. Strong on integrity, average on technical depth.',
      strengths: ['Composure under pressure', 'Honest self-reflection'],
      weaknesses: ['Constitutional articles need sharper recall', 'Pace too fast on the expert turn'],
      scene_spec: sampleScene,
      render_status: 'r3f_only',
    }).select('id, scene_spec, strengths, weaknesses, render_status').single();
    if (error) throw new Error(error.message);
    if (!data.scene_spec || data.scene_spec.version !== 1) throw new Error('scene_spec missing or invalid');
    if (!Array.isArray(data.strengths) || data.strengths.length !== 2) throw new Error('strengths array malformed');
    if (!Array.isArray(data.weaknesses) || data.weaknesses.length !== 2) throw new Error('weaknesses array malformed');
    if (data.render_status !== 'r3f_only') throw new Error(`unexpected render_status ${data.render_status}`);
    debriefId = data.id;
  });

  // 8. UNIQUE(session_id) on debriefs rejects duplicate.
  await step('UNIQUE(session_id) on debriefs rejects duplicate', async () => {
    const { error } = await sb.from('interview_debriefs').insert({
      session_id: sessionId,
      summary: 'dup',
      scene_spec: sampleScene,
    });
    if (!error) throw new Error('expected unique-violation, got success');
  });

  // 8b. CHECK constraint on render_status.
  await step('CHECK render_status rejects bogus value', async () => {
    const { error } = await sb.from('interview_debriefs')
      .update({ render_status: 'imaginary' }).eq('id', debriefId);
    if (!error) throw new Error('expected check-violation on render_status, got success');
  });

  // 9. CASCADE delete: deleting the session removes turns + debrief.
  await step('CASCADE: delete session removes turns + debrief', async () => {
    const { error: dErr } = await sb.from('interview_sessions').delete().eq('id', sessionId);
    if (dErr) throw new Error(dErr.message);
    const { data: leftoverTurns } = await sb.from('interview_turns').select('id').eq('session_id', sessionId);
    if ((leftoverTurns ?? []).length > 0) throw new Error(`turns not cascaded: ${leftoverTurns.length}`);
    const { data: leftoverDebrief } = await sb.from('interview_debriefs').select('id').eq('session_id', sessionId);
    if ((leftoverDebrief ?? []).length > 0) throw new Error('debrief not cascaded');
    sessionId = null;
  });

  // 10. Cleanup user (delete auth user; FK CASCADE drops public.users row).
  await step('cleanup test user', async () => {
    if (!userId) return;
    const { error } = await sb.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
  });

  console.log(`\n— ${pass} pass / ${fail} fail —`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('UNEXPECTED', e);
  process.exit(2);
});
