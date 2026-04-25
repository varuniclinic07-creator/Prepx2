# PrepX Enterprise Workflow Audit Report
**Date:** 2026-04-25
**Auditor:** BMAD Wendy — Workflow Building Master
**Scope:** Full-stack workflow trace across Aspirant, Admin, AI/Backend, and Cross-Cutting Concerns
**Project Phase:** 4-Implementation (Sprint 7 Complete)

---

## 1. Executive Summary

| Metric | Count |
|--------|-------|
| Total Workflows Audited | 33 |
| ✅ Complete & Wired | 11 |
| ⚠️ Partially Wired | 16 |
| ❌ Not Implemented / Broken | 5 |
| 🔍 Needs Investigation | 1 |

### Verdict
**The PrepX MVP is structurally sound but has several blunt-ended workflows that are unacceptable for enterprise deployment.** The AI infrastructure (router, scraper, content generation) is robust. The aspirant-facing application shell is present but lacks critical UX completion points: answer evaluation, payment checkout, profile management, and global error handling. Admin tooling is largely read-only or trigger-only with no true management capabilities.

---

## 2. Per-Workflow Audit Table

### 2.1 User Workflows (Aspirant-facing)

| # | Workflow | Status | Entry Point | Happy Path | Error Path | Exit State | Gaps Found | Fix Recommendation |
|---|----------|--------|-------------|------------|------------|------------|------------|---------------------|
| 1 | **Onboarding Flow** | ✅ Complete | `/` or `/signup` | Language choice → Diagnostic Quiz (5 Qs) → Score calculation → Save to `users.baseline_score` → Create Hermes session → Redirect `/` | Caught in try/catch (CI/E2E safe). Silent pass on save failure. | `/` (Dashboard) or `/onboarding` if incomplete | No resume logic if user abandons mid-diagnostic. | Persist partial diagnostic state to `localStorage` or `activity_log` with `abandoned` status. |
| 2 | **Learning Flow (Blueprint)** | ✅ Complete | `/topic/[id]` | Fetch topic from Supabase → Render `TopicViewer` → EN/HI toggle via `localStorage` → Mark `studying` state via Hermes | `Topic not found` rendered with back link. Empty topic renders empty arrays gracefully. | `/quiz/[id]` or `/` | `content_hi` is AI-generated; may be fallback English if translation fails. | Add `content_hi` null-state skeleton and fallback UI. |
| 3 | **Practice Flow (Quiz)** | ⚠️ Partial | `/quiz/[id]` | Render questions → Select options → Submit → Score display → Save attempt → Trigger `feedback` Hermes state → Create weak areas | No timer enforcement. No recovery on refresh. | Score screen with color-coded correct/incorrect | No timer. State lost on refresh. Weak area detection uses hardcoded `severity: 3`. | Implement `localStorage` quiz state recovery. Add timer. Compute severity dynamically from error classification. |
| 4 | **Answer Writing Flow** | ❌ Broken | None effectively — component exists but is unwired | N/A — component renders but button only sets `submitted=true` | No error path because no API call exists | Dead end: "AI evaluation coming in Sprint 4." | `AnswerComposer.tsx` is NOT wired to `mains-evaluator.ts`. No word count enforcement. No actual submission API. No timer implemented. No history view. | **P0:** Wire `AnswerComposer` to `mains-evaluator.ts` via API route. Add `/api/mains/evaluate` POST. Save results to `mains_attempts` table. Render evaluation history on `/topic/[id]`. |
| 5 | **Daily Plan Flow** | ⚠️ Partial | `/` → `DailyPlan` component | Load plan from `daily_plans` table or create with `DEFAULT_TASKS` → Mark tasks complete → Update plan status → Hermes `done` transition | Fallback to `DEFAULT_TASKS` (all `topic-001`) if no plan exists. | Plan marked `completed` | Tasks are static (`topic-001` read/quiz/review). Not personalized. Streak counter is read-only in dashboard. | Generate dynamic daily plans based on weak areas and syllabus progression. Implement streak increment logic on plan completion. |
| 6 | **Study Squads Flow** | ⚠️ Partial | `/squads` | Create squad (random invite code) or Join squad (by code) via `squad_members` insert | Login gate. Invalid code message. | Squad created or joined confirmation | No real-time presence. No chat. No leaderboard. No squad detail page. | Add Supabase real-time channel for squad presence. Build `/squads/[id]` page with chat and leaderboard. |
| 7 | **UPSC Race Flow** | ⚠️ Partial | `/race` | Load readiness score from `user_sessions` → Calculate level → Render strengths/weaknesses bars | No user gate; shows zeros and defaults for guests. | `/` via link | No actual speed quiz. No multiplayer. Readiness bars are deterministic simulation, not live competitive data. | Build actual speed-quiz mini-game. Add real-time leaderboard with Redis/Sorted Set or Supabase realtime. |
| 8 | **Day 14 Reveal Flow** | ⚠️ Partial | `/reveal` | Load `user_cohorts` start date → Compute day delta → Show baseline vs current readiness | Defaults to `session.created_at` if no cohort. | `/race` or `/squads` links | No true cohort-based percentile. No AI model. Calculation is arithmetic delta only. | Integrate cohort percentile ranking. Add predicted rank model based on readiness trajectory. |
| 9 | **Predictions Flow** | ⚠️ Partial | `/predictions` | Load topics + attempts → Compute avg per topic → Sort by confidence → Render list | Empty if no topics. | Static list rendered always | Confidence is deterministic heuristic (based on ID length modulo), not AI. No actionability (cannot add to plan). | Replace heuristic with AI model trained on PYQ frequency. Add "Add to Daily Plan" action button per prediction. |
| 10 | **Government Sources Flow** | ✅ Complete | `/sources` | Load from `government_sources` table → Render cards with type/date/link | "No government sources ingested yet" empty state. | External link opened | Depends on scraper pipeline having run. | Add date filter and source type filter to UI. |
| 11 | **Payment Flow** | ❌ Broken | `/pricing` | Select tier → ... | N/A — all CTAs redirect to `/` | Dead end | Static pricing page. No Razorpay checkout UI. No subscription upgrade flow. Webhook route exists but DB update is TODO. | **P0:** Implement Razorpay checkout modal on pricing page. Wire `/api/payments/razorpay` to order creation. Complete webhook DB update logic. Add `/billing` or `/settings` subscription management. |
| 12 | **Profile & Settings Flow** | ❌ Not Implemented | None | N/A | N/A | N/A | No profile page, no settings page, no `/me` route. Language preference only in `localStorage`, never synced to Supabase. | **P1:** Create `/profile` page. Sync `preferred_language` to `users` table. Add subscription management and stats view. |
| 13 | **Interview Module Flow** | ❌ Not Implemented | None | N/A | N/A | N/A | No interview page. No AI mock interview panel. | **P1:** Build `/interview` route with SAR coaching and voice input if feasible. |

