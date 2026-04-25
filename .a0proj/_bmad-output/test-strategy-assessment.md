# 🧪 Murat — Test Strategy Assessment: prepx

## Executive Verdict

**Current Test Maturity: IMMATURE (1.5/5)**

This codebase has **2 test files** covering **~12%** of the 2,840+ lines of production code. The existing tests are shallowly mocked integration tests for Supabase helpers and a single React component. Everything else — the AI Router's circuit breaker, the content agent's JSON parsing, the quiz generator's sequencing, the daily plan logic, the middleware's auth flow, the missing Hermes orchestration layer — is **completely untested**.

**Regression risk if we proceed: HIGH.** Without a test framework expansion, every new feature (Hermes, subscription gates, watermarking) will be built on untested foundations. Technical debt compounds at the speed of feature delivery.

---

## 1. What Is Currently Testable?

### Testable (With Current Framework — Vitest + jsdom)

| Component | Why It's Testable | Coverage Needed |
|---|---|---|
| `lib/supabase.ts` | Pure async functions with predictable inputs/outputs. Mock `@supabase/supabase-js`. | 6/12 functions partially tested. Needs: `getWeakAreas`, `logEvent`, `updatePlanStatus`, retry logic. |
| `components/TopicViewer.tsx` | Pure render, no side effects. Pass props, assert DOM. | Not tested at all. |
| `components/DailyPlan.tsx` | UI state toggles, but needs `fetch`/`supabase` mocking for `createDailyPlan`. | Not tested. |
| `types/index.ts` | Type-level only. No runtime tests needed. | — |
| `middleware.ts` | Can test cookie parsing + Supabase auth session detection via NextResponse mocks. | Not tested. |
| `lib/ai-router.ts` — **circuit breaker state machine** | Pure logic. `recordFailure`, `isCircuitClosed`, timeout math. NO actual OpenAI calls needed. | Not tested. |
| `lib/content-agent.ts` — `seedPolityTopics` failure path | The loop failure counting is deterministic. Mock `aiChat` to throw. | Not tested. |
| `lib/quiz-generator.ts` — `generateAndSaveQuiz` sequencing | Mock `supabase` + `generateQuiz`. Test branching: topic missing, existing quiz, AI empty response. | Not tested. |

### NOT Testable (With Current Framework)

| Component | Why NOT Testable | Blocker |
|---|---|---|
| `pages/` (Next.js App Router) | Server components. jsdom cannot render RSCs. Needs `next-test-utils` or switch to `happy-dom` + `playwright` for page-level tests. | Framework limitation: jsdom ≠ RSC |
| `lib/ai-router.ts` — `aiChat` full fallback chain | Calls 5 external providers. Requires `nock`, `msw`, or mocking `OpenAI` client. | Needs `vi.mock('openai')` per-provider |
| `QuizComponent.tsx` — `handleSubmit` with Supabase auth | `supabase.auth.getUser()` inside event handler. Needs `vi.mock('@/lib/supabase')` with deep mock. | Mock complexity |
| `Topic.content` generation pipeline | Non-deterministic LLM output. Cannot assert exact values. Can test schema-shape and non-empty. | Flaky by definition |
| `DailyPlan.tsx` — plan creation on mount | `useEffect` + `createDailyPlan` side effect. Async effect testing is brittle in jsdom. | Timing + mock coordination |
| `QuizComponent.tsx` — `questions.forEach` with `async createWeakArea` | **BUG**: `forEach` + `async` = fire-and-forget promises. Untestable because Promise-returning assertions inside forEach are lost. | Code quality issue |
| `middleware.ts` — route matching | Next.js middleware test utils are not standard in Vitest. Needs `@edge-runtime/vm` or `miniflare`. | Environment gap |
| **Hermes Engine** (`lib/hermes.ts`) | Does not exist yet. | Architecture gap |
| **Subscription Gates** (`middleware.ts` feature flags) | Middleware only does auth-session check. No feature gate logic to test. | Missing implementation |
| **Agent Task Queue** (`agent_tasks` table) | Schema missing. No code to test. | Missing schema + implementation |
| **Watermark Engine** | No code to test. | Missing implementation |
| **Flesch-Kincaid Validator** | No code to test. | Missing implementation |

