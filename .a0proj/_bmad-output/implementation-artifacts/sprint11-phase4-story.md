---
type: story
phase: 4-implementation
sprint: 11
---

# Phase 4 — Clean Up & Maintain (P3 — 12 Fixes)

- [x] 4.1 Break schema.sql into 25 domain migration files under `supabase/migrations/`
- [x] 4.2 Delete 8 unused lib files (openai.ts, isa-eligibility.ts, progression-engine.ts, watermark.ts, subject-teacher.ts, etc.)
- [x] 4.3 Remove 12 orphan columns (source_url, error_type_labels, readiness_score, geojson, etc. from schema.sql and routes)
- [x] 4.4 E2E tests for critical flows (min 15 specs)
- [x] 4.5 Unit tests for lib modules (>80% branch coverage)
- [x] 4.6 Replace hardcoded dashboard stats (read from DB)
- [x] 4.7 Replace hardcoded interview questions (dynamic fetch)
- [x] 4.8 Replace hardcoded battle-royale questions (dynamic fetch)
- [x] 4.9 Streak count from `users.streak_count` or `activity_log`
- [x] 4.10 White-label mass assignment fix (whitelist allowed fields)
- [x] 4.11 `req.json()` try/catch on all routes not yet wrapped
- [x] 4.12 Document dead tables (activity_log, agent_tasks) in DEPLOYMENT.md

## Acceptance Criteria
- All checkboxes ✅
- `npx tsc --noEmit` = EXIT 0
- `npx vitest run` passes all tests
- No unused lib files in `lib/`
- No orphan columns accessed in routes
- DEPLOYMENT.md updated with dead tables section

## Definition of Done
All 12 P3 fixes applied, type-checked, tested, grep-verified.