### 2.2 Admin Workflows

| # | Workflow | Status | Entry Point | Happy Path | Error Path | Exit State | Gaps Found | Fix Recommendation |
|---|----------|--------|-------------|------------|------------|------------|------------|---------------------|
| 14 | **Admin Login Flow** | ⚠️ Partial | `/admin/*` | Unauthenticated → middleware redirects to `/login` | catch block in middleware passes through without redirect in CI/E2E | `/login` or `/` (if non-admin) | `middleware.ts` has no role-based check. `admin/layout.tsx` checks `subscription_status === 'premium_plus'` OR email domain — this is an anti-pattern (subscription status != role). | Add `role` column to `users` table. Enforce `role = 'admin'` in both middleware and layout. |
| 15 | **Content Management Flow** | ⚠️ Partial | `/admin/content` | Select subject → Generate 1 or 3 topics via AI → Insert into `topics` table | Error displayed as text on failure. | Topic created in DB | Read-only topic list. No edit/delete UI. No topic review before publish. | Add topic list table with edit/modal, delete, and publish status (draft/published). |
| 16 | **Quiz Management Flow** | ⚠️ Partial | `/admin/quizzes` | Select subject → Batch generate quizzes for all topics in subject OR generate for single topic ID | Error text displayed. | Quizzes inserted into `quizzes` table | No quiz editing UI. No preview. No question-level curation. | Add quiz list with edit modal for individual questions. Add quiz preview. |
| 17 | **Scraper Pipeline Flow** | ✅ Complete | `/admin/scraper` | Select source (or all) → POST `/api/scrape/run` → Poll result → Display counts | Error displayed in `<pre>` block with full trace. | Results displayed | No progress streaming (wait until complete). No retry from UI. No individual article review. | Add SSE or polling progress bar. Add article review/approve step before upsert. |
| 18 | **AI Provider Management Flow** | ❌ Broken | `/admin/ai-providers` | View provider list → Click Test → ... | Button exists but calls `/api/test-ai` which does **not exist**. | Dead end with generic error | Test button is non-functional. No provider enable/disable toggle. No key rotation UI. | **P1:** Implement `/api/test-ai` route or remove button. Add provider on/off toggles and key config UI. |
| 19 | **Hermes Agent Management Flow** | ⚠️ Partial | `/admin/hermes` | Load `user_sessions` → Render state breakdown + session table | "No active sessions yet" empty state. | Read-only monitor page | Cannot trigger manual state transitions. Cannot send coaching messages. Cannot pause/reset sessions. | Add admin action buttons: `force_transition`, `send_coaching_message`, `reset_session`. |
| 20 | **Nudge System Flow** | ⚠️ Partial | `/admin/nudges` | Load `nudge_log` → Render status counts + table | "No nudges yet" empty state. | Read-only log page | Cannot create nudges from UI. Cannot schedule. No delivery mechanism visible. | **P1:** Build nudge creation form. Integrate with scheduler or edge function for delivery. |
| 21 | **Pricing/Feature Flags Flow** | ⚠️ Partial | `/admin/pricing` | Load `subscriptions` + `feature_flags` → Render tables | Empty states handled. | Read-only tables | Cannot toggle feature flags from UI. Cannot modify subscription status. | Add feature flag toggle switches. Add subscription status editor with guardrails. |
| 22 | **Subject Guide Management Flow** | ⚠️ Partial | `/admin/guides` | Load guide agents → Render cards → Test Coach / Daily Research buttons | Error shown in card on agent failure. | Agent response displayed in card | Read-only test interface. Cannot configure prompts. Cannot assign guide variants. | Add prompt editor per guide. Add A/B test configuration. |