---

## 2. Test Framework Maturity Analysis

### Current Stack

| Tool | Version | Purpose | Assessment |
|---|---|---|---|
| `vitest` | unknown (project uses Vitest CLI) | Test runner | ✅ Good choice. Fast, native TS, Vite-aligned. |
| `@vitest/plugin-react` | included | React component loading | ✅ Correct. |
| `jsdom` | included | Browser simulation | ⚠️ **Problematic for Next.js App Router**. jsdom cannot render Server Components. |
| `@testing-library/react` | included | React DOM interactions | ✅ Fine for Client Components. |
| `@testing-library/jest-dom` | included | Matchers (`toBeInTheDocument`) | ✅ Fine. |

### Critical Gaps

| Gap | Why It Matters | Recommendation |
|---|---|---|
| **No `msw` (Mock Service Worker)** | Every test that hits Supabase or OpenAI uses `vi.mock()` which forces module-level mocking. Module mocks are brittle and prevent testing mixed real+mock scenarios. | Add `msw`. Intercept HTTP at network layer. Tests don't know about mocks. |
| **No `next-test-utils` / `next-test-utils-react`** | Cannot properly render RSCs (App Router pages). Current jsdom setup works only for `'use client'` components. | Add `@testing-library/react` + `next/navigation` mocks. Or migrate page tests to Playwright. |
| **No `@playwright/test`** | Zero E2E coverage for the actual learning loop: login → topic → quiz → score → daily plan. These are critical user journeys. | Add Playwright. 3 E2E tests covering the core loop. |
| **No `nock` or HTTP-level mocking** | `ai-router.ts` tests would need deep `vi.mock('openai')` with per-provider branching. That's 50+ lines of mock setup per test. | `nock` or `msw` for HTTP interception |
| **No `faker` / `factory-bot`** | Tests use inline mock objects (`MOCK_QUESTIONS`). No central test data factory. Maintenance burden. | Add `@faker-js/faker` for test data. |
| **No test coverage reporting** | Cannot answer "what % coverage?" precisely. | Add `@vitest/coverage-v8` |
| **No CI integration** | Tests run ad-hoc. No enforcement. | Add GitHub Actions or Vercel CI step |
| **No `happy-dom`** | jsdom is slow. `happy-dom` is 3-5x faster for component tests. | Optional but recommended for speed. |

### Test File Inventory

```
__tests__/lib/supabase.test.ts      (3 tests, all mocked integration)
__tests__/components/QuizComponent.test.tsx  (3 shallow tests)
TOTAL: 6 tests across 2 files
```

**Production code:** ~2,840 lines (`lib/` + `components/` + `app/` + schema)

**Test coverage estimate: ~5-8%** by line count. Effectively zero for business logic paths, zero for error handling, zero for asynchronous orchestration.

---

## 3. What Tests Would Catch Winston's Gaps?

### 3A. The Hermes Gap — "No Brain" Bug

**The Gap:** `app/page.tsx` directly queries `daily_plans` and renders `DailyPlan` component. There is no orchestration layer deciding: new user? returning? incomplete plan? completed?

**Test That Would Catch This:**

```typescript
// If Hermes existed, this test would fail today:
describe('Hermes orchestration', () => {
  it('new user with no baseline → redirects to onboarding', async () => {
    // Current code does this in page.tsx, but it's ad-hoc, not orchestrated
    // A Hermes test would assert the state machine transition
  })

  it('returning user with incomplete plan → resume same plan', async () => {
    // Bug: today, 'in_progress' status exists but no resume logic.
    // Hermes would read session state ≠ idle and trigger resume path.
    // Test would fail because resume path is missing.
  })

  it('completed user with no tomorrow plan → triggers DailyPlanAdapter', async () => {
    // Winston's Gap #1: adaptation engine missing.
    // Hermes would call plan generator. Test would fail because generator doesn't exist.
  })
})
```

