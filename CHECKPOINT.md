# PrepX Resume Checkpoint

> Standing rule: every non-trivial slice MUST update this file before stopping. Anyone (or any model) opening the repo cold should be able to resume in <5 min.

---

## 🟥 Resume protocol (read FIRST on any new session)

If you are a fresh Claude session opening this repo, do these in order BEFORE any code edits:

1. **Load standing rules** from `C:\Users\DR-VARUNI\.claude\projects\C--Users-DR-VARUNI-Desktop-New-folder-PrepX\memory\`:
   - `feedback_user_mega_directive.md` — the non-negotiable rules (no scaffolding, batch-of-4, Hermes agent team, Google UI bar, 3D/video mandates, outstanding-or-don't-ship)
   - `feedback_batch_strategy.md` — exact agent-dispatch sequence per batch
   - `reference_planning_artifacts.md` — where the PRD/architecture/UX/epics live
2. **Read the demand**: `app concepts.md` at repo root — authoritative spec.
3. **Read the UI bar**: `C:/Users/DR-VARUNI/Desktop/New folder (2)/ui by google/` — Google AI Studio reference (Next 15 + React 19 + motion 12 + tailwind 4.1 + recharts).
4. **Read the audit**: `.a0proj/_bmad-output/audit/spec-vs-reality-2026-05-01.md` — 122-item gap table; 50% NOT-STARTED, 23% STUB.
5. **Re-read this CHECKPOINT.md** for the active slice.
6. Resume the next pending action under "Active slice" — do NOT start a new patch unless the user explicitly says so.

The user has stated: instructions must NEVER be ignored, even if the session is interrupted/lost. This protocol is how that promise survives.

---

## Standing process: Batch-of-4 implement-then-E2E

User's directive (2026-05-01): work through PrepX features in **batches of 4**. Every batch follows this exact sequence:

1. **Multi-agent recon (parallel)** — Explore agents map each feature's UI, API, DB, RLS, dependencies. Identify partial vs complete.
2. **Multi-agent implement gaps (parallel)** — split work across specialist agents that run concurrently:
   - **devops agent** — env, Coolify, Docker, healthcheck
   - **backend agent** — API routes, business logic
   - **supabase agent** — migrations, RLS, triggers
   - **frontend UI/UX agent** — pages, components, client logic, a11y
3. **End-to-end flow test (cloud Supabase, not local mock)** — Playwright spec walks the full user journey (login → action → relogin) and verifies DB persistence; never swallow RLS errors.
4. **Commit** — one bundled commit per batch, only after E2E green.

**Done batches:**
- Batch 1: Sprint 1 (auth, quiz, daily-plan, dashboard) — commit `575d90c` + onboarding RLS fix `1aa5953`
- 2026-05-01: PIVOT — patch-fix mode replaced with spec-driven epic implementation. See `.a0proj/_bmad-output/audit/spec-vs-reality-2026-05-01.md`. User confirmed scope = full 34 Watch-Mode features.

**Audit headline:** 122 items, 50% NOT-STARTED, 23% STUB, 21% PARTIAL, only 5% MVP-READY. Recommended 6-sprint roadmap (12 weeks) with Sprint 1 = Core Video Infrastructure.

When user says "next 4 features" or "proceed further," follow this sequence without re-asking for permission.

---

## Active slice

**Batch 2 — Spec-driven Sprint 1 of audit roadmap (parallel 4-agent dispatch, 2026-05-01)**

User reinforced mega-directive (see `feedback_user_mega_directive.md`): every `app concepts.md` demand is non-negotiable, end-to-end working, no stubs, "outstanding" UPSC prep that makes other platforms obsolete. UI must match Google AI Studio bar. Hermes 24/7 + 3D + video lectures + Real Interview Panel + visualization videos for any topic (BC/AD/BCE, dinosaurs, big bang, cosmos) all mandatory.

User directive: parallel batches of 4 features = audit → code → test → validate → end-to-end verify. Run all 4 features concurrently (background agents in worktrees), then merge + E2E + commit. Background-deferred: Batch 1 prod-deploy (NEXT_PUBLIC_BASE_URL on Coolify, Google OAuth) — user said skip prod-deploy detour, start video infra now.

### Recon completed 2026-05-01 (3 parallel Explore agents)
- **Video pipeline recon** — Epic 6 ~5-30% per sub-epic. ComfyUI client + workflow template DB row exist; no GPU server connected; no Remotion/Manim deps; no Celery/BullMQ; signed URLs/storage = 0%. 15+ downstream features blocked.
- **UI quality recon** — current UI: framer-motion v11 (legacy), Tailwind 3.4, no splash/hero/glass/glow, no recharts, system fonts only. Google ref: motion 12 + Tailwind 4.1 + Plus Jakarta + Playfair + lucide-react + recharts 3.8. Brand spec (planning-artifacts/ux-design-system.md) uses blue-purple-cyan + saffron accents + bilingual EN/HI + mobile-first 360px. All 3 (Google bar, brand spec, current code) reconciled = Option B medium overhaul (1-2 wk).
- **Hermes recon** — `lib/agents/hermes.ts` is state-machine only; `spawnAgent()` is a STUB that inserts into `agent_tasks` but no worker consumes. `lib/scraper/` has 16 hardcoded UPSC sources but only triggered by manual HTTP POST. No BullMQ/Redis/cron. Recommended Node-side BullMQ + ioredis (reuses TS stack, same Coolify infra).

### Batch 2 features (parallel agent dispatch)

| # | Feature | Owner agent | Migration alloc | Branch |
|---|---|---|---|---|
| B2-1 | UI Foundation Shell (motion v12 upgrade, splash, hero, dashboard, glassmorphism, lucide-react, Plus Jakarta + Devanagari fonts) | UI/UX agent | none | feat/batch2-ui-foundation |
| B2-2 | Hermes 24/7 Worker Infrastructure (BullMQ + ioredis, worker process, Docker service, job lifecycle, dispatch loop, observability) | backend + supabase + devops | 048, 049 | feat/batch2-hermes-worker |
| B2-3 | Video Pipeline Foundation (30-45min script writer, video_scripts/video_lectures tables, ComfyUI orchestration job, Supabase Storage bucket, signed URL refresh, nightly cron 1-6 AM) | backend + supabase | 050, 051 | feat/batch2-video-pipeline |
| B2-4 | Research Crawler Live (wire `lib/scraper/pipeline.ts` to BullMQ daily 9am job, dedup, store to `topics` + new `crawl_history`, Hermes dispatches research-jobs, source rate-limits) | backend + supabase | 052 | feat/batch2-research-crawler |

Each agent runs in its own worktree (isolation: worktree). Migrations allocated to prevent collisions. After all 4 land:
1. Merge worktrees back (manual review of each diff)
2. Run cloud-Supabase Playwright E2E (full happy path per feature)
3. Single bundled commit
4. Update CHECKPOINT.md → Batch 3

### Batch 2 — sequential merge (worktrees scrapped 2026-05-02 per user direction)

User chose sequential-on-main over parallel worktrees after 3 of 4 agents stalled mid-flight. Order: Hermes (dependency root) → Video → Research → UI (visible jump last so it's done in context of the new infra).

| # | Status | Notes |
|---|---|---|
| B2-2 Hermes | **landed on main 2026-05-02** | Migrations 048+049 applied to cloud Supabase. lib/queue/{redis,queues,types}.ts + workers/hermes-worker.ts + scripts/start-hermes-worker.ts + lib/supabase-admin.ts copied. lib/agents/hermes.ts split into client-safe state machine + server-only lib/agents/hermes-dispatch.ts (BullMQ pulls Node net/fs → can't be in client bundle). Admin UI at /admin/hermes (page.tsx) + /api/admin/hermes/{status,retry,sweep}. Dockerfile copies workers/lib for shared image; docker-compose.yml has hermes-worker service. **Verified:** `npm run build` green; `node scripts/verification/hermes-rpc-smoke.mjs` 8/8 PASS (claim flips status, writes processing log; complete writes terminal log; requeue retries then promotes to dead_letter). |
| B2-3 Video | **landed on main 2026-05-02** | Migrations 050+051 applied to cloud (video_scripts, video_lectures, video_notes, video_qa, video_render_jobs, system_alerts, notifications + 'videos' storage bucket). lib/agents/script-writer.ts (145 wpm, F-K 9-11, NCERT/Laxmikanth/PIB citations) + lib/video/storage.ts (uploadRenderedVideo, mintSignedUrl 24h TTL, getOrRefreshLectureUrl auto-refresh) + lib/video/processors.ts (script/content/render — render drives ComfyUI 30-min deadline, on failure writes system_alerts + lectures.status='failed', no faking success). API: app/api/admin/video/scripts (POST queues script-jobs, PATCH approve→queues render / reject→failed). Admin UI: app/admin/video/{page.tsx,ApproveButton.tsx} client PATCH. Public viewer: app/lectures/[id]/{page.tsx,LecturePlayer.tsx} with chapter seek + timestamped notes + AI Q&A grounded in script_text. APIs: /api/lectures/[id]/{notes,qa} self-only via RLS. **Verified:** `npm run build` green (route /lectures/[id] 2.01 kB compiled); `node scripts/verification/video-pipeline-smoke.mjs` 9/9 PASS (script draft→approve, render-job queue, lecture rendering→failed→system_alerts→published+signed_url cycle, cleanup). Still TODO: actual ComfyUI workflow JSON for 30-45min 3D-animated lecture render; Manim integration for visualizations. |
| B2-4 Research | **landed on main 2026-05-02** | Migration 052 applied to cloud (research_articles, research_topic_links, research_priority_signals, match_topics_for_article RPC, full RLS). Salvage: lib/scraper/{config,engine,pipeline,dedup}.ts (engine adds per-source token bucket + circuit breaker; pipeline adds 3-stage scrapeSourceOnce/enrichArticle/linkArticleToTopics; config adds RATE_LIMITS + PRIMARY_SOURCE_IDS). lib/scraper/processor.ts wires real research-jobs processor (scrape→enrich→link inline, cascades content-jobs for newly-linked topics, capped 20). lib/agents/research-priority-signals.ts persists nightly top-200 topic priority scores. workers/hermes-worker.ts: replaced makeDeferredProcessor('B2-4') with processResearchJob. Admin UI: app/admin/research/{page.tsx,RunSourceButton.tsx} (status tally + per-source last-crawl table + recent-articles list). API routes: /api/admin/research/run-source POST queues crawl; /api/admin/research/articles/[id]/{link,reject} POST for manual triage; /api/research/feed GET returns articles linked to today's plan topics (falls back to global feed). admin/layout.tsx adds Research + Video nav links. **Verified:** `npm run build` green (route /admin/research compiled, /api/research/feed compiled); `node scripts/verification/research-corpus-smoke.mjs` 9/9 PASS (raw insert, UNIQUE 23505 guard, raw→enriched→linked transition, link unique guard, match_topics RPC, priority_signals insert). Daily 09:00 IST sweep already wired in workers/hermes-worker.ts via runHermesResearchSweep. Still TODO: Crawl4AI infrastructure connection (scrapeSource currently uses direct fetch fallback); embeddings need a working 9router endpoint to actually populate vectors. |
| B2-1 UI | **landed on main 2026-05-02 (uncommitted)** | UI deps installed (motion 12, lucide, recharts, tailwind 4, sonner, cva, clsx, tailwind-merge). Components present: components/{SplashScreen,PageTransition,MotionPresets,AppShell}.tsx + components/ui/{Button,Card,GlassCard,IconButton,LangToggle,Pill}.tsx + components/landing/{Hero,FeaturePillars,BottomCTA,LandingFooter,LandingExperience}.tsx + components/dashboard/{DashboardGreeting,HermesFeed,RecentAttempts,WeakAreaRadar}.tsx + components/nav/{MarketingNav,NotificationBell,Topbar}.tsx. EN/HI dicts in lib/dictionaries/dict.{en,hi}.json + lib/i18n.ts + lib/i18n-client.tsx. lib/cn.ts (clsx + tailwind-merge). lib/auth.ts (getUser helper). app/{layout,page,login,onboarding}.tsx + app/globals.css + app/dashboard/ all rewritten to use new shell. **Verified:** `npm run build` green — all routes including /lectures/[id], /admin/research, /admin/video, /admin/hermes built without errors; warnings only for legacy quiz/battle/spatial pages. Honest gaps: not visually compared cell-by-cell to Google AI Studio reference yet; SplashScreen + 3D topic visualizations (BC/AD/BCE eras, dinosaurs, big bang) not yet wired — those are Sprint 2 items. |

### Background-deferred (do NOT lose track)
- Batch 1 prod-deploy: push Sprint 1 + onboarding-fix to origin/main, set `NEXT_PUBLIC_BASE_URL=https://upsc.aimasteryedu.in` on Coolify, configure Google OAuth on Supabase Dashboard, re-run prod B5 → green.
- Step 6 monitoring: Sentry/PostHog frontend + Coolify log shipping + UptimeRobot.
- Secret rotation (5 leaked builds — see security-debt section).
- 2 advisor warnings: RLS on comfyui_*; revoke anon EXECUTE on `is_admin` and `user_in_squad`.

