// Sprint 7 LIVE E2E — hits the running Next.js dev server at localhost:3000
// with real auth tokens and a real signed Razorpay webhook. Verifies DB
// side-effects after every step (no smoke-only checks).
//
// Run: npx tsx scripts/verification/sprint7-live-e2e.ts
// Requires: dev server up on :3000, .env.local sourced.

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SR  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const RZP_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'test-rzp-secret';
const BASE = 'http://localhost:3000';

const sb = createClient(URL, SR, { auth: { persistSession: false } });

let pass = 0, fail = 0;
const ok  = (n: string, extra?: string) => { pass++; console.log(`  PASS  ${n}${extra ? ' — ' + extra : ''}`); };
const bad = (n: string, e: string)        => { fail++; console.error(`  FAIL  ${n}: ${e}`); };

async function makeUser(label: string) {
  const email = `e2e-${label}-${Date.now()}@prepx.test`;
  const { data, error } = await sb.auth.admin.createUser({
    email, password: 'TestPass123!', email_confirm: true,
  });
  if (error || !data?.user) throw new Error(`makeUser ${label}: ${error?.message}`);
  const { error: upErr } = await sb.from('users').upsert({ id: data.user.id, email, role: 'aspirant' });
  if (upErr) throw new Error(`users upsert ${label}: ${upErr.message}`);
  const cli = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data: s, error: sErr } = await cli.auth.signInWithPassword({ email, password: 'TestPass123!' });
  if (sErr || !s?.session) throw new Error(`signIn ${label}: ${sErr?.message}`);
  return { id: data.user.id, email, token: s.session.access_token };
}

