// Sprint 9-B smoke — Product B "Explain This" / AI Doubt Solver E2E.
//
// 1. POST /api/concepts/generate with raw text (Newton's Second Law) +
//    skipLtx:true to keep the bake under 60 s.
// 2. Poll GET /api/concepts/jobs/{jobId} until completed | failed.
// 3. Validate manifest signed URLs return 200 + non-trivial bytes.
// 4. Spot-check enriched metadata.json contains the concept block (formulas,
//    learning_objectives, source).
//
// Run:
//   npx dotenv-cli -e .env.local -- npx tsx scripts/verification/sprint9b-concept-generate-smoke.ts
//
// Requires:
//   - dev server running at http://localhost:3000
//   - SUPABASE_SERVICE_ROLE_KEY in .env.local
//   - Migration 079 applied
//   - Hermes worker running with the concept-generate processor wired

import { createClient } from '@supabase/supabase-js';

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SR  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!URL || !SR) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const SAMPLE_TEXT = `Newton's Second Law of Motion states that the force acting on an object is equal to the mass of the object multiplied by its acceleration: F = m × a.
Force (F) is measured in Newtons, mass (m) in kilograms, and acceleration (a) in meters per second squared.
This law tells us that the larger the mass, the more force is required to produce the same acceleration. Conversely, a fixed force will produce greater acceleration on a lighter object.
A common misconception is that velocity is proportional to force; in fact, force changes velocity (i.e., causes acceleration). An object can move at constant velocity with zero net force.
Worked intuition: a 2 kg ball pushed with 10 N accelerates at 5 m/s² (a = F/m = 10/2 = 5).
Learning objectives: define force, mass, and acceleration; apply F = m × a to simple problems; distinguish velocity from acceleration; explain why heavier objects need more force.`;

