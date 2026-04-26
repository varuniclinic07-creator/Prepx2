---
type: story
phase: 4-implementation
sprint: 11
---

# Phase 2 — Harden & Validate (P1 — 12 Fixes)

- [x] 2.1 Zod validation on ALL API routes (wrap req.json() in Zod; return 400 on invalid)
- [x] 2.2 try/catch on 15 routes (battles, daily-plan/generate, daily-plan/add-topic, isa/*, predictions, spatial, tutors/*, white-label/*)
- [x] 2.3 Rate limiting middleware (100 req/min AI, 30 payments, 1000 general)
- [x] 2.4 IDOR fix on api/rank/predict (body.user_id must equal auth user.id)
- [x] 2.5 IDOR fix on api/essay-colosseum/submit (verify match ownership)
- [x] 2.6 IDOR fix on api/essay-colosseum/accept (verify invitation)
- [x] 2.7 Admin role re-check on admin API routes (isa, white-label, dhwani, battle-royale)
- [x] 2.8 Fix duplicate index names in schema.sql (idx_notifications_user_read, idx_battle_participants_user)
- [x] 2.9 DELETE capability on 5 admin pages (content, quizzes, nudges, tutors, white-label)
- [x] 2.10 Remove process.env leakage from /admin/ai-providers page
- [x] 2.11 Input length caps on 6 LLM routes (10000 char max, 413 if exceeded)
- [x] 2.12 Fix voice/page.tsx stale closure (useCallback or useRef)

## Acceptance Criteria
- All checkboxes ✅
- npx tsc --noEmit = EXIT 0
- Admin DELETE buttons wired to DELETE APIs
- No env secrets in UI

## Definition of Done
12 fixes applied, type-checked, grep-verified.
