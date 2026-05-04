// Sprint 6 end-to-end walker — exercises every user-facing flow against the
// live Next.js dev server + cloud Supabase.
//
// Usage: PORT=3030 npm run dev &
//        node --env-file=.env.local scripts/verification/sprint6-e2e-walk.mjs
//
// What it walks:
//   F1 (S6-1) Bake-sweep: admin signin → POST /api/admin/hermes/bake-sweep
//        returns 200 + { ok:true, baked, summary } shape. /admin/bake-sweep SSR
//        with admin cookie returns 200. /api/admin/comfyui/status returns
//        connected:false with reason (since ComfyUI isn't running locally).
//   F2 (S6-2) 3D notes: signin → POST /api/topic/[id]/notes adds a note →
//        GET returns it → PATCH updates content → GET reflects update →
//        DELETE removes → GET returns empty. /api/topic/[id]/notes/export
//        returns application/pdf.
//   F3 (S6-3) Coach: signin → GET /api/coach/prelims/session creates an
//        active consultation → POST /message inserts user + guide turns,
//        returns reply with metadata. Active consultation has at least 2
//        turns. /coach/prelims SSR with cookie returns 200.
//   F4 (S6-4) Render retry: admin signin → POST /api/admin/hermes/render-retry
//        returns 200 + { ok:true, examined, retried, exhausted } shape (no
//        failed jobs needed; the route should succeed with 0 examined).

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PORT = process.env.PORT || 3000;
const ORIGIN = `http://localhost:${PORT}`;

if (!url || !serviceKey || !anonKey) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(2);
}

const projectRef = new URL(url).hostname.split('.')[0];
const COOKIE_NAME = `sb-${projectRef}-auth-token`;
const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

let pass = 0, fail = 0;
const failNames = [];
const ok = (n) => { pass++; console.log(`  PASS  ${n}`); };
const bad = (n, e) => { fail++; failNames.push(n); console.error(`  FAIL  ${n}: ${e}`); };

const stamp = Date.now();
const password = 'S6E2EWalk!23';
const users = [];
let topicId = null;