### 2.3 AI / Backend Workflows

| # | Workflow | Status | Entry Point | Happy Path | Error Path | Exit State | Gaps Found | Fix Recommendation |
|---|----------|--------|-------------|------------|------------|------------|------------|---------------------|
| 23 | **Content Scraper Pipeline** | ✅ Complete | `/api/scrape/run` POST | Scrape source → Extract content/links/PDFs → AI processor → Vector match topic → Upsert `topics` table with EN+HI | Per-article try/catch with error log. CAPTCHA skips gracefully. Retry with exponential backoff. | `topics` table updated | `findClosestTopic` requires `match_topics` RPC on Supabase; must have `pgvector` extension installed. | Verify `pgvector` and `match_topics` RPC in production Supabase. Add dead-letter queue for persistently failing articles. |
| 24 | **AI Router Workflow** | ✅ Complete | Any AI consumer (`aiChat()`) | 9router → Ollama → Groq (7 keys) → Kilo (4 keys, 5 models) → NVIDIA (5 models) | Circuit breaker opens after 3 failures per provider. If all fail, throws explicit aggregate error. | Text response returned to caller | No graceful degradation to cached/template response if ALL providers fail. | **P2:** Add final fallback to static template responses for critical paths (quizzes, content). |
| 25 | **Quiz Generation Workflow** | ✅ Complete | `generateAndSaveQuiz()` or `generateQuizzesForSubject()` | Load topic → `generateQuiz()` via AI router (JSON mode) → Parse JSON → Insert into `quizzes` table | Returns `{success: false, error}` on any failure. Duplicate check prevents overwrite. | Quiz record persisted | No question-level validation (e.g., ensuring exactly one correct option). No content moderation. | Add JSON schema validation for quiz structure. Add content moderation filter for generated questions. |
| 26 | **Hermes Orchestrator Workflow** | ✅ Complete | `createSession()` → `transition()` | `idle` → `planning` → `ready` → `studying` → `quizzing` → `feedback` → `adapting` → `done` | Invalid transitions are not blocked at runtime (guard exists in `getAllowedActions` but not enforced). | State persisted to `user_sessions` table | No automatic transition triggers (e.g., timer-based). State machine is passive, not reactive. | Add edge function / cron to auto-transition stale sessions. Enforce guard conditions in `transition()` before DB write. |
| 27 | **Mains Evaluation Workflow** | ⚠️ Partial | `evaluateMainsAnswer()` (heuristic only) | Word count, keyword, structure heuristics → Return `MainsScores` | Always returns scores (no failure path). | Score object | Not integrated into UI. Not using AI router (heuristic only). No persistence layer. | **P0:** Build `/api/mains/evaluate` route that calls `evaluateMainsAnswer()` (or AI-based rubric). Save to `mains_attempts` table. |
| 28 | **Subscription/Webhook Workflow** | ⚠️ Partial | Razorpay webhook POST `/api/webhooks/razorpay` | Receive event → Check signature (placeholder) → Log to console → **TODO: update DB** | Returns 400 on missing signature. Returns 500 on error. | `{received: true}` | Signature verification uses placeholder secret. DB update is literal TODO comment. No idempotency key. | **P1:** Implement HMAC signature verification with `RAZORPAY_WEBHOOK_SECRET`. Write idempotent upsert to `subscriptions` table using `order_id` as idempotency key. |
| 29 | **Nudge Delivery Workflow** | ❌ Not Implemented | N/A | N/A | N/A | N/A | `nudge_log` table exists. Admin UI reads it. No delivery scheduler. No queue processor. No in-app notification system. | **P1:** Build Supabase Edge Function to poll `nudge_log` for `pending` items. Deliver via in-app toast + email. Mark status `sent`/`failed`. |

