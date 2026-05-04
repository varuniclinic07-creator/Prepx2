// Sprint 7-D smoke — atomic award_coins RPC + Razorpay webhook dedup.
// Run: npx tsx scripts/verification/coin-razorpay-hardening-smoke.ts
//
// Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in env.

import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}
const sb = createClient(URL, KEY, { auth: { persistSession: false } });

let pass = 0, fail = 0;
const ok = (n: string) => { pass++; console.log(`  PASS  ${n}`); };
const bad = (n: string, e: string) => { fail++; console.error(`  FAIL  ${n}: ${e}`); };

async function main() {
  // Seed test user.
  const email = `coin-smoke-${Date.now()}@prepx.test`;
  const { data: authUser, error: authErr } = await sb.auth.admin.createUser({
    email, password: 'TestPass123!', email_confirm: true,
  });
  if (authErr || !authUser?.user) {
    bad('seed user', authErr?.message || 'no user');
    return;
  }
  const userId = authUser.user.id;
  await sb.from('users').upsert({ id: userId, email, role: 'student' });

  const idempKey = `smoke-award-${Date.now()}`;

  // 1. First award succeeds, balance = 50
  const { data: r1, error: e1 } = await sb.rpc('award_coins', {
    p_user_id: userId, p_amount: 50, p_reason: 'smoke-test', p_idempotency_key: idempKey,
  });
  if (e1) bad('first award_coins call', e1.message);
  else if (r1 !== 50) bad('first award balance', `expected 50, got ${r1}`);
  else ok('first award_coins returns balance 50');

  // 2. Replay with same key returns same balance, no double-credit
  const { data: r2, error: e2 } = await sb.rpc('award_coins', {
    p_user_id: userId, p_amount: 50, p_reason: 'smoke-test', p_idempotency_key: idempKey,
  });
  if (e2) bad('replay award_coins call', e2.message);
  else if (r2 !== 50) bad('replay should not double-credit', `got ${r2}`);
  else ok('idempotent replay returns 50 (no double-credit)');

  // 3. Second distinct key adds another 30
  const { data: r3, error: e3 } = await sb.rpc('award_coins', {
    p_user_id: userId, p_amount: 30, p_reason: 'smoke-test-2', p_idempotency_key: `${idempKey}-b`,
  });
  if (e3) bad('second award_coins call', e3.message);
  else if (r3 !== 80) bad('second award balance', `expected 80, got ${r3}`);
  else ok('distinct idempotency key credits 80 total');

  // 4. Confirm one row per distinct idempotency_key
  const { data: txns } = await sb.from('coin_transactions')
    .select('idempotency_key, amount').eq('user_id', userId);
  const keys = new Set((txns || []).map((t: any) => t.idempotency_key));
  if (keys.size === 2) ok('exactly 2 coin_transactions rows (one per key)');
  else bad('coin_transactions count', `expected 2 distinct keys, got ${keys.size}`);

  // 5. Negative amount rejected
  const { data: r5 } = await sb.rpc('award_coins', {
    p_user_id: userId, p_amount: -10, p_reason: 'bad', p_idempotency_key: 'never',
  });
  if (r5 === -1) ok('negative amount returns -1');
  else bad('negative amount', `expected -1, got ${r5}`);

  // 6. Razorpay webhook dedup — first insert succeeds (provider=razorpay)
  const eventId = `evt_rzp_smoke_${Date.now()}`;
  const { error: insErr1 } = await sb.from('payment_webhook_events').insert({
    event_id: eventId, provider: 'razorpay', type: 'payment.captured', user_id: userId,
    payload: { id: eventId, mock: true },
  });
  if (insErr1) bad('first razorpay event insert', insErr1.message);
  else ok('first razorpay webhook event insert succeeds');

  // 7. Replay → 23505
  const { error: insErr2 } = await sb.from('payment_webhook_events').insert({
    event_id: eventId, provider: 'razorpay', type: 'payment.captured', user_id: userId,
    payload: { id: eventId, mock: true },
  });
  if (insErr2 && insErr2.code === '23505') ok('replayed razorpay event blocked by UNIQUE PK');
  else bad('razorpay replay should fail with 23505', insErr2?.code || 'no error');

  // Cleanup
  try {
    await sb.from('coin_transactions').delete().eq('user_id', userId);
    await sb.from('user_balances').delete().eq('user_id', userId);
    await sb.from('payment_webhook_events').delete().eq('event_id', eventId);
    await sb.from('users').delete().eq('id', userId);
    await sb.auth.admin.deleteUser(userId);
  } catch {}
}

main().then(() => {
  console.log(`\n${pass} PASS / ${fail} FAIL`);
  process.exit(fail > 0 ? 1 : 0);
}).catch(err => {
  console.error('SMOKE CRASH', err);
  process.exit(1);
});
