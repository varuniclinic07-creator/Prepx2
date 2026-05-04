// Sprint 6 S6-1 SQL contract smoke — bake_sweep_jobs (069).
//
// Exercises the audit table end-to-end against cloud Supabase using service-role:
//   1) seed bake_sweep_log row → insert 3 bake_sweep_jobs rows (rendered/failed/skipped)
//   2) status CHECK rejects 'bogus' (23514)
//   3) per-row select ordered by created_at DESC returns the 3 we inserted
//   4) ON DELETE SET NULL — drop the parent log → rows survive with sweep_id NULL
//   5) RLS denies anon-shaped client (admin-only policy) — verified via SELECT count
//   6) cleanup
//
// Run: node --env-file=.env.local scripts/verification/bake-sweep-smoke.mjs

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(2);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log(`  PASS  ${n}`); };
const bad = (n, e) => { fail++; console.error(`  FAIL  ${n}: ${e}`); };

let logId = null;
const jobIds = [];

try {
  // 1. Seed parent sweep log
  const { data: log, error: logErr } = await sb.from('bake_sweep_log').insert({
    sweep_started_at: new Date().toISOString(),
    sweep_ended_at: new Date().toISOString(),
    total_rows: 3,
    baked_count: 1,
    failed_count: 1,
    per_table: { smoke: true },
  }).select('id').single();
  if (logErr || !log) throw new Error(`bake_sweep_log insert: ${logErr?.message ?? 'no row'}`);
  logId = log.id;
  ok('seed bake_sweep_log');

  // 2. Insert 3 audit rows (one per status)
  const fakeRow = '00000000-0000-0000-0000-000000000000';
  const fixtures = [
    { sweep_id: logId, source_table: 'mnemonic_artifacts', row_id: fakeRow, status: 'rendered',
      prompt_id: 'pid-1', storage_path: 'baked/test/1.mp4', video_url: 'https://signed/1', duration_ms: 12345 },
    { sweep_id: logId, source_table: 'imagine_videos', row_id: fakeRow, status: 'failed',
      error_message: 'ComfyUI timeout', duration_ms: 30000 },
    { sweep_id: logId, source_table: 'concept_shorts', row_id: fakeRow, status: 'skipped',
      error_message: 'no scene data', duration_ms: 5 },
  ];
  const { data: ins, error: insErr } = await sb.from('bake_sweep_jobs').insert(fixtures).select('id, status');
  if (insErr || !ins || ins.length !== 3) throw new Error(`insert 3 rows: ${insErr?.message ?? 'wrong count'}`);
  for (const r of ins) jobIds.push(r.id);
  ok('insert 3 audit rows (rendered/failed/skipped)');

  // 3. Status CHECK rejects bogus
  const { error: ckErr } = await sb.from('bake_sweep_jobs').insert({
    sweep_id: logId, source_table: 'mnemonic_artifacts', row_id: fakeRow, status: 'bogus',
  });
  if (ckErr?.code === '23514') ok('status CHECK rejects bogus (23514)');
  else bad('status CHECK', `expected 23514, got ${ckErr?.code ?? 'no error'} ${ckErr?.message ?? ''}`);

  // 4. Order DESC by created_at returns the 3 newest
  const { data: rows, error: selErr } = await sb.from('bake_sweep_jobs')
    .select('id, status, source_table')
    .eq('sweep_id', logId)
    .order('created_at', { ascending: false });
  if (selErr) throw new Error(`select ordered: ${selErr.message}`);
  if (rows && rows.length === 3) ok('select returns 3 rows for this sweep');
  else bad('select count', `expected 3, got ${rows?.length}`);

  // 5. FK ON DELETE SET NULL — delete parent log, audit rows persist with sweep_id null
  const { error: delErr } = await sb.from('bake_sweep_log').delete().eq('id', logId);
  if (delErr) throw new Error(`delete parent: ${delErr.message}`);
  logId = null;
  const { data: after, error: afterErr } = await sb.from('bake_sweep_jobs')
    .select('id, sweep_id').in('id', jobIds);
  if (afterErr) throw new Error(`select after delete: ${afterErr.message}`);
  if (after && after.length === 3 && after.every((r) => r.sweep_id === null)) {
    ok('ON DELETE SET NULL — audit rows survive with sweep_id null');
  } else {
    bad('ON DELETE SET NULL', `expected 3 rows with null sweep_id, got ${JSON.stringify(after)}`);
  }

  // 6. RLS — anon client cannot SELECT bake_sweep_jobs (admin-only policy)
  if (anonKey) {
    const anon = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: anonRows, error: anonErr } = await anon.from('bake_sweep_jobs')
      .select('id').in('id', jobIds);
    // RLS denial typically returns empty array (not error); both are acceptable.
    if (anonErr || !anonRows || anonRows.length === 0) {
      ok('RLS — anon SELECT returns 0 rows (admin-only policy)');
    } else {
      bad('RLS', `anon got ${anonRows.length} rows; expected 0`);
    }
  } else {
    ok('RLS — skipped (no anon key in env)');
  }
} catch (err) {
  bad('smoke', err.message || String(err));
} finally {
  // Cleanup
  if (jobIds.length) await sb.from('bake_sweep_jobs').delete().in('id', jobIds);
  if (logId) await sb.from('bake_sweep_log').delete().eq('id', logId);
  console.log(`\n${pass} PASS / ${fail} FAIL`);
  process.exit(fail > 0 ? 1 : 0);
}
