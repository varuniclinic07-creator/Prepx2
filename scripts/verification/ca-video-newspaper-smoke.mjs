// CA Video Newspaper SQL contract smoke (Sprint 4 / S4-2).
//
// Does NOT call the LLM. Exercises migration 061's contract end-to-end:
//   a. Pre-clean leftover S4-2 SMOKE rows.
//   b. Seed parent ca_daily_bundles row (UNIQUE on bundle_date).
//   c. Insert ca_video_newspapers row with defaults (render_status, approval_status, duration_seconds=300).
//   d. UNIQUE on bundle_id rejects a second video newspaper for the same bundle.
//   e. Update scene_specs + script_text; updated_at advances.
//   f. render_status CHECK rejects bogus value.
//   g. approval_status CHECK rejects bogus value.
//   h. Authenticated user can SELECT only when approval_status='approved'.
//   i. CASCADE: delete bundle deletes the video newspaper.
//   j. bakeable_rows view picks up an r3f_only ca_video_newspapers row.
//   k. Cleanup.
//
// Run: node --env-file=.env.local scripts/verification/ca-video-newspaper-smoke.mjs

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

// Use a date far in the future so we never collide with real bundles.
const SMOKE_BUNDLE_DATE = '2099-04-15';
const SMOKE_THEME = 'S4-2 SMOKE Theme';
let bundleId = null;
let videoId = null;
let viewerId = null;
let viewerSb = null;

