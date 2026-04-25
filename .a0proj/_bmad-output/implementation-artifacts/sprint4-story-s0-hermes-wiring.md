---
story_id: S0
sprint: 4
epic: 2 — Hermes Orchestrator Phase B
persona: BMAD Bob (Scrum Master)
priority: P0 — BLOCKS ALL OTHER STORIES
date: 2026-04-24
status: artifact-ready → implementing
---

# Story S0: Hermes Wiring — App Integration

## Goal
Wire the Hermes state machine into the real app user flow so that every aspirant's session tracks their learning lifecycle automatically.

## Acceptance Criteria
- [ ] `user_sessions` and `agent_tasks` tables exist in Supabase with correct schema + indexes
- [ ] Session row auto-created after onboarding completion
- [ ] State transitions fire on: topic open → `studying`, quiz submit → `quizzing` → `feedback`, plan complete → `adapting` → `done`
- [ ] Dashboard adapts UI based on current session state (`getAllowedActions()`)
- [ ] Admin `/admin/hermes` page shows all active sessions

## Tasks
- [x] **S0.1** Database schema migration (`supabase/schema.sql`)
- [ ] **S0.2** Session init on onboarding completion (`app/onboarding/page.tsx`)
- [ ] **S0.3** State transitions on user actions (`app/topic/[id]/page.tsx`, `components/QuizComponent.tsx`, `components/DailyPlan.tsx`)
- [ ] **S0.4** UI conditional rendering (`app/page.tsx` dashboard)
- [ ] **S0.5** Admin Hermes Monitor (`app/admin/hermes/page.tsx`)

## Definition of Done
- All DB migrations applied
- All code compiles (`npx tsc --noEmit` clean)
- Manual test: new user onboarding → topic → quiz → plan complete cycle verified
- Commit hash and test log recorded in this artifact
