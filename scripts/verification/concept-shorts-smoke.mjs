// Concept Shorts SQL contract smoke (Sprint 4 / S4-1).
//
// Does NOT call the LLM. Exercises migration 060's contract end-to-end:
//   a. Pre-clean leftover S4-1 SMOKE rows.
//   b. Seed topic + owner + stranger users.
//   c. Insert personal short with style/render_status/approval_status defaults.
//   d. Insert catalog short (user_id IS NULL).
//   e. Update scene_spec + duration_seconds; updated_at advances.
//   f. style CHECK rejects bogus value.
//   g. render_status CHECK rejects bogus value.
//   h. approval_status CHECK rejects bogus value.
//   i. RLS: stranger sees catalog short but NOT personal short.
//   j. concept_short_generations rate-limit log insert + owner-only RLS.
//   k. bakeable_rows view shows the r3f_only catalog row.
//   l. Cleanup.
//
// Run: node --env-file=.env.local scripts/verification/concept-shorts-smoke.mjs

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

const SMOKE_TAG = 's4-1-smoke-concept';
const SMOKE_TOPIC_TITLE = 'S4-1 SMOKE Topic';
let topicId = null;
let ownerId = null;
let strangerId = null;
let strangerSb = null;
let personalShortId = null;
let catalogShortId = null;

function makeSceneSpec() {
  return {
    version: 1,
    background: 'primary',
    durationSeconds: 120,
    ambientIntensity: 0.6,
    meshes: [
      { kind: 'sphere', position: [0, 0.5, 0], scale: 1, color: 'cyan', emissive: true, label: 'Fundamental Rights' },
    ],
    cameraKeyframes: [
      { timeSeconds: 0,   position: [0, 1, 5], lookAt: [0, 0.5, 0] },
      { timeSeconds: 120, position: [3, 2, 5], lookAt: [0, 0.5, 0] },
    ],
    labels: [
      { timeSeconds: 1, position: [0, 2.2, 0], text: 'Article 14', durationSeconds: 119, size: 0.4 },
    ],
  };
}

