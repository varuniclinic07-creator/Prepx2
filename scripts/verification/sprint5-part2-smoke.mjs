// Sprint 5 part-2 SQL contract smoke — covers migrations 067 + 068.
//
//   study_recommendations (067):
//     1) insert with new columns (headline, action_steps JSONB, focus_subjects[], confidence, expires_at)
//     2) JSONB roundtrip & TEXT[] roundtrip
//     3) cleanup
//
//   podcast_episodes audio storage (068):
//     4) insert episode with audio_path + signed_url_expires_at
//     5) podcasts bucket exists and is private
//     6) signed URL mint + read works (writes a tiny mp3 then reads via signed URL)
//
// Run: node --env-file=.env.local scripts/verification/sprint5-part2-smoke.mjs

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

const stamp = Date.now();
const email = `sprint5p2-${stamp}@prepx-smoke.test`;
let userId = null;
let recId = null;
let episodeId = null;
let storagePath = null;

try {
  const { data: au, error: auErr } = await sb.auth.admin.createUser({
    email, password: 'Sprint5P2Smoke!23', email_confirm: true,
  });
  if (auErr || !au.user) throw new Error(`createUser: ${auErr?.message}`);
  userId = au.user.id;
  ok('seed user');

  // 1) Insert study_recommendations row exercising new columns.
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const actionSteps = [
    { title: 'Drill polity weekly tests', detail: 'Severity 4/5', href: '/dashboard' },
    { title: 'Write 2 mains intros', detail: 'Lowest dim is structure' },
  ];
  const { data: rec, error: recErr } = await sb
    .from('study_recommendations')
    .insert({
      user_id: userId,
      headline: 'Polity careless errors are bleeding 8-10 marks per paper.',
      diagnosis: '7 quizzes, avg 62%. 3 weak areas. Mains structure 5.5/10.',
      action_steps: actionSteps,
      focus_subjects: ['polity', 'economy'],
      confidence: 0.78,
      source_window_days: 30,
      expires_at: expires,
      updated_at: new Date().toISOString(),
    })
    .select('id, headline, action_steps, focus_subjects, confidence, expires_at')
    .single();
  if (recErr || !rec) throw new Error(`insert rec: ${recErr?.message}`);
  recId = rec.id;
  if (rec.headline.length < 10) throw new Error('headline missing');
  if (!Array.isArray(rec.action_steps) || rec.action_steps.length !== 2) throw new Error('action_steps roundtrip failed');
  if (!Array.isArray(rec.focus_subjects) || rec.focus_subjects[0] !== 'polity') throw new Error('focus_subjects roundtrip failed');
  if (Math.abs(rec.confidence - 0.78) > 0.01) throw new Error('confidence roundtrip mismatch');
  if (!rec.expires_at) throw new Error('expires_at missing');
  ok('study_recommendations new columns roundtrip');

  // 2) JSONB nested object roundtrip
  const step0 = rec.action_steps[0];
  if (step0.title !== actionSteps[0].title || step0.href !== actionSteps[0].href) {
    throw new Error('JSONB action_steps deep roundtrip failed');
  }
  ok('action_steps JSONB deep roundtrip');

  // 3) Index on (user_id, created_at DESC) is queryable
  const { data: recRecent, error: recRecentErr } = await sb
    .from('study_recommendations')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (recRecentErr) throw new Error(`recent query: ${recRecentErr.message}`);
  if (!recRecent || recRecent.length !== 1) throw new Error('recent query did not return seeded row');
  ok('study_recommendations recent-row index path');

  // 4) Insert podcast episode with new audio_path + signed_url_expires_at columns
  const today = new Date().toISOString().slice(0, 10);
  storagePath = `${userId}/${today}.mp3`;
  const { data: ep, error: epErr } = await sb
    .from('podcast_episodes')
    .insert({
      user_id: userId,
      date: today,
      script_text: 'Test podcast script.',
      status: 'completed',
      audio_path: storagePath,
      signed_url_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    })
    .select('id, audio_path, signed_url_expires_at, status')
    .single();
  if (epErr || !ep) throw new Error(`insert episode: ${epErr?.message}`);
  episodeId = ep.id;
  if (ep.audio_path !== storagePath) throw new Error('audio_path roundtrip failed');
  if (!ep.signed_url_expires_at) throw new Error('signed_url_expires_at missing');
  ok('podcast_episodes new columns roundtrip');

  // 5) podcasts bucket exists and is private
  const { data: buckets, error: bucketsErr } = await sb.storage.listBuckets();
  if (bucketsErr) throw new Error(`listBuckets: ${bucketsErr.message}`);
  const podcastsBucket = buckets.find((b) => b.id === 'podcasts');
  if (!podcastsBucket) throw new Error('podcasts bucket missing');
  if (podcastsBucket.public) throw new Error('podcasts bucket is public — must be private');
  ok('podcasts bucket exists & is private');

  // 6) Upload + sign + fetch round-trip
  const fakeMp3 = Buffer.from([0xff, 0xfb, 0x90, 0x00]); // minimal MP3 header bytes
  const { error: upErr } = await sb.storage.from('podcasts').upload(storagePath, fakeMp3, {
    contentType: 'audio/mpeg',
    upsert: true,
  });
  if (upErr) throw new Error(`upload: ${upErr.message}`);

  const { data: signed, error: signErr } = await sb.storage
    .from('podcasts')
    .createSignedUrl(storagePath, 60);
  if (signErr || !signed?.signedUrl) throw new Error(`sign: ${signErr?.message}`);

  const res = await fetch(signed.signedUrl);
  if (!res.ok) throw new Error(`signed URL fetch returned ${res.status}`);
  const fetched = Buffer.from(await res.arrayBuffer());
  if (fetched.length !== fakeMp3.length) {
    throw new Error(`signed URL body mismatch: got ${fetched.length} bytes, expected ${fakeMp3.length}`);
  }
  ok('podcasts upload + signed URL fetch roundtrip');
} catch (e) {
  bad('sprint5-part2 suite', e instanceof Error ? e.message : String(e));
} finally {
  if (recId) await sb.from('study_recommendations').delete().eq('id', recId);
  if (episodeId) await sb.from('podcast_episodes').delete().eq('id', episodeId);
  if (storagePath) {
    try { await sb.storage.from('podcasts').remove([storagePath]); } catch {}
  }
  if (userId) {
    await sb.from('study_recommendations').delete().eq('user_id', userId);
    await sb.from('podcast_episodes').delete().eq('user_id', userId);
    try { await sb.auth.admin.deleteUser(userId); } catch {}
  }
  ok('cleanup');
}

console.log(`\nSprint 5 part-2 smoke: ${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