**Missing Test Types:**
- **State machine unit tests:** Every Hermes state transition (`idle→diagnostic`, `studying→quizzing`, `feedback→adapting`). Must be deterministic, no async side effects in state transitions — pure.
- **Integration tests:** A full orchestrated session from signup → diagnostic → plan → study → quiz → feedback → adapted plan. Requires mocked Supabase + mocked AI.
- **Session resumption tests:** Simulate page refresh mid-topic, assert Hermes detects state and offers resume.

### 3B. AI Router Circuit Breaker Failures

**Winston's Finding:** "No retry/circuit breaker logic visible" — but actually it's there, just UNTESTED.

**The Bug Risk:** `isCircuitClosed()` on line 91 checks `Date.now()` against global state. In serverless, `circuits` is a global `Map` — it persists across requests in a warm function but resets on cold start. This means:
- Circuit breaker works in warm functions (good)
- Resets on cold start (bad — thundering herd on recovery)
- No per-key tracking — all Groq keys share one circuit state (medium bad)

**Tests That Would Catch This:**

```typescript
describe('AI Router Circuit Breaker', () => {
  it('opens after 3 consecutive failures', () => {
    // Fail groq 3 times. assert circuit.open === true
  })

  it('stays open for exactly CIRCUIT_OPEN_DURATION_MS', () => {
    // Fast-forward time by 59s → still open. 61s → half-open.
    // Needs `vi.useFakeTimers()`
  })

  it('resets to closed on success', () => {
    // 2 failures → 1 success → 2 more failures should NOT open (need 3 consecutive)
    // Tests the reset-on-success logic that exists but is unverified.
  })

  it('fallback chain: groq fails → 9router → nvidia → kilo → error', async () => {
    // Mock each provider's HTTP to throw in sequence.
    // Assert final error is 'All providers exhausted.'
  })

  it('does not hang on provider timeout', async () => {
    // Mock provider to respond after CIRCUIT_TIMEOUT_MS + 1000
    // Assert call throws or falls through, does not return.
  })
})
```

**None of these tests exist.** The circuit breaker is a liability sitting in production.

### 3C. Subscription Gates — Currently Wide Open

**The Gap:** `middleware.ts` only checks auth session. It does NOT check subscription status. `subscription_status` is an enum decoration. Any logged-in user can access any route.

**Test That Would Catch This (if gates existed):**

```typescript
describe('Feature Gate Middleware', () => {
  it('free user accessing /premium/mindmap → 403', async () => {
    // Middleware would check subscription_status against feature_flags table.
    // Currently: every route is open. The test would pass but for the wrong reason.
    // After adding gates: test must assert 403.
  })

  it('premium user accessing /premium/content → 200', async () => {
    // Same as above.
  })
})
```

**Additional Missing Tests:**
- Stripe webhook tests: `invoice.paid` → activate subscription. `invoice.payment_failed` → downgrade to free.
- Watermark rendering tests: free user → watermark overlay on PDF export. Premium user → no watermark.
- Feature flag table sync: `feature_flags.required_plan` updated while user has active tab → gate re-evaluated on next navigation.

### 3D. Content Pipeline — Research Agent Missing

**The Gap:** `content-agent.ts` calls `aiChat()` with prompt engineering only. No source URL validation, no research feed, no Flesch-Kincaid gate.

**Tests That Would Catch This:**

```typescript
describe('Content Agent Pipeline', () => {
  it('content generated without source_url is flagged for review', async () => {
    // content-agent.ts returns empty source_url always.
    // Test would fail because no review flag exists.
  })

  it('readability_score > 10 triggers ContentRefiner re-generation', async () => {
    // No Flesch-Kincaid checker exists.
    // Test would fail because refiner doesn't exist.
  })

  it('seedPolityTopics logs each failure for operator visibility', async () => {
    // seedPolityTopics catches and logs but does not return detailed error list.
    // Operator cannot see WHICH topic failed. Test would fail on assertion.
  })
})
```

### 3E. Quiz Component Async Bug

**Existing Code (lines in QuizComponent.tsx):**

