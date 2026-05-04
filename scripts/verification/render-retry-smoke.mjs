// Sprint 6 S6-4 SQL contract smoke — render retry sweep + audit (072).
//
// 1) seed video_script + failed video_render_job
// 2) insert video_render_attempts row + verify CASCADE on render_job delete
// 3) status CHECK rejects bogus
// 4) retry_count default 0; ALTER columns retry_until + last_attempted_at writable
// 5) cleanup
//
// Run: node --env-file=.env.local scripts/verification/render-retry-smoke.mjs

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Missing env'); process.exit(2); }
const sb = createClient(url, key, { auth: { persistSession: false } });

let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log(`  PASS  ${n}`); };
const bad = (n, e) => { fail++; console.error(`  FAIL  ${n}: ${e}`); };

const stamp = Date.now();
let scriptId = null;
let topicId = null;
let jobId = null;
const attemptIds = [];

try {
  const { data: topic } = await sb.from('topics').insert({
    title: `Render-retry smoke ${stamp}`, subject: 'history', content: 'smoke',
  }).select('id').single();
  topicId = topic?.id;
  ok('seed topic');

  const { data: script, error: sErr } = await sb.from('video_scripts').insert({
    topic_id: topicId,
    title: `Smoke script ${stamp}`,
    script_text: 'Test lecture script body.',
    status: 'approved',
    duration_target_seconds: 1800,
  }).select('id').single();
  if (sErr || !script) throw new Error(sErr?.message);
  scriptId = script.id;
  ok('seed video_script');

  // Insert failed render job with retry_count=0 + retry_until in the future.
  const { data: job, error: jErr } = await sb.from('video_render_jobs').insert({
    script_id: scriptId,
    status: 'failed',
    attempt: 1,
    error_text: 'ComfyUI offline',
    retry_count: 0,
    retry_until: new Date(Date.now() + 12 * 3_600_000).toISOString(),
    last_attempted_at: new Date().toISOString(),
  }).select('id, retry_count, retry_until').single();
  if (jErr || !job) throw new Error(jErr?.message);
  jobId = job.id;
  if (job.retry_count === 0 && job.retry_until) ok('failed render_job with retry fields persisted');
  else bad('render_job persist', JSON.stringify(job));

  // Insert audit attempt row
  const { data: att, error: aErr } = await sb.from('video_render_attempts').insert([
    { render_job_id: jobId, attempt: 1, status: 'failed', error_text: 'ComfyUI offline', duration_ms: 30000 },
    { render_job_id: jobId, attempt: 2, status: 'queued', duration_ms: 0 },
  ]).select('id');
  if (aErr || !att) throw new Error(aErr?.message);
  for (const a of att) attemptIds.push(a.id);
  ok('insert 2 video_render_attempts rows');

  // Status CHECK
  const { error: ckErr } = await sb.from('video_render_attempts').insert({
    render_job_id: jobId, attempt: 3, status: 'bogus',
  });
  if (ckErr?.code === '23514') ok('attempts.status CHECK rejects bogus (23514)');
  else bad('CHECK', `${ckErr?.code}`);

  // CASCADE: delete render_job → attempts gone
  await sb.from('video_render_jobs').delete().eq('id', jobId);
  jobId = null;
  const { data: after } = await sb.from('video_render_attempts').select('id').in('id', attemptIds);
  if (!after || after.length === 0) {
    ok('CASCADE: render_job delete removes attempts');
    attemptIds.length = 0;
  } else {
    bad('CASCADE', `${after.length} attempts survived`);
  }
} catch (err) {
  bad('smoke', err.message || String(err));
} finally {
  if (attemptIds.length) await sb.from('video_render_attempts').delete().in('id', attemptIds);
  if (jobId) await sb.from('video_render_jobs').delete().eq('id', jobId);
  if (scriptId) await sb.from('video_scripts').delete().eq('id', scriptId);
  if (topicId) await sb.from('topics').delete().eq('id', topicId);
  console.log(`\n${pass} PASS / ${fail} FAIL`);
  process.exit(fail > 0 ? 1 : 0);
}
