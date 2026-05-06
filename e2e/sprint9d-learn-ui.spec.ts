// Sprint 9-D Phase D — Playwright UI smoke for /lectures/[id]/learn.
//
// Real browser walk:
//   1. Seed a smoke user + completed lecture_jobs row (with concept_index)
//      via service-role admin client.
//   2. Upload outputs/mvp/lecture.mp4 to the lectures-mvp bucket so the
//      signed URL the page mints actually serves.
//   3. Sign the user in via storage cookies, navigate to /lectures/[id]/learn.
//   4. Assert title, "Ask this lecture" header, and <video> render.
//   5. Type "What is resistance?", click Ask, wait for response card.
//   6. Assert: concept badge "Resistance", confidence chip, replay chip.
//   7. Click the first replay chip → assert video.currentTime jumped.
//   8. Cleanup (delete lecture_jobs row + storage object).
//
// Run:
//   npx dotenv-cli -e .env.local -- \
//     npx playwright test e2e/sprint9d-learn-ui.spec.ts \
//       --config e2e/playwright.sprint9d.config.ts

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';
import path from 'path';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SR   = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const SMOKE_EMAIL = process.env.SMOKE_USER_EMAIL || 'sprint9d-ui-smoke@prepx.test';
const MP4_PATH = process.env.SMOKE_MP4 || path.resolve('outputs/mvp/lecture.mp4');

if (!SUPA_URL || !SR || !ANON) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY required');
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
  ],
};

interface Seeded {
  userId: string;
  lectureJobId: string;
  storagePrefix: string;
  cleanup: () => Promise<void>;
}

async function seed(): Promise<Seeded & { accessToken: string; refreshToken: string }> {
  const admin = createClient(SUPA_URL, SR, { auth: { persistSession: false } });

  // user
  const list = await admin.auth.admin.listUsers();
  let userId: string;
  const existing = list.data?.users?.find((u: any) => u.email === SMOKE_EMAIL);
  if (existing) {
    userId = existing.id;
  } else {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: SMOKE_EMAIL,
      password: 'Sprint9DUi!' + Math.random().toString(36).slice(2),
      email_confirm: true,
    });
    if (error || !created?.user?.id) throw new Error(`createUser: ${error?.message}`);
    userId = created.user.id;
  }
  await admin.from('users').upsert({ id: userId, email: SMOKE_EMAIL }, { onConflict: 'id' });

  // sign in to mint tokens (used by Playwright via cookies)
  const ephemeral = 'Sprint9DUi_' + Math.random().toString(36).slice(2) + '!';
  await admin.auth.admin.updateUserById(userId, { password: ephemeral });
  const userClient = createClient(SUPA_URL, ANON, { auth: { persistSession: false } });
  const { data: sess, error: signErr } = await userClient.auth.signInWithPassword({
    email: SMOKE_EMAIL, password: ephemeral,
  });
  if (signErr || !sess?.session) throw new Error(`signIn: ${signErr?.message}`);
  const accessToken = sess.session.access_token;
  const refreshToken = sess.session.refresh_token;

  // upload MP4 to storage
  const lectureJobId = randomUUID();
  const storagePrefix = `${userId}/${lectureJobId}`;
  const mp4 = readFileSync(MP4_PATH);
  const { error: upErr } = await admin.storage
    .from('lectures-mvp')
    .upload(`${storagePrefix}/lecture.mp4`, mp4, { contentType: 'video/mp4', upsert: true });
  if (upErr) throw new Error(`storage upload: ${upErr.message}`);

  // insert row
  const lectureBizId = `lec_smoke9dui_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const { error: insErr } = await admin.from('lecture_jobs').insert({
    id: lectureJobId,
    user_id: userId,
    lecture_id: lectureBizId,
    topic: 'ohms-law',
    params: { topic: 'ohms-law', durationSeconds: 35, style: 'classroom' },
    status: 'completed',
    progress_percent: 100,
    storage_prefix: storagePrefix,
    metadata: { pipeline: 'sprint9d-ui-smoke', concept_index: synthIndex },
    stage_log: [],
  });
  if (insErr) throw new Error(`insert: ${insErr.message}`);

  const cleanup = async () => {
    await admin.from('lecture_jobs').delete().eq('id', lectureJobId);
    await admin.storage.from('lectures-mvp').remove([`${storagePrefix}/lecture.mp4`]);
  };

  return { userId, lectureJobId, storagePrefix, cleanup, accessToken, refreshToken };
}

test('Sprint 9-D — /lectures/[id]/learn AskExplanation walk', async ({ page, context }) => {
  test.setTimeout(60_000);
  const seeded = await seed();

  try {
    // Authenticate via the bearer-header fallback in lib/supabase-server.ts.
    // This applies to ALL requests this Playwright context makes — both the
    // page navigation (server component reads Authorization header) and the
    // /api/lectures/[id]/query fetch the panel triggers (same context, same
    // header, same auth).
    await context.setExtraHTTPHeaders({
      authorization: `Bearer ${seeded.accessToken}`,
    });

    await page.goto(`${BASE}/lectures/${seeded.lectureJobId}/learn`, { waitUntil: 'domcontentloaded' });

    // ── 1. Page renders ──────────────────────────────────────────────
    await expect(page.locator('h1')).toContainText("Ohm's Law", { timeout: 15_000 });
    await expect(page.getByText('Ask this lecture')).toBeVisible();
    await expect(page.locator('video')).toHaveCount(1);

    // ── 2. Submit a question ────────────────────────────────────────
    await page.getByPlaceholder(/What is resistance/i).fill('What is resistance?');
    await page.getByRole('button', { name: /^Ask$/ }).click();

    // ── 3. Response card renders with grounded fields ───────────────
    // The card shows "concept: Resistance" and the intent + confidence row.
    const responseCard = page.locator('text=Resistance').first();
    await expect(responseCard).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('text=/conf\\s+\\d+\\.\\d+/').first()).toBeVisible();
    // formula card should show V = IR
    await expect(page.locator('text=V = IR').first()).toBeVisible();

    // ── 4. Click a replay chip → video seeks ─────────────────────────
    const initialTime = await page.locator('video').evaluate((v: any) => v.currentTime);
    expect(initialTime).toBeLessThan(0.5);
    await page.locator('button[title^="Replay"]').first().click();
    // give the click a tick to apply
    await page.waitForTimeout(250);
    const after = await page.locator('video').evaluate((v: any) => v.currentTime);
    expect(after).toBeGreaterThan(10);

  } finally {
    await seeded.cleanup();
  }
});