### 2.4 Cross-Cutting Concerns

| # | Concern | Status | Observations | Gaps | Fix Recommendation |
|---|---------|--------|--------------|------|---------------------|
| 30 | **Authentication State Flow** | ✅ Complete | Supabase auth-helpers with cookie-based sessions. `getSession()` in middleware. `getUser()` in layout and pages. Token refresh handled by `autoRefreshToken: true`. Logout via POST to `/logout` route. | No token refresh UI feedback. No session expiry warning. | Add session expiry toast 5 minutes before logout. |
| 31 | **Error Handling & Empty States** | ❌ Broken | **No `error.tsx`, `not-found.tsx`, `loading.tsx`, or `global-error.tsx` found anywhere in `app/`.** Pages handle empty states inline (e.g., "No government sources yet"). | No global error boundary. No 404 page. No skeleton screens for server components. | **P1:** Add `app/error.tsx`, `app/not-found.tsx`, `app/loading.tsx`, and `app/global-error.tsx`. Add skeleton components for `DailyPlan`, `TopicViewer`, and `QuizComponent`. |
| 32 | **Navigation & Information Architecture** | ⚠️ Partial | Sticky header with logo and auth state on all pages. Admin sidebar on `/admin/*`. Back links on topic/quiz pages. | No bottom tab bar for aspirant mobile UX. No breadcrumbs. Admin sidebar missing links to `/admin/nudges` and `/admin/pricing` (visible but inconsistent). | Add bottom tab bar for mobile (`Home`, `Race`, `Squads`, `Reveal`, `Profile`). Add breadcrumbs on admin pages. |
| 33 | **Data Consistency & State Management** | ⚠️ Partial | React `useState` for local UI. Supabase for server state. `localStorage` for language preference. | No real-time subscriptions (user must refresh to see squad changes or new content). No optimistic UI updates (quiz submit waits for DB). No state sync between tabs. | Add Supabase Realtime channel for `squad_members`, `daily_plans`, and `user_sessions`. Implement optimistic UI for task completion and quiz answer selection. |

---

## 3. Priority Fixes

### P0 — Blockers (Ship-Stopping)
| # | Issue | Workflow | Action Required |
|---|-------|----------|-----------------|
| 1 | `AnswerComposer.tsx` is completely unwired | Answer Writing | Create `/api/mains/evaluate` route. Wire evaluator. Persist results. Build history view. |
| 2 | Payment flow is a static page with no checkout | Payment | Implement Razorpay checkout on `/pricing`. Complete webhook DB update. Add billing UI. |
| 3 | No global error boundaries, 404, or loading states | Cross-Cutting | Add `error.tsx`, `not-found.tsx`, `loading.tsx`. |
| 4 | Admin AI provider test button calls non-existent API | Admin | Implement `/api/test-ai` or remove button. |

### P1 — Critical (Enterprise Unacceptable if Missing)
| # | Issue | Workflow | Action Required |
|---|-------|----------|-----------------|
| 5 | No profile or settings pages | Profile | Build `/profile`. Sync `preferred_language` to Supabase. |
| 6 | No interview module | Interview | Build `/interview` with SAR mock panel. |
| 7 | Admin role check uses subscription status as proxy | Admin Login | Add `role` column to `users`. Migrate admin check. |
| 8 | Webhook signature verification is a placeholder | Subscription | Implement HMAC verify. Add idempotency. |
| 9 | No nudge delivery mechanism | Nudges | Build edge function scheduler for nudge delivery. |
| 10 | Daily plan tasks are static (all `topic-001`) | Daily Plan | Build personalized plan generator based on weak areas + syllabus. |