async function createSignedInUser(label, role = 'aspirant') {
  const email = `s6e2e-${label}-${stamp}@prepx-smoke.test`;
  const { data, error } = await sb.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser ${label}: ${error?.message}`);
  if (role === 'admin') {
    await sb.from('users').update({ role: 'admin' }).eq('id', data.user.id);
  }
  const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anonKey },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(`signin ${label}: HTTP ${r.status}`);
  const session = await r.json();
  const cookieValue = encodeURIComponent(`base64-${Buffer.from(JSON.stringify(session)).toString('base64')}`);
  const cookie = `${COOKIE_NAME}=${cookieValue}`;
  const u = { id: data.user.id, email, cookie, role };
  users.push(u);
  return u;
}

async function req(path, opts = {}) {
  const r = await fetch(`${ORIGIN}${path}`, opts);
  return { status: r.status, ok: r.ok, headers: r.headers, json: () => r.json().catch(() => null), text: () => r.text() };
}

let aspirant = null;
let admin = null;

try {
  // ──────────────────────────────────────────────────────────────────────
  console.log('\n═══ Setup ═══');
  aspirant = await createSignedInUser('user');
  admin = await createSignedInUser('admin', 'admin');
  ok('seed aspirant + admin users');

  const { data: topic, error: tErr } = await sb.from('topics').insert({
    title: `E2E topic ${stamp}`, subject: 'history', content: 'walker',
  }).select('id').single();
  if (tErr || !topic) throw new Error(`topic seed: ${tErr?.message}`);
  topicId = topic.id;
  ok('seed topic');

  // ──────────────────────────────────────────────────────────────────────
  console.log('\n═══ F1 (S6-1) Bake sweep + ComfyUI status ═══');
  {
    const r = await req('/api/admin/hermes/bake-sweep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: admin.cookie },
      body: JSON.stringify({}),
    });
    if (!r.ok) bad('POST /api/admin/hermes/bake-sweep', `HTTP ${r.status}`);
    else {
      const j = await r.json();
      if (j && (j.ok || j.summary || Array.isArray(j.baked))) ok('bake-sweep returns shape { ok|baked|summary }');
      else bad('bake-sweep shape', JSON.stringify(j));
    }
  }
  {
    const r = await req('/api/admin/comfyui/status', { headers: { cookie: admin.cookie } });
    if (!r.ok) bad('GET /api/admin/comfyui/status', `HTTP ${r.status}`);
    else {
      const j = await r.json();
      if (typeof j?.connected === 'boolean') ok('comfyui status returns connected:bool');
      else bad('comfyui status shape', JSON.stringify(j));
    }
  }
  {
    const r = await req('/admin/bake-sweep', { headers: { cookie: admin.cookie } });
    if (r.ok) ok('GET /admin/bake-sweep returns 200 with admin cookie');
    else bad('admin bake-sweep page', `HTTP ${r.status}`);
  }
  // unauth: aspirant cookie should 403
  {
    const r = await req('/api/admin/hermes/bake-sweep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: aspirant.cookie },
      body: JSON.stringify({}),
    });
    if (r.status === 403) ok('non-admin POST bake-sweep → 403');
    else bad('non-admin gate', `expected 403 got ${r.status}`);
  }

  // ──────────────────────────────────────────────────────────────────────
  console.log('\n═══ F2 (S6-2) 3D notes CRUD + PDF ═══');
  let createdNoteId = null;
  {
    const r = await req(`/api/topic/${topicId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: aspirant.cookie },
      body: JSON.stringify({ content: 'first note', color: 'cyan', position: { x: 1, y: 0, z: 0 } }),
    });
    if (r.status !== 201) { bad('POST /notes', `HTTP ${r.status}`); }
    else {
      const j = await r.json();
      if (j?.note?.id) { createdNoteId = j.note.id; ok('POST /notes returns 201 with note row'); }
      else bad('POST /notes shape', JSON.stringify(j));
    }
  }
  {
    const r = await req(`/api/topic/${topicId}/notes`, { headers: { cookie: aspirant.cookie } });
    const j = await r.json();
    if (r.ok && Array.isArray(j?.notes) && j.notes.length === 1) ok('GET /notes returns 1 row');
    else bad('GET /notes', `status=${r.status} count=${j?.notes?.length}`);
  }
  if (createdNoteId) {
    const r = await req(`/api/topic/${topicId}/notes/${createdNoteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', cookie: aspirant.cookie },
      body: JSON.stringify({ content: 'patched body', color: 'saffron' }),
    });
    const j = await r.json();
    if (r.ok && j?.note?.content === 'patched body' && j.note.color === 'saffron') ok('PATCH /notes/:id reflects update');
    else bad('PATCH /notes', JSON.stringify(j));
  }
  {
    const r = await req(`/api/topic/${topicId}/notes/export`, { headers: { cookie: aspirant.cookie } });
    if (r.ok && (r.headers.get('content-type') || '').includes('pdf')) ok('GET /notes/export returns application/pdf');
    else bad('export pdf', `status=${r.status} ct=${r.headers.get('content-type')}`);
  }
  if (createdNoteId) {
    const r = await req(`/api/topic/${topicId}/notes/${createdNoteId}`, {
      method: 'DELETE', headers: { cookie: aspirant.cookie },
    });
    if (r.ok) ok('DELETE /notes/:id ok');
    else bad('DELETE /notes', `HTTP ${r.status}`);
  }
  {
    const r = await req(`/api/topic/${topicId}/notes`, { headers: { cookie: aspirant.cookie } });
    const j = await r.json();
    if (r.ok && Array.isArray(j?.notes) && j.notes.length === 0) ok('GET /notes after delete returns 0');
    else bad('GET /notes post-delete', JSON.stringify(j));
  }
  // RLS: stranger cannot see what was created — already proven by smoke; skip duplicating.

  // ──────────────────────────────────────────────────────────────────────
  console.log('\n═══ F3 (S6-3) Teacher coach ═══');
  let consultationId = null;
  {
    const r = await req('/api/coach/prelims/session', { headers: { cookie: aspirant.cookie } });
    const j = await r.json();
    if (r.ok && j?.consultation?.id && Array.isArray(j?.turns)) {
      consultationId = j.consultation.id;
      ok('GET /api/coach/prelims/session creates active consultation');
    } else {
      bad('coach session', JSON.stringify(j));
    }
  }
  {
    const r = await req('/api/coach/prelims/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: aspirant.cookie },
      body: JSON.stringify({
        message: "I don't understand the basic structure doctrine — show me with an example.",
        consultationId,
      }),
    });
    const j = await r.json();
    if (r.ok && j?.reply?.message && j?.reply?.role === 'guide') {
      ok('POST /api/coach/prelims/message returns guide reply');
    } else {
      bad('coach message', `status=${r.status} body=${JSON.stringify(j).slice(0, 250)}`);
    }
    if (j?.imagineHint?.shouldTrigger) ok('imagine-trigger heuristic detected struggle');
    else bad('imagine-trigger heuristic', JSON.stringify(j?.imagineHint));
  }
  // Verify both turns landed via cloud
  if (consultationId) {
    const { data: turns } = await sb.from('teacher_consultation_turns')
      .select('role').eq('consultation_id', consultationId);
    if (turns && turns.length >= 2 && turns.some(t => t.role === 'user') && turns.some(t => t.role === 'guide')) {
      ok('teacher_consultation_turns has both roles persisted');
    } else {
      bad('turns persisted', JSON.stringify(turns));
    }
  }
  {
    const r = await req('/coach/prelims', { headers: { cookie: aspirant.cookie } });
    if (r.ok) ok('GET /coach/prelims SSR returns 200 with cookie');
    else bad('coach SSR', `HTTP ${r.status}`);
  }

  // ──────────────────────────────────────────────────────────────────────
  console.log('\n═══ F4 (S6-4) Render retry sweep ═══');
  {
    const r = await req('/api/admin/hermes/render-retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: admin.cookie },
      body: JSON.stringify({}),
    });
    const j = await r.json();
    if (r.ok && typeof j?.examined === 'number' && typeof j?.retried === 'number' && typeof j?.exhausted === 'number') {
      ok('POST /api/admin/hermes/render-retry returns sweep shape');
    } else {
      bad('render-retry shape', JSON.stringify(j));
    }
  }
  {
    const r = await req('/api/admin/hermes/render-retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: aspirant.cookie },
      body: JSON.stringify({}),
    });
    if (r.status === 403) ok('non-admin POST render-retry → 403');
    else bad('render-retry gate', `expected 403 got ${r.status}`);
  }

} catch (err) {
  bad('walker', err.message || String(err));
} finally {
  // Cleanup
  if (topicId) await sb.from('topics').delete().eq('id', topicId);
  for (const u of users) await sb.auth.admin.deleteUser(u.id).catch(() => {});

  console.log(`\n══════════════════════════════════════`);
  console.log(`Sprint 6 E2E walker: ${pass} PASS / ${fail} FAIL`);
  if (fail > 0) {
    console.log('Failures:');
    for (const n of failNames) console.log(`  ✗ ${n}`);
  }
  process.exit(fail > 0 ? 1 : 0);
}