function makeSceneSpec(label) {
  return {
    version: 1,
    background: 'primary',
    durationSeconds: 30,
    ambientIntensity: 0.6,
    meshes: [{ kind: 'sphere', position: [0, 0.5, 0], scale: 1, color: 'cyan', emissive: true, label }],
    cameraKeyframes: [
      { timeSeconds: 0,  position: [0, 1, 5], lookAt: [0, 0.5, 0] },
      { timeSeconds: 30, position: [3, 2, 5], lookAt: [0, 0.5, 0] },
    ],
    labels: [{ timeSeconds: 0.5, position: [0, 2.2, 0], text: label, durationSeconds: 29, size: 0.4 }],
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
  console.log('— CA Video Newspaper SQL contract smoke (S4-2) —');

  await step('pre-clean leftover S4-2 SMOKE rows', async () => {
    // ON DELETE CASCADE on bundle_id will sweep ca_video_newspapers too.
    await sb.from('ca_daily_bundles').delete().eq('bundle_date', SMOKE_BUNDLE_DATE);
  });

  await step('seed parent ca_daily_bundles row', async () => {
    const { data, error } = await sb.from('ca_daily_bundles').insert({
      bundle_date: SMOKE_BUNDLE_DATE,
      theme: SMOKE_THEME,
      summary: 'Smoke bundle for CA video newspaper contract test.',
      syllabus_tags: ['polity.constitution'],
      status: 'published',
      article_count: 3,
    }).select('id').single();
    if (error) throw new Error(error.message);
    bundleId = data.id;
  });

  await step('insert ca_video_newspapers row with defaults', async () => {
    const { data, error } = await sb.from('ca_video_newspapers').insert({
      bundle_id: bundleId,
      bundle_date: SMOKE_BUNDLE_DATE,
      title: 'Daily CA Video Newspaper — Smoke',
      theme: SMOKE_THEME,
      generated_by: 'ca-video-script-writer-v1',
    }).select('id, render_status, approval_status, duration_seconds').single();
    if (error) throw new Error(error.message);
    if (data.render_status !== 'r3f_only') throw new Error(`render_status default ${data.render_status}`);
    if (data.approval_status !== 'pending') throw new Error(`approval_status default ${data.approval_status}`);
    if (data.duration_seconds !== 300) throw new Error(`duration_seconds default ${data.duration_seconds}`);
    videoId = data.id;
  });

  await step('UNIQUE on bundle_id rejects a second video newspaper', async () => {
    const { error } = await sb.from('ca_video_newspapers').insert({
      bundle_id: bundleId,
      bundle_date: SMOKE_BUNDLE_DATE,
      title: 'Duplicate',
    });
    if (!error) throw new Error('expected UNIQUE rejection but insert succeeded');
    if (error.code !== '23505') throw new Error(`expected 23505 got ${error.code}: ${error.message}`);
  });

  await step('update scene_specs + script_text; updated_at advances', async () => {
    const before = await sb.from('ca_video_newspapers').select('updated_at').eq('id', videoId).single();
    await new Promise(r => setTimeout(r, 30));
    const { error } = await sb.from('ca_video_newspapers').update({
      script_text: 'Today\'s top story: Constitution Day. Article 14 mandates equality before law...',
      script_markers: { sections: [{ start: 0, end: 60, label: 'intro' }] },
      scene_specs: [makeSceneSpec('Constitution'), makeSceneSpec('Equality')],
    }).eq('id', videoId);
    if (error) throw new Error(error.message);
    const after = await sb.from('ca_video_newspapers').select('updated_at').eq('id', videoId).single();
    if (new Date(after.data.updated_at) <= new Date(before.data.updated_at)) {
      throw new Error('updated_at did not advance');
    }
  });

  await step('render_status CHECK rejects bogus value', async () => {
    const { error } = await sb.from('ca_video_newspapers').update({ render_status: 'wat' }).eq('id', videoId);
    if (!error) throw new Error('expected CHECK rejection');
    if (error.code !== '23514') throw new Error(`expected 23514 got ${error.code}: ${error.message}`);
  });

  await step('approval_status CHECK rejects bogus value', async () => {
    const { error } = await sb.from('ca_video_newspapers').update({ approval_status: 'maybe' }).eq('id', videoId);
    if (!error) throw new Error('expected CHECK rejection');
    if (error.code !== '23514') throw new Error(`expected 23514 got ${error.code}: ${error.message}`);
  });

  await step('RLS: viewer sees row only after approved', async () => {
    const viewer = await ensureUser('smoke-cavideo-viewer');
    viewerId = viewer.id;
    const anonSb = createClient(url, anonKey, { auth: { persistSession: false } });
    const { error: signErr } = await anonSb.auth.signInWithPassword({
      email: viewer.email, password: viewer.password,
    });
    if (signErr) throw new Error(`viewer sign-in: ${signErr.message}`);
    viewerSb = anonSb;

    const before = await viewerSb.from('ca_video_newspapers').select('id').eq('id', videoId);
    if (before.error) throw new Error(`pre-approval read: ${before.error.message}`);
    if (before.data && before.data.length !== 0) throw new Error(`viewer should not see pending row, saw ${before.data.length}`);

    await sb.from('ca_video_newspapers').update({ approval_status: 'approved' }).eq('id', videoId);

    const after = await viewerSb.from('ca_video_newspapers').select('id').eq('id', videoId);
    if (after.error) throw new Error(`post-approval read: ${after.error.message}`);
    if (!after.data || after.data.length !== 1) throw new Error(`viewer should see 1 approved row, saw ${after.data?.length}`);
  });

  await step('bakeable_rows view picks up r3f_only row', async () => {
    // Flip back to r3f_only to test the view (it currently is r3f_only because we didn't change it).
    await sb.from('ca_video_newspapers').update({ render_status: 'r3f_only' }).eq('id', videoId);
    const { data, error } = await sb.from('bakeable_rows')
      .select('source_table, id, render_status').eq('id', videoId);
    if (error) throw new Error(error.message);
    if (!data || data.length !== 1) throw new Error(`expected 1 view row, got ${data?.length}`);
    if (data[0].source_table !== 'ca_video_newspapers') throw new Error(`source_table ${data[0].source_table}`);
  });

  await step('CASCADE: delete bundle deletes video newspaper', async () => {
    const { error } = await sb.from('ca_daily_bundles').delete().eq('id', bundleId);
    if (error) throw new Error(error.message);
    const { data } = await sb.from('ca_video_newspapers').select('id').eq('id', videoId);
    if (data && data.length > 0) throw new Error(`CASCADE leak: ${data.length} row(s) survived`);
    bundleId = null;
    videoId = null;
  });

  await step('cleanup', async () => {
    if (bundleId) await sb.from('ca_daily_bundles').delete().eq('id', bundleId);
    if (viewerId) await sb.auth.admin.deleteUser(viewerId);
  });

  console.log(`\nResult: ${pass} pass, ${fail} fail`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error('UNCAUGHT', e); process.exit(2); });