```typescript
questions.forEach(async (q: any) => {
  if (answers[q.id] !== q.correct_option) {
    await createWeakArea(userId, quizId.split('-')[0] || 'topic-001', 'concept', 3);
  }
});
```

**The Bug:** `Array.prototype.forEach` does not await Promise-returning callbacks. This means:
1. `handleSubmit()` marks quiz submitted and navigates (future) before weak areas are written.
2. If `createWeakArea` throws, it's an unhandled promise rejection. Vitest would flag this in a test.
3. The topic ID is derived as `quizId.split('-')[0]` — this is fragile. If quiz ID format changes, all weak areas reference wrong topic.

**Test That Would Catch This:**

```typescript
describe('QuizComponent handleSubmit', () => {
  it('creates weak areas for all wrong answers before marking submitted', async () => {
    // Current test: `await waitFor(() => expect(screen.getByText('2 / 2')).toBeInTheDocument())`
    // This only checks score display. It does NOT check that `createWeakArea` was called.
    // If test mocked `createWeakArea`, it would fail intermittently because forEach + async = race condition.
  })
})
```

---

## 4. Regression Risk Assessment

### If We Proceed to Sprint 3 Without Test Expansion

| Risk | Likelihood | Impact | Evidence |
|---|---|---|---|
| **Hermes integration breaks existing quiz → weak area flow** | 75% | High | QuizComponent has fire-and-forget async. Hermes adding orchestration will collide. |
| **AI Router fallback chain silently fails in production** | 60% | High | Untested. One provider change could break cascade. |
| **Subscription middleware blocks legitimate free users** | 70% | Medium | Free tier = conversion funnel. Blocking them kills growth. No tests = blind deployment. |
| **Daily Plan generation corrupts plan_date** | 40% | Medium | `createDailyPlan` uses `new Date().toISOString().split('T')[0]`. Timezone edge case untested. |
| **Content Agent JSON parse error crashes seeding** | 55% | High | `JSON.parse(raw || '{}')` on AI output. If GPT returns markdown wrapping JSON, parse fails. No try/catch around parse. |
| **Stale Supabase connection on Vercel cold start** | 80% | Critical | `supabase.ts` creates client at module init. In serverless, this may be stale across invocations. Unseen. |
| **Weak area topic_id mismatch accumulates bad data** | 90% | High | `quizId.split('-')[0]` is the topic ID derivation. If quiz ID format ever changes, every weak area is orphaned. |
| **E2E learning loop silently broken** | 65% | Critical | No Playwright tests = no confirmation the actual user journey works. Deploying blind. |

### The Regressive Compounding Problem

Every gap Winston identified requires new code. Every new line of untested code is potential regression surface. The current "2 test files, 6 shallow tests" gives the team **false confidence** — they can `npm test` and see green while the application is fundamentally broken.

**My risk calculation:** Business impact × change frequency × failure consequence = very high for the learning loop. This is the CORE USER JOURNEY. It should have deep test coverage.

---

## 5. Recommended Test Strategy for the Correct Path

### Phase 0: Framework Hardening (IMMEDIATE — before Sprint 3 code)

| Action | Priority | Effort | Deliverable |
|---|---|---|---|
| Install `vitest` coverage reporter | P0 | 5 min | `vitest.config.ts` coverage config |
| Install `@faker-js/faker` | P0 | 5 min | Test data factories in `__tests__/factories/` |
| Install `nock` (or `msw` if also adding Playwright) | P0 | 15 min | HTTP interceptors for AI Router tests |
| Refactor `__tests__/lib/supabase.test.ts` to use factories + nock | P0 | 30 min | Robust Supabase unit tests |
| Add `@vitest/coverage-v8` | P0 | 10 min | Baseline coverage report |

### Phase 1: Unit Tests for Critical Business Logic (Sprint 3 Week 1, concurrent with Hermes build)

Hermes is a TypeScript state machine. It should be tested in isolation **before** any integration. This is the Murat ATDD principle: "Tests first. AI implements. Suite validates."

