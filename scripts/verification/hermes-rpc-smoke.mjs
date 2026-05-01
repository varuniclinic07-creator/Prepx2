// Verifies the SQL contract for the Hermes worker without booting Redis.
//   1) Insert a queued agent_task
//   2) Call claim_next_agent_task → expect status flip + job_logs row
//   3) Call complete_agent_task → expect terminal status + 2nd job_logs row
//   4) Insert a 2nd task, exhaust max_retries via requeue_failed_task → dead_letter
// Run: node --env-file=.env.local scripts/verification/hermes-rpc-smoke.mjs

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
  console.log('— Hermes SQL contract smoke —');

  // 1. Insert queued task
  const { data: t1, error: e1 } = await sb.from('agent_tasks').insert({
    agent_type: 'coach', status: 'queued', payload: { smoke: true, source: 'rpc-smoke' },
  }).select('id').single();
  if (e1) return bad('insert queued task', e1.message);
  ok(`insert queued task ${t1.id.slice(0,8)}`);

  // 2. Claim it
  const { data: claimed, error: e2 } = await sb.rpc('claim_next_agent_task', {
    p_agent_type: 'coach', p_worker_id: 'smoke',
  });
  if (e2) return bad('claim_next_agent_task', e2.message);
  const claimedRow = Array.isArray(claimed) ? claimed[0] : claimed;
  if (!claimedRow?.id) return bad('claim_next_agent_task', 'no row returned');
  if (claimedRow.id !== t1.id) return bad('claim returned wrong row', `${claimedRow.id} != ${t1.id}`);
  if (claimedRow.status !== 'processing') return bad('claim flip status', claimedRow.status);
  ok('claim flips status to processing');

  // 2b. job_logs row written by claim
  const { data: log1 } = await sb.from('job_logs').select('*').eq('agent_task_id', t1.id).order('created_at', { ascending: true });
  if (!log1 || log1.length < 1 || log1[0].status !== 'processing') return bad('claim writes job_logs', JSON.stringify(log1));
  ok('claim writes processing log');

  // 3. Complete it
  const { error: e3 } = await sb.rpc('complete_agent_task', {
    p_task_id: t1.id, p_status: 'completed', p_result: { msg: 'ok' }, p_error: null,
  });
  if (e3) return bad('complete_agent_task', e3.message);
  const { data: t1Done } = await sb.from('agent_tasks').select('status, last_error, completed_at').eq('id', t1.id).single();
  if (t1Done.status !== 'completed') return bad('complete flip', t1Done.status);
  ok('complete flips status to completed');

  const { data: log2 } = await sb.from('job_logs').select('*').eq('agent_task_id', t1.id);
  if (!log2 || log2.length < 2) return bad('complete writes 2nd job_logs row', `count=${log2?.length}`);
  ok('complete writes terminal log row');

  // 4. Retry → dead_letter
  const { data: t2, error: e4 } = await sb.from('agent_tasks').insert({
    agent_type: 'study', status: 'failed', payload: { smoke: true }, retry_count: 0, max_retries: 2,
  }).select('id').single();
  if (e4) return bad('insert failed task', e4.message);

  const { data: r1, error: re1 } = await sb.rpc('requeue_failed_task', { p_task_id: t2.id });
  if (re1) return bad('requeue 1st', re1.message);
  if (r1 !== 'queued') return bad('requeue 1st should be queued', r1);
  ok('requeue (retry < max) → queued');

  const { data: r2 } = await sb.rpc('requeue_failed_task', { p_task_id: t2.id });
  if (r2 !== 'dead_letter') return bad('requeue 2nd should be dead_letter', r2);
  ok('requeue (exhausted) → dead_letter');

  // Cleanup
  await sb.from('agent_tasks').delete().in('id', [t1.id, t2.id]);
  await sb.from('job_logs').delete().in('agent_task_id', [t1.id, t2.id]);
  ok('cleanup');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
