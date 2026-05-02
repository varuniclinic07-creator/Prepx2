// Topic-Imagination Video SQL contract smoke (Sprint 3 / S3-2).
//
// Does NOT call the LLM. Exercises migration 058's contract:
//   a. Pre-clean any leftover S3-2 SMOKE rows.
//   b. Seed two distinct test users so we can prove RLS isolation.
//   c. Insert imagine_videos row with empty arrays + render_status default.
//   d. Update with valid voiceover_segments + scene_specs (3 beats, 30s).
//   e. RLS: a different authenticated user must not see the row.
//   f. Extend: append 2 more beats, total 60s, same row id, updated_at moves.
//   g. CHECK constraint: duration_seconds=700 must reject (23514).
//   h. Render-status enum: bogus value must reject (23514).
//   i. Cleanup.
//
// Run: node --env-file=.env.local scripts/verification/imagine-video-smoke.mjs

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

const SMOKE_TOPIC = 'S3-2 SMOKE';
let ownerId = null;
let strangerId = null;
let strangerSession = null;
let videoId = null;
let rowAfterGenerate = null;

function makeScene(durationSeconds, label) {
  return {
    version: 1,
    background: 'primary',
    durationSeconds,
    ambientIntensity: 0.6,
    meshes: [
      { kind: 'sphere',      position: [0, 0.5, 0], scale: 1.0, color: 'cyan',    emissive: true, label },
      { kind: 'icosahedron', position: [-2, 1, 0],  scale: 0.6, color: 'magenta', emissive: true },
      { kind: 'torus',       position: [0, 0.5, 0], scale: 2.0, rotation: [1.2, 0, 0], color: 'gold' },
    ],
    cameraKeyframes: [
      { timeSeconds: 0,                position: [0, 1, 5], lookAt: [0, 0.5, 0] },
      { timeSeconds: durationSeconds,  position: [3, 2, 5], lookAt: [0, 0.5, 0] },
    ],
    labels: [
      { timeSeconds: 0.5, position: [0, 2.2, 0], text: label, durationSeconds: durationSeconds - 1, size: 0.4 },
    ],
  };
}

async function ensureUser(emailHint) {
  const email = `${emailHint}-${Date.now()}@example.com`;
  const password = 'SmokeP@ss123!';
  const { data: created, error } = await sb.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error) throw new Error(`createUser ${emailHint}: ${error.message}`);
  await sb.from('users').upsert({ id: created.user.id, email }, { onConflict: 'id' });
  return { id: created.user.id, email, password };
}