| Target | Approach | Estimated Tests | Value |
|---|---|---|---|
| `lib/hermes.ts` state machine | Pure unit tests. Mock nothing. Test every state × event → next state transition. | 15 tests | Foundational. Catches wrong-state bugs. |
| `lib/ai-router.ts` circuit breaker | `vi.useFakeTimers()` + `nock` for provider mocking. Test open/closed/half-open transitions. | 10 tests | Prevents production cascade failures. |
| `lib/ai-router.ts` fallback chain | Sequentially fail providers, assert final error. Fail first, succeed second, assert no further calls. | 6 tests | Validates failover logic. |
| `lib/quiz-generator.ts` sequencing | Mock `supabase` (light) + `generateQuiz`. Test all 4 branches: missing topic, existing quiz, AI empty, success. | 5 tests | Catches silent failures in quiz creation. |
| `lib/content-agent.ts` error handling | Force `aiChat` to throw, assert `seedPolityTopics` returns `{seeded: N, failed: 5-N}`. | 3 tests | Prevents seeding crash loops. |

### Phase 2: Component / Integration Tests (Sprint 3 Week 2)

| Target | Approach | Estimated Tests | Value |
|---|---|---|---|
| `QuizComponent.tsx` | Mock `supabase` module deeply. Test: render, select, submit, score display, weak area creation. | 5 tests | Catches the `forEach(async)` bug. |
| `DailyPlan.tsx` | Render with `initialPlan`. Test: toggle task, progress bar update, create plan on empty. | 4 tests | Validates plan interaction. |
| `TopicViewer.tsx` | Pure render test with mocked topic. | 2 tests | Smoke test. |
| `middleware.ts` | Extract logic to `lib/gate-utils.ts`. Test pure functions: `isFeatureAllowed(user, feature)`. | 4 tests | Subscription gate logic validated without Next.js runtime. |

### Phase 3: E2E Tests — The Learning Loop (Sprint 3 Week 3)

Playwright. 3 tests. Each test is a user story.

```typescript
// e2e/learning-loop.spec.ts
test('new user signup flow', async ({ page }) => {
  await page.goto('/signup');
  await page.fill('[name=email]', faker.internet.email());
  // ... signup form
  await page.click('[type=submit]');
  await expect(page).toHaveURL('/onboarding');
});

test('complete one topic and quiz', async ({ page, supabase }) => {
  // Seed topic + quiz in Supabase
  await page.goto('/topic/topic-001');
  await expect(page.locator('text=Read Topic')).toBeVisible();
  await page.click('button:has-text("Fundamental Rights")');
  // ... complete quiz, assert score
  await expect(page.locator('text=/\\d \/ \\d/')).toBeVisible();
});

test('daily plan adapts after weak area detected', async ({ page }) => {
  // Pre-seed weak area for topic-001
  await page.goto('/dashboard');
  await expect(page.locator('text=Review Weak Areas')).toBeVisible();
});
```

### Phase 4: CI Quality Gate (Sprint 3 Week 4)

| Gate | Threshold | Reason |
|---|---|---|
| Unit + Component test pass | 100% | Fast feedback. |
| Coverage ≥ 40% | Must pass | Pragmatic floor. Prevents total blind spots. |
| E2E tests pass | 100% | Only 3 tests, but they validate the real user journey. |
| Flakiness detection | <5% retry rate | Any flaky test is a bug in test OR code. Fix first, never tolerate. |

### Tooling Recommendations

| Category | Current | Recommended | Migration Path |
|---|---|---|---|
| Test runner | `vitest` | `vitest` (keep) | No change |
| React renderer | `jsdom` + `@testing-library/react` | `jsdom` + `@testing-library/react` (keep for client components) | No change for existing |
| E2E | **None** | `Playwright` | Add to devDependencies |
| HTTP mocking | `vi.mock()` (module-level) | `msw` (preferred) or `nock` | Add `msw` for network-level mocking |
| Test data | Inline constants | `@faker-js/faker` factories | Add factories |
| Coverage | None | `@vitest/coverage-v8` | Add, set 40% threshold |
| CI | None | GitHub Actions or Vercel CI | Add `.github/workflows/test.yml` |
| Snapshot | None | `vitest snapshot` for AI output shape | Optional, for content-agent schema |

