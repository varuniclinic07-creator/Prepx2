// Sprint 9-D Phase C — HTTP E2E smoke for /api/lectures/[id]/query.
//
// Strategy (per directive: "smokes default to phrase=false"):
//   1. Mint a smoke user via service-role admin client; sign in to get session.
//   2. INSERT a synthetic completed `lecture_jobs` row with a concept_index
//      embedded into metadata.
//   3. Hit POST /api/lectures/[id]/query with phrase=false (deterministic);
//      assert directive contract fields, cached=false on first call.
//   4. Hit it again — assert cached=true, identical payload.
//   5. (Optional) Hit with phrase=true if SMOKE_PHRASE=1, assert answer
//      string is populated. Default off to keep CI deterministic.
//   6. Negative cases: missing q (400), unknown lecture (404), bad UUID (400).
//   7. DELETE the synthetic row.
//
// Run:
//   npx dotenv-cli -e .env.local -- npx tsx scripts/verification/sprint9d-query-http-smoke.ts
//
// Requires:
//   - dev server running at http://localhost:3000
//   - SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
//   - Migration 078 applied (lecture_jobs table)

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SR  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const PHRASE = process.env.SMOKE_PHRASE === '1';

if (!URL || !SR || !ANON) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

let passed = 0;
let failed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passed++; console.log(`  ✔ ${name}`); }
  else      { failed++; failures.push(`${name}${detail ? ` — ${detail}` : ''}`); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

const synthIndex = {
  version: '9d-1' as const,
  topic: { slug: 'ohms-law', title: "Ohm's Law" },
  duration: 33.9,
  concepts: [
    {
      id: 'resistance',
      name: 'Resistance',
      definition: 'Opposition to electric current.',
      difficulty: 'beginner',
      search_tokens: ['resistance', 'opposition', 'current'],
      scene_positions: [2, 3],
      timestamps: [{ start: 12.3, end: 18.7 }, { start: 18.7, end: 25 }],
      replay_segments: [{ start: 12.3, end: 18.7 }],
      formulas: ['V = IR'],
      related_notes: [{ idx: 1, text: 'Resistance is the opposition to electric current.' }],
      related_quiz_mcq_ids: [1, 3],
      learning_objectives: ['Define resistance and state its unit.'],
    },
    {
      id: 'voltage',
      name: 'Voltage',
      definition: 'Electrical potential difference.',
      difficulty: 'beginner',
      search_tokens: ['voltage', 'potential', 'difference'],
      scene_positions: [2],
      timestamps: [{ start: 12.3, end: 18.7 }],
      replay_segments: [{ start: 12.3, end: 18.7 }],
      formulas: ['V = IR'],
      related_notes: [],
      related_quiz_mcq_ids: [2],
      learning_objectives: ['Apply V = IR to compute current.'],
    },
  ],
};

async function main() {
  console.log('=== Sprint 9-D — query HTTP smoke ===\n');

  const admin = createClient(URL, SR, { auth: { persistSession: false } });

  // ── 1. Smoke user ──────────────────────────────────────────────────
  const smokeEmail = process.env.SMOKE_USER_EMAIL || 'sprint9d-smoke@prepx.test';
  let userId: string | null = null;
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list?.users?.find((u: any) => u.email === smokeEmail);
  if (existing) {
    userId = existing.id;
  } else {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: smokeEmail,
      password: 'Sprint9D!' + Math.random().toString(36).slice(2),
      email_confirm: true,
    });
    if (error || !created?.user?.id) throw new Error(`createUser failed: ${error?.message}`);
    userId = created.user.id;
  }
  await admin.from('users').upsert({ id: userId!, email: smokeEmail }, { onConflict: 'id' });
  console.log(`smoke user: ${smokeEmail} ${userId}`);

  // ── 2. Sign-in to mint session ─────────────────────────────────────
  const ephemeral = 'Sprint9D_' + Math.random().toString(36).slice(2) + '!';
  await admin.auth.admin.updateUserById(userId!, { password: ephemeral });
  const userClient = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data: sess, error: signErr } = await userClient.auth.signInWithPassword({ email: smokeEmail, password: ephemeral });
  if (signErr || !sess?.session?.access_token) throw new Error(`signIn failed: ${signErr?.message}`);
  const accessToken = sess.session.access_token;
  const refreshToken = sess.session.refresh_token;
  const cookieHeader = `sb-access-token=${accessToken}; sb-refresh-token=${refreshToken}`;
  const authHeaders: Record<string, string> = {
    'content-type': 'application/json',
    cookie: cookieHeader,
    authorization: `Bearer ${accessToken}`,
  };

  // ── 3. Insert synthetic completed lecture_jobs row ────────────────
  const lectureJobId = randomUUID();
  const lectureBizId = `lec_smoke9d_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const insertPayload: any = {
    id: lectureJobId,
    user_id: userId,
    lecture_id: lectureBizId,
    topic: 'ohms-law',
    params: { topic: 'ohms-law', durationSeconds: 35, style: 'classroom' },
    status: 'completed',
    progress_percent: 100,
    storage_prefix: `smoke/9d/${lectureJobId}`,
    metadata: {
      pipeline: 'sprint9d-smoke',
      concept_index: synthIndex,
    },
    stage_log: [],
  };
  const { error: insErr } = await admin.from('lecture_jobs').insert(insertPayload);
  if (insErr) throw new Error(`lecture_jobs insert failed: ${insErr.message}`);
  console.log(`synthetic lecture_jobs row: ${lectureJobId}`);

  let cleanupDone = false;
  const cleanup = async () => {
    if (cleanupDone) return;
    cleanupDone = true;
    await admin.from('lecture_jobs').delete().eq('id', lectureJobId);
  };

  try {
    // ── 4. First call (cache miss) ──────────────────────────────────
    console.log('\n--- POST /api/lectures/[id]/query (phrase=false, first call) ---');
    const r1 = await fetch(`${BASE}/api/lectures/${lectureJobId}/query`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ q: 'What is resistance?' }),
    });
    const text1 = await r1.text();
    if (text1.startsWith('<')) throw new Error(`non-JSON response (dev server recompile?): ${text1.slice(0, 120)}`);
    const body1 = JSON.parse(text1);
    check(`first call status 200 (got ${r1.status})`, r1.status === 200, JSON.stringify(body1).slice(0, 200));
    check('lectureId echoed', body1.lectureId === lectureJobId);
    check('matchedConcept name = Resistance', body1.matchedConcept?.name === 'Resistance');
    check('confidence ≥ 0.95', body1.confidence >= 0.95, `got ${body1.confidence}`);
    check('timestamps array', Array.isArray(body1.timestamps) && body1.timestamps.length > 0);
    check('replaySegments array', Array.isArray(body1.replaySegments) && body1.replaySegments.length > 0);
    check('formulas includes V = IR', Array.isArray(body1.formulas) && body1.formulas.some((f: string) => /V\s*=\s*IR/i.test(f)));
    check('relatedQuiz alias present (array)', Array.isArray(body1.relatedQuiz));
    check('sourceScenes alias present (array)', Array.isArray(body1.sourceScenes));
    check('learningObjectives array', Array.isArray(body1.learningObjectives));
    check('answer is null (phrase=false)', body1.answer === null);
    check('cached=false on first call', body1.cached === false);

    // ── 5. Second call (cache hit) ──────────────────────────────────
    console.log('\n--- POST /api/lectures/[id]/query (phrase=false, second call) ---');
    const r2 = await fetch(`${BASE}/api/lectures/${lectureJobId}/query`, {
      method: 'POST', headers: authHeaders,
      body: JSON.stringify({ q: 'What is resistance?' }),
    });
    const body2 = await r2.json();
    check('second call status 200', r2.status === 200);
    check('cached=true on second call', body2.cached === true);
    check('matchedConcept identical', body2.matchedConcept?.name === 'Resistance');
    check('confidence identical (deterministic)', body2.confidence === body1.confidence);

    // ── 6. give-recap ──────────────────────────────────────────────
    console.log('\n--- POST .../query "Give me a recap" ---');
    const r3 = await fetch(`${BASE}/api/lectures/${lectureJobId}/query`, {
      method: 'POST', headers: authHeaders,
      body: JSON.stringify({ q: 'Give me a recap' }),
    });
    const body3 = await r3.json();
    check('recap status 200', r3.status === 200);
    check('intent=give-recap', body3.intent === 'give-recap');
    check('matchedConcept null on recap', body3.matchedConcept === null);
    check('timestamps cover full duration', body3.timestamps?.[0]?.end === 33.9);

    // ── 7. Optional phrase=true ────────────────────────────────────
    if (PHRASE) {
      console.log('\n--- POST .../query phrase=true (real aiChat) ---');
      const r4 = await fetch(`${BASE}/api/lectures/${lectureJobId}/query`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ q: 'What is resistance?', phrase: true }),
      });
      const body4 = await r4.json();
      check('phrase status 200', r4.status === 200);
      check('answer is non-empty string',
        typeof body4.answer === 'string' && body4.answer.length > 10,
        `got: ${JSON.stringify(body4.answer)?.slice(0,120)}`);
      check('matchedConcept unchanged by LLM', body4.matchedConcept?.name === 'Resistance');
      check('confidence unchanged by LLM', body4.confidence === body1.confidence);
      console.log(`  answer: "${String(body4.answer).slice(0, 140)}..."`);
    } else {
      console.log('\n--- skipping phrase=true (set SMOKE_PHRASE=1 to enable) ---');
    }

    // ── 8. Negative: missing q ─────────────────────────────────────
    console.log('\n--- POST .../query missing q ---');
    const r5 = await fetch(`${BASE}/api/lectures/${lectureJobId}/query`, {
      method: 'POST', headers: authHeaders, body: JSON.stringify({}),
    });
    check('missing q → 400', r5.status === 400);

    // ── 9. Negative: unknown lecture id ────────────────────────────
    console.log('\n--- POST .../query unknown lecture ---');
    const r6 = await fetch(`${BASE}/api/lectures/${randomUUID()}/query`, {
      method: 'POST', headers: authHeaders, body: JSON.stringify({ q: 'x' }),
    });
    check('unknown lecture → 404', r6.status === 404, `got ${r6.status}`);

    // ── 10. Negative: bad UUID ─────────────────────────────────────
    console.log('\n--- POST .../query invalid UUID ---');
    const r7 = await fetch(`${BASE}/api/lectures/not-a-uuid/query`, {
      method: 'POST', headers: authHeaders, body: JSON.stringify({ q: 'x' }),
    });
    check('invalid UUID → 400', r7.status === 400);

  } finally {
    await cleanup();
    console.log('\n(synthetic lecture_jobs row cleaned up)');
  }

  console.log(`\n=== Sprint 9-D HTTP SMOKE ${failed === 0 ? 'PASSED' : 'FAILED'} ===`);
  console.log(`  passed: ${passed}`);
  console.log(`  failed: ${failed}`);
  if (failed > 0) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
