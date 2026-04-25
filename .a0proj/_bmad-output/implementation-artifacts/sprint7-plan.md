---
sprint: 7
status: formal-plan-draft → awaiting approval
date: 2026-04-24
persona: BMAD Bob (Scrum Master)
velocity_basis: 1 solo full-stack dev, ~5 story points / 2-week sprint
dependency: Sprint 6 Retrospective Complete
---

# 🏃 Sprint 7 Plan: MVP Production Readiness

## Sprint Goal
Close the MVP for production launch by hardening the content pipeline, implementing E2E tests, shipping bilingual UI, deploying to Vercel with CI/CD, and executing the first full content generation run across all 185 topics.

**Sprint Duration:** 2 weeks (recommended 3 weeks given test hardening)
**Capacity:** 1 solo full-stack dev
**Risk:** LOW-MEDIUM — All infrastructure exists, work is assembly + polish.

---

## 📋 Story Order (Dependency-First)

```
S1  Test Infrastructure + Playwright E2E    ← CRITICAL PATH
  ├─ S1.1 Install Playwright + Vitest
  ├─ S1.2 E2E test: onboarding → quiz → dashboard
  ├─ S1.3 E2E test: admin scraper pipeline trigger
  └─ S1.4 Vitest unit tests for subscription gating

S2  Content Pipeline Execution            ← depends S1 (need working tests to verify)
  ├─ S2.1 Execute scraper → generate first 5 topics (polity)
  ├─ S2.2 Execute batch across all 19 subjects
  ├─ S2.3 Verify Hindi translation quality
  └─ S2.4 Spot-check 10 topics for brand sanitization

S3  Bilingual UI Polish                    ← independent, can run parallel
  ├─ S3.1 TopicViewer EN/HI toggle component
  ├─ S3.2 Language preference in user profile
  └─ S3.3 Mobile responsiveness pass

S4  GSScore Source + Scraper Hardening  ← independent
  ├─ S4.1 Add `gsscore.in` to scraper config
  ├─ S4.2 Exponential backoff retry in engine.ts
  └─ S4.3 Cloudflare CAPTCHA graceful handling

S5  Production Deploy                     ← depends S1, S3, S4
  ├─ S5.1 GitHub Actions CI/CD pipeline
  ├─ S5.2 Vercel deployment + domain config
  ├─ S5.3 Supabase production project setup
  └─ S5.4 Environment variable audit
```

---

## Story S1: Test Infrastructure + Playwright E2E

**Epic:** 27 — Quality Assurance & Production Hardening
**Priority:** P0 — BLOCKS PRODUCTION LAUNCH
**Estimated Effort:** 4 dev-days (8 story points)
**Dependencies:** None — foundational

### Scope
- [x] In Scope: Playwright install, 5 E2E tests, Vitest config, subscription gating tests
- [ ] Out of Scope: Performance testing, load testing, chaos testing

### Tasks

- [ ] **S1.1** Install Playwright properly
  - `npm install -D @playwright/test`
  - `npx playwright install chromium`
  - Create `e2e/playwright.config.ts` ← do NOT conflict with existing `vitest.config.ts`
  - Verify Chromium browser launchable in Docker container

- [ ] **S1.2** E2E Test: Aspirant Journey
  ```
  test('onboarding → quiz → dashboard', async () => {
    await page.goto('/onboarding');
    // Complete 5-question diagnostic
    // Verify redirect to login → sign up → dashboard
    // Verify daily plan visible
    // Click topic → topic viewer loads
    // Click quiz → submit → score visible
  });
  ```

- [ ] **S1.3** E2E Test: Admin Scraper Pipeline
  ```
  test('admin triggers pipeline and sees results', async () => {
    await loginAsAdmin();
    await page.goto('/admin/scraper');
    await page.selectOption('select', 'pib');
    await page.click('button:has-text("Run")');
    await page.waitForSelector('pre');
    await expect(page.locator('pre')).toContainText('Scraped:');
  });
  ```