async function main() {
  console.log('=== Sprint 9-B — concept-generate smoke ===');

  const admin = createClient(URL, SR, { auth: { persistSession: false } });

  const smokeEmail = process.env.SMOKE_USER_EMAIL || 'sprint9-smoke@prepx.test';
  let userId: string | null = null;
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list?.users?.find((u: any) => u.email === smokeEmail);
  if (existing) {
    userId = existing.id;
    console.log(`smoke user exists: ${smokeEmail} ${userId}`);
  } else {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: smokeEmail,
      password: 'Sprint9Smoke!' + Math.random().toString(36).slice(2),
      email_confirm: true,
    });
    if (error || !created?.user?.id) throw new Error(`createUser failed: ${error?.message}`);
    userId = created.user.id;
    console.log(`smoke user created: ${smokeEmail} ${userId}`);
  }

  const ephemeral = 'Sprint9Smoke_' + Math.random().toString(36).slice(2) + '!';
  await admin.auth.admin.updateUserById(userId!, { password: ephemeral });
  const userClient = createClient(URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', { auth: { persistSession: false } });
  const { data: sess, error: signErr } = await userClient.auth.signInWithPassword({ email: smokeEmail, password: ephemeral });
  if (signErr || !sess?.session?.access_token) throw new Error(`signIn failed: ${signErr?.message}`);
  const accessToken = sess.session.access_token;
  const cookieHeader = `sb-access-token=${accessToken}; sb-refresh-token=${sess.session.refresh_token}`;

  // 1. POST /api/concepts/generate (raw-text mode)
  console.log('\n--- POST /api/concepts/generate (rawText) ---');
  const postRes = await fetch(`${BASE}/api/concepts/generate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: cookieHeader,
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      rawText: SAMPLE_TEXT,
      documentName: 'newtons-second-law-sample.txt',
      style: 'concept-short',
      difficulty: 'beginner',
      language: 'en',
      skipLtx: true,
    }),
  });
  const postBody = await postRes.json();
  if (!postRes.ok) throw new Error(`POST /generate failed ${postRes.status}: ${JSON.stringify(postBody)}`);
  console.log('  job:', postBody);
  const jobId: string = postBody.jobId;
  if (!jobId) throw new Error('no jobId returned');

  // 2. Poll GET /api/concepts/jobs/{jobId}
  console.log('\n--- polling GET /api/concepts/jobs/[jobId] ---');
  const deadline = Date.now() + 25 * 60 * 1000;
  let last: any = null;
  let transientFails = 0;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 5_000));
    let body: any = null;
    try {
      const getRes = await fetch(`${BASE}/api/concepts/jobs/${jobId}`, {
        headers: { cookie: cookieHeader, authorization: `Bearer ${accessToken}` },
      });
      const text = await getRes.text();
      if (text.startsWith('<') || !text.trim()) {
        transientFails++;
        console.log(`  [poll] transient non-JSON response (count=${transientFails})`);
        if (transientFails > 12) throw new Error(`too many non-JSON poll responses (${transientFails})`);
        continue;
      }
      body = JSON.parse(text);
      if (!getRes.ok) throw new Error(`GET failed ${getRes.status}: ${JSON.stringify(body)}`);
      transientFails = 0;
    } catch (e: any) {
      transientFails++;
      console.log(`  [poll] error (count=${transientFails}): ${e?.message?.slice(0, 120)}`);
      if (transientFails > 12) throw e;
      continue;
    }
    last = body;
    console.log(`  [${body.status}] ${body.progress?.percent ?? 0}%${body.detectedTopic ? ` — ${body.detectedTopic}` : ''}`);
    if (body.status === 'completed') break;
    if (body.status === 'failed') throw new Error(`job failed: ${body.error}`);
  }
  if (last?.status !== 'completed') {
    throw new Error(`job did not complete in time. last=${JSON.stringify(last).slice(0, 500)}`);
  }

  // 3. Validate signed URLs
  console.log('\n--- validating signed URLs ---');
  const urls = last.outputs;
  if (!urls?.explainerUrl || !urls?.notesUrl || !urls?.quizUrl || !urls?.recapUrl || !urls?.timelineUrl || !urls?.metadataUrl || !urls?.manifestUrl) {
    throw new Error(`outputs missing required URLs: ${JSON.stringify(Object.keys(urls || {}))}`);
  }

  const checks: Array<[string, string, number]> = [
    ['explainer', urls.explainerUrl, 100_000],
    ['notes',     urls.notesUrl,     500],
    ['notesPdf',  urls.notesPdfUrl,  500],
    ['quiz',      urls.quizUrl,      500],
    ['recap',     urls.recapUrl,     200],
    ['timeline',  urls.timelineUrl,  500],
    ['metadata',  urls.metadataUrl,  500],
    ['manifest',  urls.manifestUrl,  200],
  ];
  for (const [label, url, minBytes] of checks) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${label} HEAD failed ${r.status}`);
    const buf = await r.arrayBuffer();
    if (buf.byteLength < minBytes) throw new Error(`${label} too small (${buf.byteLength} < ${minBytes})`);
    console.log(`  ✔ ${label.padEnd(10)} ${(buf.byteLength / 1024).toFixed(1)} KB`);
  }

  // 4. Spot-check enriched metadata.json
  const metaRes = await fetch(urls.metadataUrl);
  const meta = await metaRes.json();
  if (!meta.concept || !meta.concept.detected_topic || !Array.isArray(meta.concept.learning_objectives)) {
    throw new Error(`metadata.json missing concept block: ${JSON.stringify(meta).slice(0, 400)}`);
  }
  console.log(`  ✔ concept.detected_topic = "${meta.concept.detected_topic}"`);
  console.log(`  ✔ concept.formulas       = ${JSON.stringify(meta.concept.formulas).slice(0, 100)}`);
  console.log(`  ✔ concept.objectives     = ${meta.concept.learning_objectives.length} items`);

  // 5. Spot-check recap.json
  const recapRes = await fetch(urls.recapUrl);
  const recap = await recapRes.json();
  if (!recap.topic || !Array.isArray(recap.learning_objectives)) {
    throw new Error(`recap.json malformed: ${JSON.stringify(recap).slice(0, 200)}`);
  }
  console.log(`  ✔ recap.topic            = "${recap.topic}"`);

  console.log('\n=== Sprint 9-B SMOKE PASSED ===');
  process.exit(0);
}

main().catch(e => {
  console.error('\n FATAL', e?.stack || e?.message || e);
  process.exit(1);
});