async function authedFetch(url: string, token: string, init?: RequestInit) {
  return fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

async function sprint7A() {
  console.log('\n=== Sprint 7-A: Hermes health probe LIVE ===');
  const r = await fetch(`${BASE}/api/health/hermes`);
  const txt = await r.text();
  if (r.status === 200 || r.status === 503) {
    let body: any = null;
    try { body = JSON.parse(txt); } catch {}
    if (body && body.queues && Object.keys(body.queues).length >= 14) {
      ok(`/api/health/hermes returned ${r.status} with ${Object.keys(body.queues).length} queues`);
    } else if (body && body.status === 'down') {
      ok(`/api/health/hermes returned 503 down (Redis offline) — probe wired correctly`);
    } else {
      bad('hermes probe shape', txt.slice(0, 200));
    }
  } else {
    bad('hermes probe http', `HTTP ${r.status} ${txt.slice(0,200)}`);
  }
}

async function sprint7B() {
  console.log('\n=== Sprint 7-B: Essay Colosseum peer-judging E2E ===');
  const A = await makeUser('A');
  const B = await makeUser('B');
  const J = await makeUser('J');

  let r = await authedFetch(`${BASE}/api/essay-colosseum/create`, A.token, {
    method: 'POST',
    body: JSON.stringify({
      topic: 'E2E test topic on federalism',
      opponent_email: B.email,
      wager: 0,
    }),
  });
  if (!r.ok) { bad('A creates match', `HTTP ${r.status} ${await r.text()}`); return { A, B, J }; }
  const created = await r.json();
  const matchId = created.match?.id || created.id;
  if (!matchId) { bad('A creates match', `no id in ${JSON.stringify(created)}`); return { A, B, J }; }
  ok('A creates pending match invited to B', `id=${matchId.slice(0,8)}`);

  const { data: m } = await sb.from('essay_colosseum_matches').select('*').eq('id', matchId).single();
  if (m?.status === 'pending' && m?.invited_user_id === B.id) ok('DB row pending + invited_user_id=B');
  else bad('DB row check', JSON.stringify(m));

  r = await authedFetch(`${BASE}/api/essay-colosseum/accept`, B.token, {
    method: 'POST', body: JSON.stringify({ match_id: matchId }),
  });
  if (!r.ok) { bad('B accepts', `HTTP ${r.status} ${await r.text()}`); return { A, B, J, matchId }; }
  ok('B accepts → API 200');

  const { data: m2 } = await sb.from('essay_colosseum_matches').select('status').eq('id', matchId).single();
  if (m2?.status === 'accepted') ok('DB flipped pending → accepted');
  else bad('DB after accept', JSON.stringify(m2));

  for (const [who, u] of [['A', A], ['B', B]] as const) {
    r = await authedFetch(`${BASE}/api/essay-colosseum/submit`, u.token, {
      method: 'POST',
      body: JSON.stringify({ match_id: matchId, essay_text: `Essay by ${who} on federalism. `.repeat(40) }),
    });
    if (!r.ok) { bad(`${who} submits`, `HTTP ${r.status} ${await r.text()}`); return { A, B, J, matchId }; }
    ok(`${who} submits essay → API 200`);
  }

  await sb.from('essay_colosseum_matches')
    .update({ status: 'closed', winner_user_id: A.id })
    .eq('id', matchId);

  r = await authedFetch(`${BASE}/api/essay-colosseum/arena`, J.token, { method: 'GET' });
  if (!r.ok) { bad('J fetches arena', `HTTP ${r.status} ${await r.text()}`); return { A, B, J, matchId }; }
  const arena = await r.json();
  const inArena = (arena.matches || []).some((x: any) => x.id === matchId);
  if (inArena) ok("match appears in J's arena");
  else bad('arena visibility', `not in arena: ${JSON.stringify(arena).slice(0,160)}`);

  const { data: subs } = await sb.from('essay_colosseum_submissions')
    .select('id, user_id').eq('match_id', matchId);
  const aSub = subs?.find((s: any) => s.user_id === A.id);
  if (!aSub) { bad('find A submission', 'not found'); return { A, B, J, matchId }; }

  r = await authedFetch(`${BASE}/api/essay-colosseum/judge`, J.token, {
    method: 'POST',
    body: JSON.stringify({ submission_id: aSub.id, score_overall: 8, feedback: 'Strong structure.' }),
  });
  if (!r.ok) { bad('J judges A', `HTTP ${r.status} ${await r.text()}`); return { A, B, J, matchId, aSubId: aSub.id }; }
  ok('J judges A → API 200');

  const { data: pj } = await sb.from('essay_peer_judgments')
    .select('score_overall').eq('submission_id', aSub.id).eq('judge_id', J.id).single();
  if (pj?.score_overall === 8) ok('peer judgment row written with score_overall=8');
  else bad('peer judgment row', JSON.stringify(pj));

  const { data: bal } = await sb.from('user_balances').select('coins').eq('user_id', J.id).single();
  if (bal?.coins === 25) ok('J was awarded 25 coins for judging');
  else bad('J coin balance', JSON.stringify(bal));

  r = await authedFetch(`${BASE}/api/essay-colosseum/judge`, J.token, {
    method: 'POST',
    body: JSON.stringify({ submission_id: aSub.id, score_overall: 9, feedback: 'replay' }),
  });
  if (r.status >= 400 && r.status < 500) ok(`replay judging blocked (HTTP ${r.status})`);
  else bad('replay judging', `expected 4xx, got ${r.status}`);

  r = await authedFetch(`${BASE}/api/essay-colosseum/leaderboard`, J.token, { method: 'GET' });
  if (!r.ok) { bad('leaderboard fetch', `HTTP ${r.status}`); return { A, B, J, matchId, aSubId: aSub.id }; }
  const lb = await r.json();
  const aRow = (lb.rows || lb.leaderboard || []).find((x: any) => x.user_id === A.id);
  if (aRow && (aRow.wins ?? 0) >= 1) ok(`leaderboard reflects A wins=${aRow.wins}`);
  else bad('leaderboard A row', JSON.stringify(lb).slice(0, 200));

  return { A, B, J, matchId, aSubId: aSub.id };
}

async function sprint7D() {
  console.log('\n=== Sprint 7-D: Razorpay webhook E2E ===');
  const eventId = `evt_e2e_${Date.now()}`;
  const U = await makeUser('rzp');
  const body = JSON.stringify({
    event: 'payment.captured',
    created_at: Math.floor(Date.now() / 1000),
    payload: { payment: { entity: {
      order_id: 'order_e2e_1',
      notes: { userId: U.id, plan: 'premium' },
    } } },
  });
  const sig = crypto.createHmac('sha256', RZP_SECRET).update(body).digest('hex');

  let r = await fetch(`${BASE}/api/webhooks/razorpay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': sig,
      'x-razorpay-event-id': eventId,
    },
    body,
  });
  const txt1 = await r.text();
  if (r.ok) ok('first webhook → 200', txt1.slice(0, 80));
  else bad('first webhook', `HTTP ${r.status} ${txt1}`);

  const { data: sub } = await sb.from('subscriptions').select('plan, status').eq('user_id', U.id).single();
  if (sub?.plan === 'premium' && sub?.status === 'active') ok('subscription row active+premium');
  else bad('subscription row', JSON.stringify(sub));

  r = await fetch(`${BASE}/api/webhooks/razorpay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': sig,
      'x-razorpay-event-id': eventId,
    },
    body,
  });
  const txt2 = await r.text();
  if (r.ok && txt2.includes('duplicate')) ok('replayed webhook flagged duplicate');
  else bad('replay webhook', `HTTP ${r.status} ${txt2}`);

  const oldBody = JSON.stringify({
    event: 'payment.captured',
    created_at: Math.floor(Date.now() / 1000) - 3600,
    payload: { payment: { entity: { order_id: 'old', notes: { userId: U.id } } } },
  });
  const oldSig = crypto.createHmac('sha256', RZP_SECRET).update(oldBody).digest('hex');
  r = await fetch(`${BASE}/api/webhooks/razorpay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': oldSig,
      'x-razorpay-event-id': `evt_old_${Date.now()}`,
    },
    body: oldBody,
  });
  if (r.status === 400) ok('stale timestamp rejected (HTTP 400)');
  else bad('stale timestamp', `expected 400, got ${r.status}`);

  r = await fetch(`${BASE}/api/webhooks/razorpay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': 'deadbeef',
      'x-razorpay-event-id': `evt_bad_${Date.now()}`,
    },
    body,
  });
  if (r.status === 400) ok('bad signature rejected (HTTP 400)');
  else bad('bad signature', `expected 400, got ${r.status}`);

  r = await fetch(`${BASE}/api/webhooks/razorpay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': sig,
    },
    body,
  });
  if (r.status === 400) ok('missing event-id rejected (HTTP 400)');
  else bad('missing event-id', `expected 400, got ${r.status}`);

  return { U, eventId };
}

async function sprint7C() {
  console.log('\n=== Sprint 7-C: multi-shot decomposition LIVE ===');
  // Insert a fake approved video_scripts row, run the multi-shot processor
  // directly (no need for a worker), and verify video_shots rows exist with
  // a merge_manifest written.
  const { processRenderJobMultiShot } = await import('../../lib/video/multi-shot-processor');

  const { data: scriptRow, error: sErr } = await sb.from('video_scripts').insert({
    title: 'E2E multi-shot smoke',
    script_text: 'Lecture body...',
    script_markers: [
      { time_seconds: 0, duration_seconds: 4, visual_cue: 'Caption: Article 370', narration_chunk: 'Article 370.' },
      { time_seconds: 4, duration_seconds: 8, visual_cue: 'Show the integral equation for compound interest', narration_chunk: 'Compound interest derivation.' },
      { time_seconds: 12, duration_seconds: 10, visual_cue: 'Wide cinematic shot of Indian parliament chamber with debate in session', narration_chunk: 'In the Lok Sabha.' },
    ],
    chapters: [{ time_seconds: 0, label: 'Intro' }],
    duration_target_seconds: 22,
    status: 'approved',
    generated_by_agent: 'e2e-test',
  }).select('id').single();
  if (sErr || !scriptRow) { bad('seed video_scripts', sErr?.message || 'no row'); return; }

  let lectureId: string | undefined;
  try {
    const result = await processRenderJobMultiShot({ data: { scriptId: scriptRow.id } } as any, 'task-e2e');
    lectureId = result.lectureId as string;
    if (result.shots === 3) ok('multi-shot decomposed 3 shots from 3 markers');
    else bad('shot count', `expected 3, got ${result.shots}`);

    const { data: shots } = await sb.from('video_shots')
      .select('position, kind, status').eq('lecture_id', lectureId).order('position');
    const kinds = (shots || []).map((s: any) => s.kind).join(',');
    if (kinds === 'title,manim,comfy') ok(`shot kinds correct: [${kinds}]`);
    else bad('shot kinds', `got [${kinds}]`);

    const { data: lec } = await sb.from('video_lectures')
      .select('status, render_meta').eq('id', lectureId).single();
    const merge = lec?.render_meta?.merge_manifest;
    if (Array.isArray(merge) && merge.length === 3) ok('render_meta.merge_manifest written with 3 entries');
    else bad('merge_manifest', JSON.stringify(lec?.render_meta).slice(0, 200));

    if (lec?.status === 'awaiting_bake' || lec?.status === 'composing') {
      ok(`lecture status = ${lec.status} (honest about deferred bake)`);
    } else bad('lecture status', String(lec?.status));
  } catch (err: any) {
    bad('processRenderJobMultiShot', err?.message || String(err));
  } finally {
    try {
      if (lectureId) {
        await sb.from('video_shots').delete().eq('lecture_id', lectureId);
        await sb.from('video_render_jobs').delete().eq('lecture_id', lectureId);
        await sb.from('video_lectures').delete().eq('id', lectureId);
      }
      await sb.from('video_scripts').delete().eq('id', scriptRow.id);
    } catch {}
  }
}

async function cleanupBundle(b?: { A: any; B: any; J: any; matchId?: string; aSubId?: string }) {
  if (!b) return;
  try {
    if (b.aSubId) await sb.from('essay_peer_judgments').delete().eq('submission_id', b.aSubId);
    if (b.matchId) {
      await sb.from('essay_colosseum_submissions').delete().eq('match_id', b.matchId);
      await sb.from('essay_colosseum_matches').delete().eq('id', b.matchId);
    }
    for (const u of [b.A, b.B, b.J]) {
      await sb.from('coin_transactions').delete().eq('user_id', u.id);
      await sb.from('user_balances').delete().eq('user_id', u.id);
      await sb.from('users').delete().eq('id', u.id);
      await sb.auth.admin.deleteUser(u.id);
    }
  } catch {}
}

async function cleanupRzp(d?: { U: any; eventId: string }) {
  if (!d) return;
  try {
    await sb.from('payment_webhook_events').delete().eq('event_id', d.eventId);
    await sb.from('subscriptions').delete().eq('user_id', d.U.id);
    await sb.from('users').delete().eq('id', d.U.id);
    await sb.auth.admin.deleteUser(d.U.id);
  } catch {}
}

(async () => {
  let bBundle, dBundle;
  try {
    await sprint7A();
    bBundle = await sprint7B();
    await sprint7C();
    dBundle = await sprint7D();
  } catch (err: any) {
    console.error('CRASH', err?.message || err);
    fail++;
  } finally {
    await cleanupBundle(bBundle);
    await cleanupRzp(dBundle);
  }
  console.log(`\n${pass} PASS / ${fail} FAIL`);
  process.exit(fail > 0 ? 1 : 0);
})();
