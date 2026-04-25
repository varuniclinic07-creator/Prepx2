---
fix: P1.5
sprint: 7-corrective
priority: P1
parent: sprint7-corrective-course-p0-fixes.md
---

# Fix P1.5: Personalized Daily Plan (Dynamic vs Static topic-001)

## Current State
- `DailyPlan.tsx` loads `daily_plans.tasks` from Supabase.
- Fallback is `DEFAULT_TASKS` array with all `topic-001`.
- No personalization based on weak areas, syllabus progression, or readiness.

## Scope
- [x] In Scope: Dynamic plan generation based on weak areas + syllabus + user readiness
- [ ] Out of Scope: AI-generated custom study schedule (Hermes can do this later)

## Tasks
- [ ] **P1.5.1** Create `lib/plan-generator.ts`:
  - Accept `user_id`
  - Fetch user's `weak_areas`, `user_sessions.current_state`, `user_sessions.readiness`
  - Query `topics` for topics NOT yet studied (no quiz attempts) OR in weak areas
  - Build task array: 1–2 new topics, 1 review topic, 1 practice quiz
  - Return tasks JSON matching existing `daily_plans.tasks` schema
- [ ] **P1.5.2** Create `/api/daily-plan/generate/route.ts` — POST endpoint:
  - Accepts `user_id`
  - Calls `generateDailyPlan()`
  - Upserts into `daily_plans` table for today
  - Returns the plan
- [ ] **P1.5.3** Update `app/page.tsx` (dashboard):
  - On mount / server render, call `/api/daily-plan/generate` if today's plan doesn't exist OR is still fallback
  - Display personalized tasks
- [ ] **P1.5.4** Update `DailyPlan.tsx` to show task type badges ("New", "Review", "Practice")

## Acceptance Criteria
- [x] Daily plan tasks vary by user (not all `topic-001`)
- [x] Weak areas get priority in task selection
- [x] Plan persists to `daily_plans` table
- [ ] `npx tsc --noEmit` passes

## Definition of Done
- [x] Dashboard shows personalized daily plan for each user
- [ ] No static fallback visible to active users