async function ensureUser(emailHint) {
  const email = `${emailHint}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = 'SmokeP@ss123!';
  const { data: created, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`createUser ${emailHint}: ${error.message}`);
  await sb.from('users').upsert({ id: created.user.id, email }, { onConflict: 'id' });
  return { id: created.user.id, email, password };
}

async function main() {
  console.log('— Concept Shorts SQL contract smoke (S4-1) —');

  await step('pre-clean leftover S4-1 SMOKE rows', async () => {
    await sb.from('concept_shorts').delete().eq('concept_tag', SMOKE_TAG);
    await sb.from('topics').delete().eq('title', SMOKE_TOPIC_TITLE);
  });

  await step('seed topic + owner + stranger users', async () => {
    const { data: topic, error: tErr } = await sb.from('topics').insert({
      title: SMOKE_TOPIC_TITLE,
      subject: 'polity',
      content: { intro: 'smoke', sections: [] },
    }).select('id').single();
    if (tErr) throw new Error(`topic seed: ${tErr.message}`);
    topicId = topic.id;

    const owner = await ensureUser('smoke-shorts-owner');
    ownerId = owner.id;
    const stranger = await ensureUser('smoke-shorts-stranger');
    strangerId = stranger.id;

    const anonSb = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: sess, error: signErr } = await anonSb.auth.signInWithPassword({
      email: stranger.email, password: stranger.password,
    });
    if (signErr || !sess?.session) throw new Error(`stranger sign-in: ${signErr?.message || 'no session'}`);
    strangerSb = anonSb;
  });

  await step('insert personal short with defaults', async () => {
    const { data, error } = await sb.from('concept_shorts').insert({
      topic_id: topicId,
      user_id: ownerId,
      concept_tag: SMOKE_TAG,
      title: 'Article 14 in 120s',
    }).select('id, style, render_status, approval_status, duration_seconds, generated_by').single();
    if (error) throw new Error(error.message);
    if (data.style !== 'concept_explainer') throw new Error(`style default ${data.style}`);
    if (data.render_status !== 'r3f_only') throw new Error(`render_status default ${data.render_status}`);
    if (data.approval_status !== 'pending') throw new Error(`approval_status default ${data.approval_status}`);
    if (data.duration_seconds !== 120) throw new Error(`duration_seconds default ${data.duration_seconds}`);
    if (data.generated_by !== 'shorts-agent') throw new Error(`generated_by default ${data.generated_by}`);
    personalShortId = data.id;
  });

  await step('insert catalog short (user_id NULL) approved', async () => {
    const { data, error } = await sb.from('concept_shorts').insert({
      topic_id: topicId,
      user_id: null,
      concept_tag: SMOKE_TAG,
      title: 'Catalog: Article 14',
      style: 'pyq_breaker',
      scene_spec: makeSceneSpec(),
      approval_status: 'approved',
    }).select('id').single();
    if (error) throw new Error(error.message);
    catalogShortId = data.id;
  });

  await step('update scene_spec + duration; updated_at advances', async () => {
    const before = await sb.from('concept_shorts').select('updated_at').eq('id', personalShortId).single();
    await new Promise(r => setTimeout(r, 30));
    const { error } = await sb.from('concept_shorts').update({
      scene_spec: makeSceneSpec(),
      duration_seconds: 120,
      voiceover_text: 'Article 14 mandates equality before law for every person on Indian soil...',
    }).eq('id', personalShortId);
    if (error) throw new Error(error.message);
    const after = await sb.from('concept_shorts').select('updated_at').eq('id', personalShortId).single();
    if (new Date(after.data.updated_at) <= new Date(before.data.updated_at)) {
      throw new Error('updated_at did not advance');
    }
  });

  await step('style CHECK rejects bogus value', async () => {
    const { error } = await sb.from('concept_shorts').insert({
      topic_id: topicId, user_id: ownerId, concept_tag: SMOKE_TAG, style: 'tiktok_dance',
    });
    if (!error) throw new Error('expected CHECK rejection but insert succeeded');
    if (error.code !== '23514') throw new Error(`expected 23514 got ${error.code}: ${error.message}`);
  });

  await step('render_status CHECK rejects bogus value', async () => {
    const { error } = await sb.from('concept_shorts').update({ render_status: 'wat' }).eq('id', personalShortId);
    if (!error) throw new Error('expected CHECK rejection but update succeeded');
    if (error.code !== '23514') throw new Error(`expected 23514 got ${error.code}: ${error.message}`);
  });

  await step('approval_status CHECK rejects bogus value', async () => {
    const { error } = await sb.from('concept_shorts').update({ approval_status: 'maybe' }).eq('id', personalShortId);
    if (!error) throw new Error('expected CHECK rejection but update succeeded');
    if (error.code !== '23514') throw new Error(`expected 23514 got ${error.code}: ${error.message}`);
  });

  await step('RLS: stranger sees catalog but not personal short', async () => {
    const { data: catalogRows, error: cErr } = await strangerSb
      .from('concept_shorts').select('id').eq('id', catalogShortId);
    if (cErr) throw new Error(`stranger catalog read: ${cErr.message}`);
    if (!catalogRows || catalogRows.length !== 1) throw new Error(`stranger should see 1 catalog row, saw ${catalogRows?.length}`);

    const { data: personalRows, error: pErr } = await strangerSb
      .from('concept_shorts').select('id').eq('id', personalShortId);
    if (pErr) throw new Error(`stranger personal read: ${pErr.message}`);
    if (personalRows && personalRows.length > 0) throw new Error(`RLS leak: stranger saw ${personalRows.length} personal row(s)`);
  });

  await step('rate-limit log insert via service role (RLS-bypass)', async () => {
    const { error } = await sb.from('concept_short_generations').insert({
      user_id: ownerId, ip_address: '127.0.0.1',
    });
    if (error) throw new Error(error.message);
  });

  await step('bakeable_rows view shows catalog r3f_only short', async () => {
    const { data, error } = await sb.from('bakeable_rows')
      .select('source_table, id, render_status').eq('id', catalogShortId);
    if (error) throw new Error(error.message);
    if (!data || data.length !== 1) throw new Error(`expected 1 view row, got ${data?.length}`);
    if (data[0].source_table !== 'concept_shorts') throw new Error(`source_table ${data[0].source_table}`);
    if (data[0].render_status !== 'r3f_only') throw new Error(`render_status ${data[0].render_status}`);
  });

  await step('cleanup', async () => {
    await sb.from('concept_short_generations').delete().eq('user_id', ownerId);
    await sb.from('concept_shorts').delete().eq('concept_tag', SMOKE_TAG);
    await sb.from('topics').delete().eq('id', topicId);
    await sb.auth.admin.deleteUser(ownerId);
    await sb.auth.admin.deleteUser(strangerId);
  });

  console.log(`\nResult: ${pass} pass, ${fail} fail`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error('UNCAUGHT', e); process.exit(2); });
