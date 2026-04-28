# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is PrepX

PrepX is a UPSC CSE exam preparation SaaS built on Next.js 15 (App Router), Supabase (PostgreSQL + Auth), and a multi-tier AI provider router. It covers quiz/learning workflows, gamification (battles, territory conquest, essay colosseum, coin economy), AI tutoring, voice/audio/video generation, multi-tenant white-labeling, and payment integration (Razorpay, Stripe).

## Commands

```bash
npm run dev          # Start Next.js dev server (localhost:3000)
npm run build        # Production build (standalone output)
npm run lint         # ESLint

# Unit tests (Vitest + jsdom + Testing Library)
npm test             # Watch mode
npm run test:run     # Single run
npx vitest run __tests__/lib/coins.test.ts   # Run a single test file

# E2E tests (Playwright, needs dev server running)
npm run test:e2e                              # All e2e specs
npx playwright test e2e/quiz-submission.spec.ts  # Single e2e spec

# Database
npm run db:reset     # Reset via psql (requires local PostgreSQL)
```

## Architecture

### Supabase client triple

Three Supabase clients exist for different contexts — use the right one:
- `lib/supabase-server.ts` → Server Components and API routes. Uses `@supabase/ssr` with `cookies()` from `next/headers`, wrapped in React `cache()`.
- `lib/supabase-browser.ts` → Client Components. Uses `createBrowserClient` from `@supabase/ssr`.
- `lib/supabase.ts` → Shared/legacy client with `@supabase/supabase-js`. Also used in `lib/` business logic modules. Has a mock fallback when credentials are missing (for CI/E2E).

### AI Router (`lib/ai-router.ts`)

All LLM calls go through `aiChat()` — a 5-tier provider cascade with circuit breakers:
1. **9router** (primary) → 2. **Ollama** → 3. **Groq** (7 round-robin keys) → 4. **Kilo** (4 keys × 5 models) → 5. **NVIDIA**

Each tier uses the OpenAI SDK pointed at its respective base URL. Circuit breaker opens after 3 failures, cools down after 60s. Also exports `embedText()` (9router embeddings), `textToSpeech()`, and convenience functions (`generateQuiz`, `classifyError`, `generateDiagnosis`, `generateContentSummary`).

### Hermes state machine (`lib/agents/hermes.ts`)

User learning sessions follow a state machine: `idle → planning → ready → studying → quizzing → feedback → adapting → done`. State is persisted in `user_sessions` table. `transition()` updates state; `getAllowedActions()` constrains what the user can do in each state. Agent tasks are queued to `agent_tasks` table.

### Multi-tenancy

Middleware (`middleware.ts`) extracts tenant slug from subdomain via `lib/tenant.ts`. The slug is passed downstream as `x-tenant-slug` header. Root layout reads tenant branding (color, logo, coach name) from `white_label_tenants` table.

### Middleware pipeline

`middleware.ts` runs on all non-static requests:
1. Rate limiting (in-memory map, per IP+path, tiered limits: 30 for payments, 100 for LLM endpoints, 1000 default)
2. Tenant slug extraction from subdomain
3. Supabase session refresh
4. Admin path protection (auth check + role=admin from `users` table)

### Coin economy (`lib/coins.ts`)

`awardCoins()` uses an idempotency key to prevent duplicate awards. `spendCoins()` checks balance before deducting. Transactions log to `coin_transactions`, balance cached in `user_balances`.

### Database schema

41 migrations in `supabase/migrations/` numbered 001-041 plus 099 (policies/indexes/functions). Migrations are plain SQL DDL files. Schema uses `pgvector` extension for embeddings. RLS policies, indexes, and helper functions are in `099_policies_indexes_functions.sql`.

### Content pipeline

`lib/scraper/` contains a 4-stage pipeline: `engine.ts` (Crawl4AI fetch) → `ai-processor.ts` (LLM readability processing) → `pipeline.ts` (orchestration) → stored in `topics` table as `TopicContent` JSONB.

### Guide agents (`lib/agents/guide-agents.ts`)

Three specialized coaching agents (PrelimsGuide, MainsGuide, InterviewGuide) share a `GuideAgent` base class. Each wraps `aiChat()` with a domain-specific system prompt. `getSmartStudyAdvice()` is a deterministic rule engine for study direction.

## Key patterns

- **Path alias**: `@/*` maps to project root (e.g., `import { supabase } from '@/lib/supabase'`)
- **API routes**: Next.js App Router route handlers in `app/api/*/route.ts` — export named functions (`GET`, `POST`, etc.)
- **Types**: All shared types in `types/index.ts` — Subject (20 UPSC subjects), UserRole, SubscriptionStatus, TopicContent, Question, Quiz, QuizAttempt, DailyPlan, etc.
- **Styling**: Tailwind CSS, dark theme (slate-950 bg, slate-100 text, emerald/cyan accents). Tenant primary color via CSS custom property `--tenant-primary`.
- **Loading states**: Skeleton components in `components/skeletons/` for quiz, topic, and daily plan views.
- **Docker**: 3-stage build (deps → builder → runner) on `node:20-alpine`, standalone output. Uses `--legacy-peer-deps`.

## Environment variables

Required for the app to function:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase connection
- AI provider keys are tiered; the app degrades gracefully if lower tiers are missing
- `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` — payment processing
- E2E tests use dummy Supabase credentials (configured in `e2e/playwright.config.ts`)

## Known security issues

`BACKEND_SECURITY_AUDIT.md` documents P0/P1 vulnerabilities across 32 API routes, including unauthenticated LLM endpoints, IDOR in battles/essay-colosseum, missing Stripe webhook signature verification, and race conditions in payment flows. Consult this file before modifying API routes.

## Coding guidelines (Karpathy)

### 1. Think Before Coding
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First
- No features beyond what was asked.
- No abstractions for single-use code.
- No speculative "flexibility" or "configurability".
- No error handling for impossible scenarios.
- If 200 lines could be 50, rewrite it.

### 3. Surgical Changes
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.
- Remove imports/variables/functions that YOUR changes made unused.
- Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution
Transform tasks into verifiable goals:
- "Add validation" → write tests for invalid inputs, then make them pass
- "Fix the bug" → write a test that reproduces it, then make it pass
- "Refactor X" → ensure tests pass before and after

For multi-step tasks, state a brief plan with verification checks at each step.
