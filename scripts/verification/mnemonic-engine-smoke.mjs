// Mnemonic Engine v2 SQL contract smoke (Sprint 3, S3-1).
//
// Does NOT call the LLM. Exercises migration 057's contract:
//   1. Pre-clean any test rows by topic_query='S3-1 SMOKE'
//   2. Seed a topic in `topics` (title='S3-1 SMOKE TOPIC')
//   3. Insert 4 mnemonic_artifacts rows (acronym/story/rhyme/visual) with
//      valid scene_specs, render_status='r3f_only'
//   4. Validate each scene_spec passes a structural check matching parseSceneSpec
//   5. Insert a mnemonic_ratings row for one artifact + assert UNIQUE
//      (mnemonic_id, user_id) blocks duplicate
//   6. Cleanup all test rows
//
// Run: node --env-file=.env.local scripts/verification/mnemonic-engine-smoke.mjs

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(2);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

let pass = 0, fail = 0;
function ok(name)        { pass++; console.log(`  PASS  ${name}`); }
function bad(name, err)  { fail++; console.error(`  FAIL  ${name}: ${err}`); }
async function step(name, fn) {
  try { await fn(); ok(name); } catch (e) { bad(name, e?.message || String(e)); }
}

// Inline mirror of parseSceneSpec — keeps the mjs smoke self-contained.
function isValidSceneSpec(raw) {
  if (!raw || typeof raw !== 'object') return false;
  if (raw.version !== 1) return false;
  if (!Array.isArray(raw.meshes) || !Array.isArray(raw.cameraKeyframes) || !Array.isArray(raw.labels)) return false;
  if (typeof raw.durationSeconds !== 'number' || raw.durationSeconds <= 0) return false;
  return true;
}

function buildScene(seed) {
  const dur = 15;
  return {
    version: 1,
    background: 'primary',
    durationSeconds: dur,
    meshes: [
      { kind: 'sphere',      position: [-2, 0, 0], color: 'cyan',    emissive: true,  label: `${seed}-A` },
      { kind: 'box',         position: [0, 0, 0],  color: 'primary', emissive: false, label: `${seed}-B` },
      { kind: 'icosahedron', position: [2, 0, 0],  color: 'saffron', emissive: true,  label: `${seed}-C` },
    ],
    cameraKeyframes: [
      { timeSeconds: 0,    position: [0, 1, 6], lookAt: [0, 0, 0] },
      { timeSeconds: dur,  position: [4, 2, 6], lookAt: [0, 0, 0] },
    ],
    labels: [
      { timeSeconds: 1, position: [0, 1.5, 0],  text: 'one',   durationSeconds: 4 },
      { timeSeconds: 5, position: [0, 1.5, 0],  text: 'two',   durationSeconds: 4 },
      { timeSeconds: 9, position: [0, 1.5, 0],  text: 'three', durationSeconds: 4 },
    ],
    ambientIntensity: 0.6,
  };
}

const TOPIC_QUERY = 'S3-1 SMOKE';
const TOPIC_TITLE = 'S3-1 SMOKE TOPIC';
let topicId = null;
let userId = null;
const artifactIds = [];

