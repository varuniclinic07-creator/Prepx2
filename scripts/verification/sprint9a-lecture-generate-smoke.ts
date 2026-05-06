// Sprint 9-A smoke — async lecture generation E2E.
//
// 1. POST /api/lectures/generate {topic: 'ohms-law', skipLtx: true}
// 2. Poll GET /api/lectures/{jobId} until status = completed | failed
// 3. Validate manifest signed URLs return 200 + non-trivial bytes
// 4. Validate metadata.json + manifest.json shapes
//
// Run:
//   npx dotenv-cli -e .env.local -- npx tsx scripts/verification/sprint9a-lecture-generate-smoke.ts
//
// Requires:
//   - dev server running at http://localhost:3000
//   - SUPABASE_SERVICE_ROLE_KEY in .env.local (used to mint a smoke-user session token)
//   - Migration 078 applied
//   - Hermes worker running

import { createClient } from '@supabase/supabase-js';

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SR  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!URL || !SR) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

async function main() {
  console.log('=== Sprint 9-A — lecture-generate smoke ===');

  const admin = createClient(URL, SR, { auth: { persistSession: false } });

  // 1. Find or create a smoke user.
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
    if (error || !created?.user?.id) {
      throw new Error(`createUser failed: ${error?.message}`);
    }
    userId = created.user.id;
    console.log(`smoke user created: ${smokeEmail} ${userId}`);
  }

  // 2. Mint a session for that user via signInWithPassword fallback (admin
  // generated tokens require the magic link flow). Simpler: sign in the user
  // via password (we just set/reset it).
  const ephemeral = 'Sprint9Smoke_' + Math.random().toString(36).slice(2) + '!';
  await admin.auth.admin.updateUserById(userId!, { password: ephemeral });
  const userClient = createClient(URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', { auth: { persistSession: false } });
  const { data: sess, error: signErr } = await userClient.auth.signInWithPassword({ email: smokeEmail, password: ephemeral });
  if (signErr || !sess?.session?.access_token) {
    throw new Error(`signIn failed: ${signErr?.message}`);
  }
  const accessToken = sess.session.access_token;

  // 3. POST /api/lectures/generate
  console.log('\n--- POST /api/lectures/generate ---');
  const postRes = await fetch(`${BASE}/api/lectures/generate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: `sb-access-token=${accessToken}; sb-refresh-token=${sess.session.refresh_token}`,
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ topic: 'ohms-law', skipLtx: true, durationSeconds: 35 }),
  });
  const postBody = await postRes.json();
  if (!postRes.ok) {
    throw new Error(`POST /generate failed ${postRes.status}: ${JSON.stringify(postBody)}`);
  }
  console.log('  job:', postBody);
  const jobId: string = postBody.jobId;
  if (!jobId) throw new Error('no jobId returned');

  // 4. Poll GET /api/lectures/jobs/{jobId}
  console.log('\n--- polling GET /api/lectures/jobs/[jobId] ---');
  const deadline = Date.now() + 20 * 60 * 1000; // 20 min budget for skip-ltx
  let last: any = null;
  let transientFails = 0;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 5_000));
    let body: any = null;
    try {
      const getRes = await fetch(`${BASE}/api/lectures/jobs/${jobId}`, {
        headers: {
          cookie: `sb-access-token=${accessToken}; sb-refresh-token=${sess.session.refresh_token}`,
          authorization: `Bearer ${accessToken}`,
        },
      });
      const text = await getRes.text();
      // Next dev server can briefly return an HTML error page when a route
      // recompiles. Tolerate a handful of those instead of aborting the whole run.
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
    console.log(`  [${body.status}] ${body.progress?.percent ?? 0}%`);
    if (body.status === 'completed') break;
    if (body.status === 'failed') throw new Error(`job failed: ${body.error}`);
  }
  if (last?.status !== 'completed') {
    throw new Error(`job did not complete in time. last=${JSON.stringify(last).slice(0, 500)}`);
  }

  // 5. Validate signed URLs
  console.log('\n--- validating signed URLs ---');
  const urls = last.outputs;
  if (!urls?.videoUrl || !urls?.notesUrl || !urls?.quizUrl || !urls?.timelineUrl || !urls?.metadataUrl || !urls?.manifestUrl) {
    throw new Error(`outputs missing required URLs: ${JSON.stringify(Object.keys(urls || {}))}`);
  }

  const checks: Array<[string, string, number]> = [
    ['video',    urls.videoUrl,    100_000],
    ['notes',    urls.notesUrl,    500],
    ['notesPdf', urls.notesPdfUrl, 500],
    ['quiz',     urls.quizUrl,     500],
    ['timeline', urls.timelineUrl, 500],
    ['metadata', urls.metadataUrl, 500],
    ['manifest', urls.manifestUrl, 200],
  ];
  for (const [label, url, minBytes] of checks) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${label} HEAD failed ${r.status}`);
    const buf = await r.arrayBuffer();
    if (buf.byteLength < minBytes) throw new Error(`${label} too small (${buf.byteLength} < ${minBytes})`);
    console.log(`  ✔ ${label.padEnd(8)} ${(buf.byteLength / 1024).toFixed(1)} KB`);
  }

  // 6. Spot-check manifest.json content.
  const manifestRes = await fetch(urls.manifestUrl);
  const manifest = await manifestRes.json();
  if (!manifest.lectureId || !manifest.signedUrls?.video) {
    throw new Error(`manifest.json malformed: ${JSON.stringify(manifest).slice(0, 400)}`);
  }
  console.log(`  ✔ manifest.lectureId = ${manifest.lectureId}`);

  // 7. Spot-check metadata.json content.
  const metaRes = await fetch(urls.metadataUrl);
  const meta = await metaRes.json();
  if (!meta.video?.duration || !meta.pipeline?.stages) {
    throw new Error(`metadata.json malformed: ${JSON.stringify(meta).slice(0, 400)}`);
  }
  console.log(`  ✔ metadata.video.duration = ${meta.video.duration}s, stages = ${Object.keys(meta.pipeline.stages).length}`);

  console.log('\n=== Sprint 9-A SMOKE PASSED ===');
  process.exit(0);
}

main().catch(e => {
  console.error('\n FATAL', e?.stack || e?.message || e);
  process.exit(1);
});
