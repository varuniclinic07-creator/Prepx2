---
type: corrective-course
parent: sprint7-plan.md
auditor: BMAD Wendy (Workflow Builder)
date: 2026-04-25
phase: 4-implementation
persona: BMAD Bob (Scrum Master)
---

# Sprint 7 Corrective Course — Enterprise Workflow Fix

## Background
BMAD Wendy's workflow audit (2026-04-25) revealed that despite Sprint 7 being marked "COMPLETE", **4 P0 blockers** and **6 P1 critical issues** remain that prevent the app from being enterprise-grade or even MVP-ready. These were missed in Dr. Quinn's earlier validation because they are workflow-level blunt ends, not compilation errors.

## Audit Results Summary
- Total workflows audited: 33
- Complete & Wired: 11
- Partially Wired: 16
- Not Implemented / Broken: 5

## P0 Blockers (Must Fix Before ANY Production Deploy)

### Fix P0.1: Answer Writing Flow — Wire `AnswerComposer.tsx`
- **Current state:** Component renders but button only sets `submitted=true`. No API call. Dead end.
- **Required:** Create `/api/mains/evaluate` route, wire to `mains-evaluator.ts`, persist results to Supabase, show history.
- **Story file:** `sprint7-fix-p0-answer-writing.md`

### Fix P0.2: Payment Flow — Implement Razorpay Checkout
- **Current state:** `/pricing` is static HTML. All CTAs redirect to `/`. Webhook DB update is `TODO`.
- **Required:** Integrate Razorpay checkout modal, complete webhook signature verification + DB update, add billing UI.
- **Story file:** `sprint7-fix-p0-payment-flow.md`

### Fix P0.3: Global Error Boundaries + 404 + Loading States
- **Current state:** No `error.tsx`, `not-found.tsx`, `loading.tsx` anywhere in `app/`.
- **Required:** Add global error boundaries, 404 page, loading skeletons for all server components.
- **Story file:** `sprint7-fix-p0-error-boundaries.md`

### Fix P0.4: Admin AI Provider Test Button
- **Current state:** Calls `/api/test-ai` which does not exist.
- **Required:** Implement `/api/test-ai` route OR remove button.
- **Story file:** `sprint7-fix-p0-admin-ai-test.md`

## P1 Critical (Enterprise Unacceptable If Missing)

- P1.1: No `/profile` page — sync `preferred_language` to Supabase
- P1.2: No `/interview` module
- P1.3: Admin role check uses subscription status as proxy — add `role` column
- P1.4: Razorpay webhook signature verification is placeholder
- P1.5: No nudge delivery mechanism
- P1.6: Daily plan tasks are static (`topic-001`) — needs personalization

## BMAD Commitment
- **Rule:** Zero deviation. Story artifacts exist BEFORE code. Tests pass AFTER each fix.
- **Order:** P0.3 → P0.4 → P0.1 → P0.2 → P1 fixes
- **Goal:** Close all blunt ends so every workflow has a proper entry, flow, and exit state.