async function main() {
  console.log('— Mnemonic Engine v2 SQL contract smoke —');

  await step('pre-clean any leftover smoke artifacts', async () => {
    await sb.from('mnemonic_artifacts').delete().eq('topic_query', TOPIC_QUERY);
    // Topics are deleted at the end; if a prior run aborted, sweep them too.
    await sb.from('topics').delete().eq('title', TOPIC_TITLE);
  });

  await step('seed topic row', async () => {
    const { data, error } = await sb.from('topics').insert({
      title: TOPIC_TITLE,
      subject: 'polity',
      content: { sections: [], summary: 'smoke', keyPoints: [] },
    }).select('id').single();
    if (error) throw new Error(error.message);
    if (!data?.id) throw new Error('no topic id returned');
    topicId = data.id;
  });

  await step('seed user for ratings owner', async () => {
    const { data: u } = await sb.from('users').select('id').limit(1).maybeSingle();
    if (u?.id) { userId = u.id; return; }
    const email = `smoke-mnemonic-${Date.now()}@example.com`;
    const { data: created, error } = await sb.auth.admin.createUser({
      email,
      password: 'SmokeP@ss123!',
      email_confirm: true,
    });
    if (error) throw new Error(`createUser: ${error.message}`);
    userId = created.user.id;
    await sb.from('users').upsert({ id: userId, email }, { onConflict: 'id' });
  });

  await step('insert 4 mnemonic_artifacts rows (acronym/story/rhyme/visual)', async () => {
    const styles = ['acronym', 'story', 'rhyme', 'visual'];
    const rows = styles.map((style) => ({
      topic_id: topicId,
      user_id: null,
      topic_query: TOPIC_QUERY,
      style,
      text: `${style.toUpperCase()} mnemonic for smoke topic`,
      explanation: `Why ${style} works`,
      scene_spec: buildScene(style),
      render_status: 'r3f_only',
      generated_by: 'smoke-test',
    }));
    const { data, error } = await sb.from('mnemonic_artifacts')
      .insert(rows)
      .select('id, style, scene_spec, render_status');
    if (error) throw new Error(error.message);
    if (!data || data.length !== 4) throw new Error(`expected 4 rows, got ${data?.length}`);
    for (const row of data) artifactIds.push(row.id);
  });

  await step('every inserted scene_spec passes structural validation', async () => {
    const { data, error } = await sb.from('mnemonic_artifacts')
      .select('style, scene_spec')
      .in('id', artifactIds);
    if (error) throw new Error(error.message);
    if (!data || data.length !== 4) throw new Error('round-trip expected 4 rows');
    for (const row of data) {
      if (!isValidSceneSpec(row.scene_spec)) {
        throw new Error(`scene_spec for ${row.style} failed validation`);
      }
    }
  });

  await step('CHECK constraint rejects invalid style', async () => {
    const { error } = await sb.from('mnemonic_artifacts').insert({
      topic_id: topicId,
      user_id: null,
      topic_query: TOPIC_QUERY,
      style: 'bogus',
      text: 'x',
      explanation: 'x',
      scene_spec: buildScene('bogus'),
      render_status: 'r3f_only',
    });
    if (!error) throw new Error('expected check-violation, got success');
    if (error.code !== '23514') throw new Error(`expected 23514, got ${error.code}: ${error.message}`);
  });

  await step('CHECK constraint rejects invalid render_status', async () => {
    const { error } = await sb.from('mnemonic_artifacts').insert({
      topic_id: topicId,
      user_id: null,
      topic_query: TOPIC_QUERY,
      style: 'acronym',
      text: 'x',
      explanation: 'x',
      scene_spec: buildScene('badstatus'),
      render_status: 'on_fire',
    });
    if (!error) throw new Error('expected check-violation, got success');
    if (error.code !== '23514') throw new Error(`expected 23514, got ${error.code}: ${error.message}`);
  });

  await step('insert a rating row', async () => {
    const { error } = await sb.from('mnemonic_ratings').insert({
      mnemonic_id: artifactIds[0],
      user_id: userId,
      rating: 4,
      comment: 'smoke',
    });
    if (error) throw new Error(error.message);
  });

  await step('UNIQUE (mnemonic_id, user_id) rejects duplicate (23505)', async () => {
    const { error } = await sb.from('mnemonic_ratings').insert({
      mnemonic_id: artifactIds[0],
      user_id: userId,
      rating: 5,
    });
    if (!error) throw new Error('expected unique-violation, got success');
    if (error.code !== '23505') throw new Error(`expected 23505, got ${error.code}: ${error.message}`);
  });

  await step('rating CHECK rejects out-of-range value', async () => {
    const { error } = await sb.from('mnemonic_ratings').insert({
      mnemonic_id: artifactIds[1],
      user_id: userId,
      rating: 7,
    });
    if (!error) throw new Error('expected check-violation, got success');
    if (error.code !== '23514') throw new Error(`expected 23514, got ${error.code}: ${error.message}`);
  });

  await step('cleanup', async () => {
    // Delete topic — ON DELETE CASCADE removes mnemonic_artifacts and (via
    // mnemonic_artifacts CASCADE) mnemonic_ratings.
    if (topicId) await sb.from('topics').delete().eq('id', topicId);
    // Belt-and-braces in case some rows had topic_id NULL from a prior partial run.
    await sb.from('mnemonic_artifacts').delete().eq('topic_query', TOPIC_QUERY);
  });

  console.log(`\n— ${pass} pass / ${fail} fail —`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('UNEXPECTED', e);
  process.exit(2);
});