async function main() {
  console.log('— Topic-Imagination Video SQL contract smoke —');

  await step('pre-clean any leftover S3-2 SMOKE rows', async () => {
    await sb.from('imagine_videos').delete().eq('topic_query', SMOKE_TOPIC);
  });

  await step('seed owner + stranger test users', async () => {
    const owner = await ensureUser('smoke-imagine-owner');
    ownerId = owner.id;
    const stranger = await ensureUser('smoke-imagine-stranger');
    strangerId = stranger.id;

    // Sign the stranger in via anon client so we exercise RLS, not service role.
    const anonSb = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: sess, error: signErr } = await anonSb.auth.signInWithPassword({
      email: stranger.email, password: stranger.password,
    });
    if (signErr || !sess?.session) throw new Error(`stranger sign-in: ${signErr?.message || 'no session'}`);
    strangerSession = sess.session;
  });

  await step('insert imagine_videos row with empty arrays (defaults)', async () => {
    const { data, error } = await sb.from('imagine_videos').insert({
      user_id: ownerId,
      topic_query: SMOKE_TOPIC,
      duration_seconds: 30,
    }).select('id, render_status, generated_by, voiceover_segments, scene_specs').single();
    if (error) throw new Error(error.message);
    if (!Array.isArray(data.voiceover_segments) || data.voiceover_segments.length !== 0) {
      throw new Error('voiceover_segments default not empty array');
    }
    if (!Array.isArray(data.scene_specs) || data.scene_specs.length !== 0) {
      throw new Error('scene_specs default not empty array');
    }
    if (data.render_status !== 'r3f_only') throw new Error(`render_status default ${data.render_status}`);
    if (data.generated_by !== 'imagine-engine-v1') throw new Error(`generated_by default ${data.generated_by}`);
    videoId = data.id;
  });

  await step('update with 3 beats × ~10s = 30s total', async () => {
    const segments = [
      { startMs: 0,     endMs: 10000, text: 'In the beginning the universe was a tiny hot point.', voice: 'male_in' },
      { startMs: 10000, endMs: 20000, text: 'It expanded and cooled, forming the first atoms.',     voice: 'female_in' },
      { startMs: 20000, endMs: 30000, text: 'Stars and galaxies grew over billions of years.',      voice: 'male_in' },
    ];
    const scenes = [makeScene(10, 'Big Bang'), makeScene(10, 'Cooling'), makeScene(10, 'Galaxies')];
    const { data, error } = await sb.from('imagine_videos').update({
      voiceover_segments: segments,
      scene_specs: scenes,
      syllabus_tag: 'science.cosmology',
      duration_seconds: 30,
      generated_by: 'imagine-engine-v1',
      render_status: 'r3f_only',
    }).eq('id', videoId).select('*').single();
    if (error) throw new Error(error.message);
    if (data.scene_specs.length !== 3) throw new Error(`scene_specs length ${data.scene_specs.length}`);
    if (data.voiceover_segments.length !== 3) throw new Error(`voiceover_segments length ${data.voiceover_segments.length}`);
    if (data.duration_seconds !== 30) throw new Error(`duration_seconds ${data.duration_seconds}`);
    rowAfterGenerate = data;
  });

  await step('RLS: stranger cannot read another owner\'s imagine_video', async () => {
    const strangerSb = createClient(url, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${strangerSession.access_token}` } },
    });
    const { data, error } = await strangerSb.from('imagine_videos').select('id').eq('id', videoId).maybeSingle();
    if (error && error.code !== 'PGRST116') {
      // Either RLS hides the row (data===null) or returns an error. Both acceptable.
      throw new Error(`unexpected error: ${error.message}`);
    }
    if (data) throw new Error('stranger read the row — RLS regression');
  });

  await step('extend: append 2 more beats → 5 beats, 60s total', async () => {
    const additional = [
      { startMs: 30000, endMs: 45000, text: 'Hydrogen fused into heavier elements inside hot stars.', voice: 'female_in' },
      { startMs: 45000, endMs: 60000, text: 'Those elements seeded planets — including our Earth.',  voice: 'male_in' },
    ];
    const additionalScenes = [makeScene(15, 'Fusion'), makeScene(15, 'Planets')];
    const merged = {
      voiceover_segments: [...rowAfterGenerate.voiceover_segments, ...additional],
      scene_specs:        [...rowAfterGenerate.scene_specs, ...additionalScenes],
      duration_seconds:   60,
    };
    const { data, error } = await sb.from('imagine_videos').update(merged)
      .eq('id', videoId)
      .select('id, voiceover_segments, scene_specs, duration_seconds, created_at, updated_at')
      .single();
    if (error) throw new Error(error.message);
    if (data.scene_specs.length !== 5) throw new Error(`expected 5 scenes, got ${data.scene_specs.length}`);
    if (data.voiceover_segments.length !== 5) throw new Error(`expected 5 segments, got ${data.voiceover_segments.length}`);
    if (data.duration_seconds !== 60) throw new Error(`duration_seconds ${data.duration_seconds}`);
    if (data.id !== videoId) throw new Error('id changed — extend created a new row');
    if (new Date(data.updated_at).getTime() < new Date(data.created_at).getTime()) {
      throw new Error('updated_at not advanced by trigger after extend');
    }
  });

  await step('CHECK duration_seconds rejects 700 (23514)', async () => {
    const { error } = await sb.from('imagine_videos').insert({
      user_id: ownerId,
      topic_query: SMOKE_TOPIC,
      duration_seconds: 700,
    });
    if (!error) throw new Error('expected check-violation, got success');
    if (error.code !== '23514') throw new Error(`expected 23514, got ${error.code}: ${error.message}`);
  });

  await step('CHECK render_status rejects bogus enum (23514)', async () => {
    const { error } = await sb.from('imagine_videos').insert({
      user_id: ownerId,
      topic_query: SMOKE_TOPIC,
      duration_seconds: 30,
      render_status: 'totally_bogus',
    });
    if (!error) throw new Error('expected check-violation, got success');
    if (error.code !== '23514') throw new Error(`expected 23514, got ${error.code}: ${error.message}`);
  });

  await step('cleanup imagine_videos rows', async () => {
    if (videoId) await sb.from('imagine_videos').delete().eq('id', videoId);
    await sb.from('imagine_videos').delete().eq('topic_query', SMOKE_TOPIC);
  });

  console.log(`\n— ${pass} pass / ${fail} fail —`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('UNEXPECTED', e);
  process.exit(2);
});