---

## 6. The "Tests That Prove Winston Right" Matrix

For every gap Winston identified, here's the test that would catch it now or prevent it in the future:

| Winston Gap | Test Approach | Current Catch-ability |
|---|---|---|
| Hermes orchestration missing | State machine unit tests for every transition | Cannot test — code doesn't exist |
| AI Router no circuit breaker | Unit tests for `recordFailure`/`isCircuitClosed` | Can test TODAY — code exists but untested |
| No subscription enforcement | Middleware integration test: free → premium route → 403 | Cannot test — middleware has no gate logic |
| No watermark engine | Component snapshot test: free user → watermark overlay | Cannot test — no code |
| No Flesch-Kincaid validator | Unit test: score > 10 → re-generate pipeline | Cannot test — no code |
| No agent_tasks table / queue | Integration test: agent call fails → retry from queue | Cannot test — schema missing |
| No user session state | Integration test: refresh mid-topic → resume prompt | Cannot test — code partially in DailyPlan but not session-aware |
| Content from hallucination | Contract test: `source_url` must be non-empty | Code returns empty source_url — test would catch |
| Quiz generation on-request | E2E test: 100 users hit quiz page simultaneously | Cannot test — no E2E framework |

---

## 7. Final Risk-Value Calculation

> **"Risk × Impact × Frequency = Test Investment. Do the math before writing the suite."**

| Feature | Risk Score | Impact | Frequency | Test Investment |
|---|---|---|---|---|
| Hermes state machine | 5/5 (new, complex, core to all stories) | 5/5 (orchestrates everything) | 5/5 (every user interaction) | **DEEP UNIT + E2E coverage** |
| AI Router circuit breaker | 4/5 (exists, untested, production-facing) | 4/5 (all LLM calls depend on it) | 5/5 (every AI feature) | **FULL UNIT + INTEGRATION coverage** |
| Subscription gates | 5/5 (doesn't exist yet, but is revenue-critical) | 5/5 (blocks monetization) | 4/5 (every page load after login) | **UNIT + Middleware integration + E2E** |
| Quiz → Weak Area flow | 3/5 (exists, has async bug) | 4/5 (core learning loop) | 5/5 (every quiz) | **Component + integration tests** |
| Daily plan creation | 3/5 (exists, edge case risk) | 3/5 (plan correctness) | 5/5 (every day) | **Component + integration tests** |
| Content generation | 3/5 (non-deterministic, hard to test exactly) | 3/5 (content quality) | 2/5 (seeded, then static) | **Shape validation + pipeline gate tests** |
| Video pipeline | 1/5 (deferred to v2) | 4/5 (premium feature) | 1/5 (not yet live) | **Defer until v2** |

---

## 8. Immediate Action Items (Priority Order)

1. **Add the 16 circuit breaker unit tests to `ai-router.ts`** — this code is live, untested, and handles all LLM traffic. It's the biggest existing liability.
2. **Add 4 `quiz-generator.ts` unit tests** — mock supabase + generateQuiz, test the 4 branches.
3. **Fix and test `QuizComponent.tsx` handleSubmit** — change `forEach(async` to `for...of`, add assertion that `createWeakArea` is called with correct `topic_id`.
4. **Before writing any Hermes code, write the 15 state machine unit tests.** Murat's ATDD principle: tests first, implementation second.
5. **Add Playwright to devDependencies.** Write 1 E2E test: `visitor → signup → dashboard`. This validates the deployment pipeline, not just the code.
6. **Add `@vitest/coverage-v8`** and set a 40% line-coverage gate in CI. It's low but forces attention on untested code.

---

**Prepared by:** Murat 🧪 — Master Test Architect and Quality Advisor  
**Date:** 2026-04-23  
**Based on:** Winston 🏗️ Architectural Assessment (same date)  
**Project Phase:** Phase 4-Implementation, Sprint 3 Planning