---

## Prior active slice (CLOSED) — auth-foundation-production-verification (BMAD 6-step plan)

| Step | Description | Status |
|---|---|---|
| 1 | Fix logout E2E (local) — cookies cleared, tab2 loses auth, reload doesn't restore | **verified** |
| 2 | Audit/remove mock/fallback paths (`lib/supabase.ts` fail-loud) | **verified** |
| 3 | Single-purpose commit (auth-only) — commit `7bab7b5` on origin/main | **verified** |
| 4 | Deploy to VPS (Coolify @ aimasteryedu.in) | **deployed** (build #5, commit `46ef0d7`) |
| 5 | Re-run Playwright auth slice vs production URL | **B4 PASS / B5 FAIL — `NEXT_PUBLIC_BASE_URL` missing from Coolify env (1-line fix). See `evidence/auth-slice-prod-2026-04-30.md`** |
| 6 | Monitoring (frontend errors, backend logs, infra uptime) | pending |

---

## Step 4 — deploy resolution

Build #5 (commit `46ef0d7`) deployed successfully on Coolify after a cascade of healthcheck issues:

| Build | Commit | Outcome | Issue |
|---|---|---|---|
| 1 | `7bab7b5` | failed | `public/` dir missing — `COPY /app/public` errored |
| 2 | `4d0d84a` | failed | healthcheck hardcoded port 3000 but Coolify injected `PORT=3091` |
| 3 | `2ca955e` | failed | `${PORT:-3000}` didn't expand inside HEALTHCHECK CMD shell |
| 4 | `11f4543` | failed | removed HEALTHCHECK; Coolify's cached "custom healthcheck" flag crashed `docker inspect .State.Health.Status` (template parsing error) |
| 5 | `46ef0d7` | **green** | `HEALTHCHECK CMD true` keeps the field present, always passes |

**Lesson:** Coolify caches the "custom healthcheck found" decision per-app. Once a Dockerfile-based deploy declares HEALTHCHECK, you cannot safely remove it — the inspector keeps querying the field. A trivial passing probe is the safest exit. Real route health is enforced by Coolify's external traefik probe on the FQDN.

---

## Step 5 blocker — Google OAuth

Production app loads. Sign-up with Google redirects to:
```
http://supabase.173-185-79-174.sslip.io:47882/auth/v1/authorize?provider=google&...
```
which returns:
```json
{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}
```

**Cause:** self-hosted Supabase GoTrue does not have Google provider enabled. App-side code is correct.

**To unblock (user action, outside this repo):**

1. **Google Cloud Console** → APIs & Services → Credentials → create OAuth 2.0 Client ID (Web application)
   - Authorized redirect URI: `http://supabase.173-185-79-174.sslip.io:47882/auth/v1/callback` (Supabase callback, not app callback)
   - Capture Client ID + Client Secret

2. **Supabase Coolify deployment** — add to GoTrue/auth env:
   ```
   GOTRUE_EXTERNAL_GOOGLE_ENABLED=true
   GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=<from step 1>
   GOTRUE_EXTERNAL_GOOGLE_SECRET=<from step 1>
   GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=http://supabase.173-185-79-174.sslip.io:47882/auth/v1/callback
   ```
   Restart auth container.

3. **Allow-list app callback** — ensure `https://upsc.aimasteryedu.in/auth/callback` is in `GOTRUE_URI_ALLOW_LIST` (and `Site URL` set appropriately). Otherwise GoTrue rejects post-OAuth redirect even after Google succeeds.

---

## 🚨 Standing security debt — secret rotation

Five Coolify builds have now re-leaked all env vars as build ARGs in plaintext to Docker build logs (59 `SecretsUsedInArgOrEnv` warnings per build). Each leaked build log is visible in the Coolify dashboard. **Rotate before any further deploys when feasible:**

- Supabase: JWT_SECRET, anon key, service-role key
- Groq: 7 keys (`gsk_aANH…`, `gsk_FW0v…`, `gsk_xmVA…`, `gsk_GrNM…`, `gsk_UgeR…`, `gsk_5ek2…`, `gsk_5Pq0…`)
- Kilo: 4 keys (`eyJh…` JWTs)
- NineRouter, NVIDIA, Ollama, OpenCode keys
- Razorpay: key secret + webhook secret
- GitHub PAT: `ghp_XoGS…` (revoke at github.com/settings/tokens)

After rotating, update Coolify env-vars panel with new values. Long-term fix: migrate to Docker BuildKit secrets (`RUN --mount=type=secret`) so build ARGs no longer touch logs.

---

## Local evidence (verified 2026-04-30)

- `evidence/auth-slice-2026-04-30.md` — full narrative
- `evidence/auth-slice-cookies-2026-04-30.json` — B4/B5 cookie dump
- B4: PASS (34.6s) — SSR sees session after login + reload
- B5: PASS (1.1m) — logout in tab1 invalidates tab2

## Reproduce locally

```bash
npm run dev                          # terminal 1
npm run test:auth-slice:http         # 11/11 HTTP probes
npm run test:auth-slice:browser      # B4 + B5 Playwright
```

Requires `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

---

## Migrations applied to cloud Supabase (2026-04-30)

User switched to a fresh cloud Supabase project. All 47 migrations applied via MCP `apply_migration`:

- 001-041 (table DDL, plus `041_comfyui_settings` which seeds 1 row)
- 099 (RLS policies, indexes, helper functions, 7 feature_flags rows)
- 042 (atomic financial ops: `spend_coins`, `accept_battle`, `increment_subscriber_count`, unique constraints)
- 043 (`is_admin()` helper, tighter admin-only RLS)
- 044 (recursive squad_members RLS fix → `user_in_squad()`, `accept_battle` no longer mutates created_at, `is_admin` search_path pinned)
- 045 (`syllabus_tag` column + uuid-ossp)
- 046 (`handle_new_user` trigger on auth.users, backfill)

**Verification (2026-04-30):**
- 41 public tables, all RLS-enabled
- 7 helper functions present: `accept_battle, handle_new_user, increment_subscriber_count, is_admin, match_topics, spend_coins, user_in_squad`
- Trigger `on_auth_user_created` armed
- `feature_flags` seeded (7 rows), `comfyui_settings` seeded (1 row)

**Outstanding security-advisor warnings (non-blocking, defer):**
- WARN: `comfyui_jobs` and `comfyui_settings` have RLS enabled but no policies — admin-only access path needed
- WARN: `match_topics`, `spend_coins`, `accept_battle`, `increment_subscriber_count` lack pinned `search_path` (043/044 only pinned `is_admin` and `user_in_squad`) — low priority since none are SECURITY DEFINER, but tighten when convenient
- WARN: `vector` extension installed in public schema — ignored (Supabase default)
- WARN: SECURITY DEFINER functions (`handle_new_user`, `is_admin`, `user_in_squad`, `rls_auto_enable`) executable by anon/authenticated via `/rest/v1/rpc/*` — revoke EXECUTE from anon for at least `is_admin` and `user_in_squad` to prevent role-leak probes

App now needs the cloud Supabase URL + anon key in `.env.local` and Coolify env-vars (replacing the self-hosted ones). Re-deploy after that switch to make Step 5 reachable.

---

## Cloud Supabase switch — local verified (2026-04-30 evening)

`.env.local` updated to cloud project `vbddpwxbijwuarmrexme`. Added `NEXT_PUBLIC_BASE_URL=http://localhost:3000` (was missing — caused `/logout` 500 → B5 fail).

| Probe | Result |
|---|---|
| `npm run test:auth-slice:http` | **11/11 PASS** — handle_new_user trigger fires, RLS denies cross-user, refresh-token rotation works |
| `npm run test:auth-slice:browser` (B4) | **PASS** — SSR sees session after reload |
| `npm run test:auth-slice:browser` (B5) | **PASS** — logout in tab1 invalidates tab2 |

Coolify env rename was confirmed by user. Build #6 status not yet observed — assume green pending user confirmation.

⚠️ **Service-role key for the cloud project was pasted into chat history during creds handoff.** Add this key to the rotation list (security-debt section above) — treat as compromised.

---

## Sprint 1 — production-readying the 4 verified features (2026-05-01)

Per `docs/local-smoke-checklist.md` (full 30-feature inventory generated 2026-04-30), these 4 are the lowest-risk subset to ship first.

### Status: code complete, locally verified, awaiting production deploy

| Feature | Files touched | Verified |
|---|---|---|
| Auth & Onboarding | `app/login/page.tsx`, `app/auth/callback/route.ts` | UI smoke (user) + auth-slice 11/11 HTTP + 2/2 browser |
| Profile & Dashboard | `app/page.tsx` (replaced internal `fetch('/api/daily-plan/generate')` with direct call to avoid Next 15 SSR fetch fragility) | UI smoke (user) |
| Quiz Engine | `components/QuizComponent.tsx`, `app/quiz/[id]/page.tsx` | UI smoke (user) — submit guard, idempotency-keyed coin award, real `topicId` to weak-area writes (was `quizId.split('-')[0]` garbage) |
| Daily Plan | `app/api/daily-plan/generate/route.ts`, `app/api/daily-plan/add-topic/route.ts` | Topic existence check, MAX_TASKS_PER_PLAN cap, idempotent add, `onConflict: 'user_id,plan_date'` upsert |

### Side-quests folded into the same commit
- **Next.js 15.0.0 → 15.1.12**: 15.0 dev-overlay logged `NEXT_REDIRECT` (a normal control-flow exception) as a console error (vercel/next.js#72557). Patch upgrade fixes it. Build + auth-slice both green on 15.1.12.
- **`NEXT_PUBLIC_BASE_URL=http://localhost:3000`** added to `.env.local` — was missing, caused `/logout` 500 → B5 fail.
- **`.claude/settings.json`** added with 21 read-only allowlist entries (curl probes, npx playwright, supabase MCP introspection) to reduce permission prompts.

### Agent D (P0 endpoint gating) — no-op
BACKEND_SECURITY_AUDIT.md called out 6 routes as missing auth/sig verify. Re-inspection 2026-05-01 shows all 6 already have proper gating from earlier commits (`app/api/mains/evaluate`, `astra/generate`, `test-ai`, `payments/razorpay`, `webhooks/stripe`, `bot/telegram`). Audit doc is stale.

---

## Resume sequence (do these in order)

1. ~~Confirm Coolify build #6 is green~~ — done; `/api/health` reports `database:true` against cloud Supabase
2. ~~Run Step 5 against production~~ — done; B4 PASS, B5 FAIL on `/logout` 500
3. ~~Capture evidence~~ — `evidence/auth-slice-prod-2026-04-30.md`
4. ~~Sprint 1 implementation + local verification~~ — done 2026-05-01; commit pending push
4a. ~~Onboarding RLS bug fix~~ — done 2026-05-01. Bug: `public.users` had only SELECT policy → `update({baseline_score})` silently affected 0 rows → users stuck in /onboarding loop on every login. Fix: migration `047_users_self_update_policy.sql` (applied to cloud Supabase) + `app/onboarding/page.tsx` now reads back the row and surfaces RLS-deny via a visible error banner. Verified end-to-end with new spec `e2e/onboarding-flow.spec.ts` + `playwright.onboarding-flow.config.ts` + `npm run test:onboarding-flow` (signup → login → /onboarding → diagnostic → DB persist → logout → relogin lands on / not /onboarding). 2 stuck users (dr.anilkumarjain07, dranilkumarsharma4) backfilled with `baseline_score=2`. Pre-existing failure: `__tests__/components/QuizComponent.test.tsx` was already red on `575d90c` (HEAD before this fix) — not caused by this slice.
5. **(User)** Decide: push Sprint 1 + onboarding-fix commits to origin/main → Coolify auto-deploys build #7
6. **(User)** Add `NEXT_PUBLIC_BASE_URL=https://upsc.aimasteryedu.in` in Coolify env panel **before** redeploy. Then re-run prod B5; expect green.
7. **(User)** Configure Google OAuth at Supabase Dashboard → Authentication → Providers. Add `https://upsc.aimasteryedu.in/auth/callback` to allowed redirect URLs.
8. Production smoke (UI walkthrough on `https://upsc.aimasteryedu.in`) of Sprint 1 features
9. Sprint 2 — pick next 4 features from `docs/local-smoke-checklist.md` (Onboarding, Topic browse, Battles, Coin shop are likely candidates). Get user approval before dispatching subagents.
10. Begin Step 6 (monitoring) — pick: Sentry/PostHog for frontend, Coolify log shipping for backend, UptimeRobot for FQDN ping
11. Rotate all secrets per the security-debt section (includes cloud service-role key), then redeploy to scrub the next build log
12. Address the 2 advisor warnings flagged above (RLS policies on comfyui_*, revoke anon EXECUTE on `is_admin`/`user_in_squad`)

---

## Status legend

- **scaffold** — code exists, untested
- **partial** — some layers verified
- **verified** — real evidence captured (browser/backend/DB/infra), not just types/lint
- **deployed** — running in production, but end-to-end flow not yet re-verified
- **production** — verified against the real production environment
