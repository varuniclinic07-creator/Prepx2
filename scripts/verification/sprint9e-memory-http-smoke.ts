// Sprint 9-E — HTTP E2E smoke for adaptive memory.
//
// Walks the full event-loop end-to-end:
//   1. Seed smoke user, sign in (bearer token).
//   2. Insert synthetic completed lecture_jobs row with concept_index
//      (Resistance + Voltage).
//   3. Fire 3 replay_clicked + 3 concept_queried events for Resistance
//      via POST /api/learning/events (real HTTP, real server, real DB).
//   4. GET /api/learning/memory/[lectureJobId] — assert:
//        - Resistance row exists
//        - replay_count = 3, query_count = 3
//        - status = 'struggling'
//        - mastery_score = 0.30 (0.5 - 0.10 replay - 0.10 query, no quiz)
//   5. Fire 1 quiz_passed for Voltage. Refetch memory. Assert:
//        - Voltage row exists, status = 'mastered', score = 0.75.
//   6. Negative cases: invalid eventType (400), unknown conceptId for
//      this lecture (422), missing lectureJobId (400).
//   7. Cleanup (cascade via lecture_jobs DELETE).
//
// Run:
//   NEXT_PUBLIC_BASE_URL=http://localhost:3000 \
//     npx dotenv-cli -e .env.local -- \
//     npx tsx scripts/verification/sprint9e-memory-http-smoke.ts

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SR   = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
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
      id: 'resistance', name: 'Resistance', definition: 'Opposition to electric current.',
      difficulty: 'beginner', search_tokens: ['resistance', 'opposition', 'current'],
      scene_positions: [2, 3], timestamps: [{ start: 12.3, end: 18.7 }],
      replay_segments: [{ start: 12.3, end: 18.7 }], formulas: ['V = IR'],
      related_notes: [], related_quiz_mcq_ids: [1], learning_objectives: ['Define resistance.'],
    },
    {
      id: 'voltage', name: 'Voltage', definition: 'Electrical potential difference.',
      difficulty: 'beginner', search_tokens: ['voltage', 'potential', 'difference'],
      scene_positions: [2], timestamps: [{ start: 12.3, end: 18.7 }],
      replay_segments: [{ start: 12.3, end: 18.7 }], formulas: ['V = IR'],
      related_notes: [], related_quiz_mcq_ids: [2], learning_objectives: ['Define voltage.'],
    },
  ],
};

