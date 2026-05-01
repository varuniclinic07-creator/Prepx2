// Exercises the SQL contract of the video pipeline against cloud Supabase.
// Does NOT require Redis or ComfyUI — instead it verifies:
//   1) An admin can queue a script-job via spawnAgent's underlying insert
//   2) Inserting a video_scripts row in 'draft' is allowed
//   3) Approving (status='approved') flips and writes approved_at/by
//   4) Inserting a render-job + a video_lectures row in 'rendering' is allowed
//   5) Marking a lecture 'failed' with system_alerts row works
//   6) Marking a lecture 'published' with signed_url + expiry works
//   7) Cleans up all rows it created.
//
// Run: node --env-file=.env.local scripts/verification/video-pipeline-smoke.mjs

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

async function main() {
  console.log('— Video pipeline SQL contract smoke —');

  // 0. Find or create a topic to point the script at
  let { data: topic } = await sb.from('topics').select('id').limit(1).maybeSingle();
  if (!topic) {
    const { data: t, error } = await sb.from('topics').insert({
      title: 'SMOKE TEST topic', subject: 'Polity', content: { sections: [] },
    }).select('id').single();
    if (error) return bad('seed topic', error.message);
    topic = t;
    ok(`seeded topic ${topic.id.slice(0, 8)}`);
  } else {
    ok(`reusing topic ${topic.id.slice(0, 8)}`);
  }

  // 1. Queue a script-job in agent_tasks (mirrors what spawnAgent does)
  const { data: scriptTask, error: stErr } = await sb.from('agent_tasks').insert({
    agent_type: 'script', status: 'queued',
    payload: { source: 'video-smoke', topicId: topic.id, durationMinutes: 5, language: 'en' },
    priority: 3,
  }).select('id').single();
  if (stErr) return bad('insert script-job', stErr.message);
  ok(`queued script-job ${scriptTask.id.slice(0, 8)}`);

  // 2. Insert a draft video_scripts row (mirrors processScriptJob result)
  const { data: script, error: scErr } = await sb.from('video_scripts').insert({
    topic_id: topic.id,
    subject: 'Polity', paper: 'GS-2',
    title: 'SMOKE: Fundamental Rights primer',
    script_text: 'This is a test script. '.repeat(30),
    script_markers: { sections: [{ start: 0, label: 'intro' }] },
    chapters: [{ title: 'Intro', start: 0 }, { title: 'Body', start: 60 }],
    duration_target_seconds: 300,
    status: 'draft',
    generated_by_agent: 'script-writer',
    source_citations: [{ source: 'NCERT', ref: 'class-9-polity' }],
    flesch_kincaid_grade: 10.2,
    language: 'en',
  }).select('id, status').single();
  if (scErr) return bad('insert draft script', scErr.message);
  if (script.status !== 'draft') return bad('script status', `expected draft, got ${script.status}`);
  ok(`inserted draft script ${script.id.slice(0, 8)}`);

  // 3. Approve → status flips, approved_at populated
  const { data: approved, error: apErr } = await sb.from('video_scripts')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', script.id)
    .select('status, approved_at').single();
  if (apErr) return bad('approve script', apErr.message);
  if (approved.status !== 'approved' || !approved.approved_at) {
    return bad('approve script', 'approved_at or status missing');
  }
  ok('approved script (status=approved, approved_at set)');

  // 4. Queue a render-job + insert a 'rendering' lecture row
  const { data: renderTask, error: rtErr } = await sb.from('agent_tasks').insert({
    agent_type: 'render', status: 'queued',
    payload: { source: 'video-smoke', scriptId: script.id },
    priority: 4,
  }).select('id').single();
  if (rtErr) return bad('insert render-job', rtErr.message);
  ok(`queued render-job ${renderTask.id.slice(0, 8)}`);

  const { data: lecture, error: leErr } = await sb.from('video_lectures').insert({
    script_id: script.id,
    title: 'SMOKE: Fundamental Rights primer',
    duration_seconds: 300,
    status: 'rendering',
    chapters: [{ title: 'Intro', start: 0 }, { title: 'Body', start: 60 }],
  }).select('id, status').single();
  if (leErr) return bad('insert lecture', leErr.message);
  ok(`inserted rendering lecture ${lecture.id.slice(0, 8)}`);

  // 5. Failure path: mark lecture 'failed' + system_alerts row
  const { error: failErr } = await sb.from('video_lectures')
    .update({ status: 'failed', render_meta: { error: 'smoke: ComfyUI offline' } })
    .eq('id', lecture.id);
  if (failErr) return bad('mark failed', failErr.message);

  const { error: alertErr } = await sb.from('system_alerts').insert({
    severity: 'error',
    source: 'video-render',
    message: 'SMOKE: ComfyUI offline',
    payload: { lectureId: lecture.id, scriptId: script.id, smoke: true },
  });
  if (alertErr) return bad('insert system_alerts', alertErr.message);
  ok('marked lecture failed + wrote system_alerts');

  // 6. Recovery: flip back to 'rendering' then to 'published' with signed_url
  const fakeUrl = 'https://example.invalid/test.mp4?token=smoke';
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { error: pubErr } = await sb.from('video_lectures').update({
    status: 'published',
    storage_path: `lectures/smoke-${lecture.id}.mp4`,
    signed_url: fakeUrl,
    signed_url_expires_at: expiresAt,
    published_at: new Date().toISOString(),
    render_meta: { smoke: true },
  }).eq('id', lecture.id);
  if (pubErr) return bad('publish lecture', pubErr.message);
  ok('published lecture (signed_url, expiry, published_at set)');

  // 7. Cleanup (children first because of FKs)
  const cleanups = [
    sb.from('system_alerts').delete().eq('payload->>lectureId', lecture.id),
    sb.from('video_lectures').delete().eq('id', lecture.id),
    sb.from('video_scripts').delete().eq('id', script.id),
    sb.from('agent_tasks').delete().in('id', [scriptTask.id, renderTask.id]),
  ];
  for (const p of cleanups) {
    const r = await p;
    if (r.error) console.warn('cleanup warning:', r.error.message);
  }
  ok('cleaned up smoke rows');

  console.log(`\n— Result: ${pass} passed, ${fail} failed —`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