- [ ] **S1.4** Vitest Unit Tests for Subscription Gating
  - `lib/subscription.ts` — `hasFeature()` returns correct booleans per tier
  - `lib/subscription.ts` — `getUserPlan()` falls back to 'free'
  - `lib/subscription.ts` — `canUseFeature()` blocks free users from premium features

### Acceptance Criteria
- [ ] `npx playwright test` runs all 3 E2E tests (chromium)
- [ ] `npx vitest run` runs all subscription gating unit tests
- [ ] No test failures in CI/CD pipeline
- [ ] All tests pass in Docker container (Kali Linux)

### Definition of Done
- [ ] Playwright CI config in GitHub Actions YAML
- [ ] Test artifacts committed to repo
- [ ] `npm run test:e2e` script in package.json
- [ ] Screenshot artifacts on test failure

---

## Story S2: Content Pipeline Execution

**Epic:** 28 — Content Generation at Scale
**Priority:** P0 — MVP must have real content before launch
**Estimated Effort:** 3 dev-days (6 story points)
**Dependencies:** S1.1 (Playwright working, but can run locally if not)

### Tasks

- [ ] **S2.1** Generate first 5 Polity topics
  - Admin panel `/admin/scraper` → Select `pib` → Run
  - Verify content is NOT template filler (definitions contain real UPSC facts)
  - Verify `content_hi` has real Hindi
  - Verify brand sanitizer stripped coaching names

- [ ] **S2.2** Batch generate across all 19 subjects × 10 topics average
  - Use `/admin/scraper` → "All Sources" → Run Full Pipeline
  - Cost estimate: 185 topics × ~₹3/topic = ₹555 ($7) total
  - Run overnight if needed (batch mode)

- [ ] **S2.3** Verify Hindi translation quality
  - Random sample 5 topics → read Hindi JSONB
  - Verify Devanagari script present
  - Verify no English words leaked into Hindi

- [ ] **S2.4** Spot-check 10 topics for brand sanitization
  - Search `topics.content` JSONB for blocked strings: VisionIAS, DrishtiIAS, InsightsOnIndia, IAS Baba, IASScore, Shankar IAS, NextIAS, GSScore
  - Expected: ZERO matches

### Acceptance Criteria
- [ ] ≥50 topics have non-template English content
- [ ] ≥50 topics have non-template Hindi content
- [ ] Zero coaching brand mentions in sampled topics
- [ ] `npx next build` still passes cleanly

---

## Story S3: Bilingual UI Polish

**Epic:** 29 — Localization & Accessibility
**Priority:** P1
**Estimated Effort:** 2 dev-days (4 story points)
**Dependencies:** S2.2 (content must exist first)

### Tasks

- [ ] **S3.1** TopicViewer Toggle
  - Add language toggle `<EN | HI>` button
  - Toggle renders `content` (English) vs `content_hi` (Hindi)
  - Persist preference in localStorage
  - Default to user's detected language (accept-language header)

- [ ] **S3.2** Language Preference in User Profile
  - Add `preferred_language` ENUM `en` | `hi` to `users` table
  - Update onboarding page to ask "Study in English or Hindi?"
  - Update dashboard to show content in preferred language

- [ ] **S3.3** Mobile Responsiveness
  - Test `/topic/[id]` and `/quiz/[id]` on 375px width
  - Fix any layout breaks in TopicViewer, QuizComponent, DailyPlan
  - Admin panels are desktop-only; aspirant pages must be mobile-friendly

### Acceptance Criteria
- [ ] User can toggle between EN and HI on any topic
- [ ] Toggle persists across sessions
- [ ] Hindi content renders correct Devanagari script
- [ ] All aspirant pages pass basic mobile viewport check

---

## Story S4: GSScore Source + Scraper Hardening

**Epic:** 30 — Content Coverage Expansion
**Priority:** P1
**Estimated Effort:** 1.5 dev-days (3 story points)
**Dependencies:** None

### Tasks

- [ ] **S4.1** Add GSScore to scraper config
  - Source: `https://gsscore.in/` (or `https://iasscore.in/` if same domain)
  - Check if GSScore is different from IASScore — add separate entry if URL differs
  - If same domain with different paths, update selectors only