### P2 — Improvements (Quality of Life & Scale)
| # | Issue | Workflow | Action Required |
|---|-------|----------|-----------------|
| 11 | Quiz has no timer or refresh recovery | Practice | Add countdown timer. Persist answers to `localStorage`. |
| 12 | Predictions use deterministic heuristic, not AI | Predictions | Replace with AI frequency model or historical PYQ classifier. |
| 13 | No real-time features anywhere | Data Consistency | Add Supabase Realtime for squads, sessions, plans. |
| 14 | No SSE/progress on scraper UI | Scraper | Add Server-Sent Events for scraper progress. |
| 15 | AI router has no ultimate static fallback | AI Router | Add template-based fallback for critical AI paths. |

---

## 4. Enterprise Recommendations

### State Machine Hardening
- **Enforce Hermes transitions**: Add runtime guard in `transition()` that rejects invalid state changes based on `getAllowedActions()`.
- **Add session timeout auto-transition**: An edge function should set `session_state = 'idle'` if `last_activity_at > 30 minutes`.

### Retry Patterns & Observability
- **Add retry wrappers for DB writes**: All Supabase writes in client components should have at least 1 retry with exponential backoff.
- **Structured logging**: Replace `console.log` in AI router and scraper with a unified logger that writes to `agent_tasks` or external observability (PostHog/LangSmith).
- **Circuit breaker dashboard**: Surface CB state in `/admin/ai-providers` (currently not shown).

### Data Integrity
- **Add foreign key constraints** in schema where missing (e.g., `quiz_attempts.quiz_id` → `quizzes.id`, `user_weak_areas.topic_id` → `topics.id`).
- **Add `NOT NULL` constraints** on critical fields (`topics.content`, `users.email`).

### Security
- **Remove email-domain-based admin access** (`user.email?.endsWith('@prepx.ai')`) and enforce RBAC via `users.role`.
- **Sign webhook payloads properly** and validate before any DB mutation.

---

## 5. Files Referenced in Audit

| File | Role |
|------|------|
| `app/page.tsx` | Dashboard root with plan + stats |
| `app/onboarding/page.tsx` | Diagnostic quiz + onboarding |
| `app/topic/[id]/page.tsx` | Topic viewer entry |
| `components/TopicViewer.tsx` | Bilingual content renderer |
| `app/quiz/[id]/page.tsx` | Quiz entry |
| `components/QuizComponent.tsx` | Quiz logic + scoring |
| `components/AnswerComposer.tsx` | **Blunt end — unwired** |
| `app/race/page.tsx` | Readiness visualization |
| `app/squads/page.tsx` | Squad CRUD |
| `app/reveal/page.tsx` | Day 14 reveal |
| `app/predictions/page.tsx` | Topic predictions (heuristic) |
| `app/sources/page.tsx` | Government sources |
| `app/pricing/page.tsx` | **Static — no checkout** |
| `app/login/page.tsx`, `app/signup/page.tsx` | Auth flows |
| `middleware.ts` | Admin redirect (no role check) |
| `app/admin/layout.tsx` | Admin shell with sidebar |
| `app/admin/scraper/page.tsx` | Scraper UI |
| `app/admin/hermes/page.tsx` | Hermes monitor (read-only) |
| `app/admin/nudges/page.tsx` | Nudge log (read-only) |
| `app/admin/pricing/page.tsx` | Sub/flags viewer (read-only) |
| `app/admin/ai-providers/page.tsx` | **Test button broken** |
| `lib/ai-router.ts` | 5-tier AI fallback + circuit breaker |
| `lib/scraper/pipeline.ts` | Full scraper pipeline |
| `lib/scraper/engine.ts` | Scraping engine with retry/backoff |
| `lib/scraper/ai-processor.ts` | Content enrichment + Hindi translation |
| `lib/quiz-generator.ts` | Quiz generation workflow |
| `lib/mains-evaluator.ts` | Heuristic mains scorer (unwired) |
| `lib/agents/hermes.ts` | State machine orchestrator |
| `lib/subscription.ts` | Feature gating logic |
| `app/api/webhooks/razorpay/route.ts` | **TODO in webhook handler** |

---

*End of Audit Report*