async function main() {
  console.log('=== Sprint 9-E — memory HTTP smoke ===\n');

  const admin = createClient(URL, SR, { auth: { persistSession: false } });

  // ── smoke user ────────────────────────────────────────────────────
  const smokeEmail = process.env.SMOKE_USER_EMAIL || 'sprint9e-smoke@prepx.test';
  let userId: string;
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list?.users?.find((u: any) => u.email === smokeEmail);
  if (existing) {
    userId = existing.id;
  } else {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: smokeEmail, password: 'Sprint9E!' + Math.random().toString(36).slice(2), email_confirm: true,
    });
    if (error || !created?.user?.id) throw new Error(`createUser: ${error?.message}`);
    userId = created.user.id;
  }
  await admin.from('users').upsert({ id: userId, email: smokeEmail }, { onConflict: 'id' });

  // ── sign in ───────────────────────────────────────────────────────
  const ephemeral = 'Sprint9E_' + Math.random().toString(36).slice(2) + '!';
  await admin.auth.admin.updateUserById(userId, { password: ephemeral });
  const userClient = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data: sess, error: signErr } = await userClient.auth.signInWithPassword({ email: smokeEmail, password: ephemeral });
  if (signErr || !sess?.session) throw new Error(`signIn: ${signErr?.message}`);
  const accessToken = sess.session.access_token;
  const headers = {
    'content-type': 'application/json',
    authorization: `Bearer ${accessToken}`,
  };

  // ── seed lecture_jobs row ─────────────────────────────────────────
  const lectureJobId = randomUUID();
  const lectureBizId = `lec_smoke9e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const { error: insErr } = await admin.from('lecture_jobs').insert({
    id: lectureJobId,
    user_id: userId,
    lecture_id: lectureBizId,
    topic: 'ohms-law',
    params: { topic: 'ohms-law', durationSeconds: 35, style: 'classroom' },
    status: 'completed',
    progress_percent: 100,
    storage_prefix: `smoke/9e/${lectureJobId}`,
    metadata: { pipeline: 'sprint9e-smoke', concept_index: synthIndex },
    stage_log: [],
  });
  if (insErr) throw new Error(`insert lecture_jobs: ${insErr.message}`);
  console.log(`smoke user: ${smokeEmail} ${userId}`);
  console.log(`synthetic lecture_jobs row: ${lectureJobId}\n`);

  let cleaned = false;
  const cleanup = async () => {
    if (cleaned) return;
    cleaned = true;
    await admin.from('lecture_jobs').delete().eq('id', lectureJobId);
    // user_learning_events + user_concept_memory cascade via FK ON DELETE.
  };

  try {
    // ── 1. Fire 3 replay + 3 query events for Resistance ───────────
    console.log('--- POST /api/learning/events × 6 (Resistance) ---');
    for (let i = 0; i < 3; i++) {
      const r = await fetch(`${BASE}/api/learning/events`, {
        method: 'POST', headers,
        body: JSON.stringify({
          lectureJobId, conceptId: 'resistance', conceptName: 'Resistance',
          eventType: 'replay_clicked',
          metadata: { segmentStart: 12.3, segmentEnd: 18.7 },
        }),
      });
      check(`replay_clicked #${i + 1} → 200`, r.status === 200);
    }
    for (let i = 0; i < 3; i++) {
      const r = await fetch(`${BASE}/api/learning/events`, {
        method: 'POST', headers,
        body: JSON.stringify({
          lectureJobId, conceptId: 'resistance', conceptName: 'Resistance',
          eventType: 'concept_queried',
          metadata: { intent: 'what-is', confidence: 0.99 },
        }),
      });
      check(`concept_queried #${i + 1} → 200`, r.status === 200);
    }

    // ── 2. GET memory snapshot ─────────────────────────────────────
    console.log('\n--- GET /api/learning/memory/[lectureId] ---');
    const m1 = await fetch(`${BASE}/api/learning/memory/${lectureJobId}`, { headers });
    const body1 = await m1.json();
    check('memory GET → 200', m1.status === 200);
    check('memory.lectureId echoed', body1.lectureId === lectureJobId);
    check('memory.concepts is an array', Array.isArray(body1.concepts));

    const resistance = body1.concepts.find((c: any) => c.concept_id === 'resistance');
    check('Resistance row exists', !!resistance);
    if (resistance) {
      check('replay_count = 3',         resistance.replay_count === 3, `got ${resistance.replay_count}`);
      check('query_count = 3',          resistance.query_count === 3,  `got ${resistance.query_count}`);
      check('quiz_fail_count = 0',      resistance.quiz_fail_count === 0);
      check('status = struggling',      resistance.status === 'struggling', `got ${resistance.status}`);
      // 0.5 - 0.10 (replay>2) - 0.10 (query>2) = 0.30
      check('mastery_score = 0.30',     Math.abs(Number(resistance.mastery_score) - 0.30) < 0.001, `got ${resistance.mastery_score}`);
      check('last_event_at populated',  !!resistance.last_event_at);
    }
    check('summary.struggling >= 1',    body1.summary.struggling >= 1);

    // ── 3. Fire quiz_passed for Voltage → expect mastered ──────────
    console.log('\n--- POST quiz_passed for Voltage ---');
    const qp = await fetch(`${BASE}/api/learning/events`, {
      method: 'POST', headers,
      body: JSON.stringify({
        lectureJobId, conceptId: 'voltage', conceptName: 'Voltage',
        eventType: 'quiz_passed', metadata: { mcqId: 2 },
      }),
    });
    check('quiz_passed → 200', qp.status === 200);

    const m2 = await fetch(`${BASE}/api/learning/memory/${lectureJobId}`, { headers });
    const body2 = await m2.json();
    const voltage = body2.concepts.find((c: any) => c.concept_id === 'voltage');
    check('Voltage row exists', !!voltage);
    if (voltage) {
      check('Voltage status = mastered',     voltage.status === 'mastered', `got ${voltage.status}`);
      check('Voltage mastery_score = 0.75',  Math.abs(Number(voltage.mastery_score) - 0.75) < 0.001, `got ${voltage.mastery_score}`);
      check('Voltage quiz_pass_count = 1',   voltage.quiz_pass_count === 1);
    }
    check('summary.mastered >= 1', body2.summary.mastered >= 1);

    // ── 4. Negative cases ──────────────────────────────────────────
    console.log('\n--- negative cases ---');
    const bad1 = await fetch(`${BASE}/api/learning/events`, {
      method: 'POST', headers,
      body: JSON.stringify({ lectureJobId, eventType: 'flying_unicorn' }),
    });
    check('invalid eventType → 400', bad1.status === 400);

    const bad2 = await fetch(`${BASE}/api/learning/events`, {
      method: 'POST', headers,
      body: JSON.stringify({ lectureJobId, conceptId: 'photosynthesis', conceptName: 'Photosynthesis', eventType: 'concept_queried' }),
    });
    check('unknown conceptId for this lecture → 422', bad2.status === 422);

    const bad3 = await fetch(`${BASE}/api/learning/events`, {
      method: 'POST', headers,
      body: JSON.stringify({ eventType: 'replay_clicked' }),
    });
    check('missing lectureJobId → 400', bad3.status === 400);

    const bad4 = await fetch(`${BASE}/api/learning/memory/not-a-uuid`, { headers });
    check('GET memory invalid UUID → 400', bad4.status === 400);

  } finally {
    await cleanup();
    console.log('\n(synthetic lecture_jobs row cleaned up — events + memory cascaded)');
  }

  console.log(`\n=== Sprint 9-E HTTP SMOKE ${failed === 0 ? 'PASSED' : 'FAILED'} ===`);
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