- [ ] **S4.2** Exponential Backoff Retry
  - In `lib/scraper/engine.ts` `directFetch()`: retry 3× with `delay = 2^attempt × 1000ms`
  - In `lib/scraper/engine.ts` `playwrightFetch()`: on Cloudflare block → wait 5s → retry 2×
  - Log retry attempts to pipeline result

- [ ] **S4.3** Cloudflare CAPTCHA Graceful Handling
  - If Playwright detects `class="cf-browser-verification"` → log `"CAPTCHA: manual intervention required"`
  - Do NOT attempt to solve CAPTCHA (against ToS)
  - Mark source as `needs_captcha: true` in pipeline result → show in admin panel

### Acceptance Criteria
- [ ] GS Score Current Affairs source visible in admin Scraper panel
- [ ] Retry count visible in pipeline result JSON
- [ ] CAPTCHA-detected sources show amber badge in admin panel

---

## Story S5: Production Deploy

**Epic:** 31 — Deployment & Operations
**Priority:** P1
**Estimated Effort:** 2.5 dev-days (5 story points)
**Dependencies:** S1.1, S3, S4

### Tasks

- [ ] **S5.1** GitHub Actions CI/CD
  - `.github/workflows/ci.yml`: build → lint → test (E2E + unit) → deploy staging
  - `.github/workflows/deploy.yml`: promote staging → production
  - Secrets: `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`

- [ ] **S5.2** Vercel Deployment
  - Connect GitHub repo to Vercel
  - Set `NODE_ENV=production`
  - Custom domain: `prepx.ai` (or whatever available)
  - Environment variables synced from `.env.local`

- [ ] **S5.3** Supabase Production Project
  - Separate Supabase project for production
  - Migrate schema: `psql < supabase/schema.sql`
  - Verify RLS policies applied
  - Seed with 185 generated topics (not placeholders)

- [ ] **S5.4** Environment Variable Audit
  - Production `.env`: only `NEXT_PUBLIC_` vars and Supabase creds
  - NO AI API keys in client bundle (all AI calls go through server-side routes)
  - Stripe/Razorpay keys use test mode for initial deploy

### Acceptance Criteria
- [ ] `https://your-domain.com` loads without errors
- [ ] `/pricing` page accessible with Stripe test checkout
- [ ] Admin `/admin/scraper` accessible with login
- [ ] Google Lighthouse score ≥70 on mobile
- [ ] Vercel Analytics enabled for OMTM tracking

### Definition of Done
- [ ] Domain DNS propagates (48h max)
- [ ] SSL certificate auto-provisioned
- [ ] `README.md` deployment guide updated
- [ ] Runbook created for rollback (`git revert` + Vercel promote)

---

## 🎯 Sprint 7 Success Criteria

| Metric | Target |
|--------|--------|
| E2E test pass rate | 3/3 passing |
| Unit test pass rate | ≥10 passing |
| Real topics generated | ≥50 EN + ≥50 HI |
| Brand mention count | 0 |
| Mobile pages tested | 5 pages |
| GSScore source | Added + functional |
| Production deployed | ✅ live on Vercel |
| Lighthouse mobile | ≥70 |

---

## 🛣️ Optional Sprint 8 (Post-MVP)

If user requests after Sprint 7:
- Supabase Edge Function cron → nightly scraper schedule
- WhatsApp/email nudge system → Supabase edge function + Twilio/SendGrid
- Stripe/Razorpay production keys → live payment collection
- Sentry error tracking + PostHog analytics → observability

---

## 🏁 BMAD Phase 4 Status

| Step | Status |
|------|--------|
| Sprint 0–6 | ✅ All complete |
| Sprint 6 Retrospective | ✅ Artifact created |
| **Sprint 7 Plan** | **Awaiting approval** ⬅️ |
| Sprint 7 Implementation | Pending approval |
| Phase 4 Sign-Off | Pending Sprint 7 completion |
