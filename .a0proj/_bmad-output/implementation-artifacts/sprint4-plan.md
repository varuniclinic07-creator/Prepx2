---
sprint: 4
status: formal-plan-draft → awaiting approval
date: 2026-04-24
persona: BMAD Bob (Scrum Master)
velocity_basis: 1 solo full-stack dev, ~5 story points / 2-week sprint
---

# 🏃 Sprint 4 Plan: Hermes Wired + UPSC Race + Study Squads

## Sprint Goal
Wire the Hermes state machine into the actual app user flow, build the UPSC Race readiness dashboard, ship a beta Study Squads feature, and implement the Day 14 Reveal cohort experience. Connect everything built in Sprints 0-3 into a cohesive aspirant journey.

**Sprint Duration:** 2 weeks
**Capacity:** 1 solo full-stack dev
**Risk:** MEDIUM — Hermes wiring touches every user interaction; regression testing is critical.

---

## 📋 Story Order (Dependency-First)

```
S0  Hermes Wiring — App Integration      ← CRITICAL PATH START
  ├─ S0.1 user_sessions + agent_tasks tables (Supabase schema)
  ├─ S0.2 Hermes session initialization on onboarding complete
  ├─ S0.3 State transitions on user actions (read → quiz → review)
  ├─ S0.4 getAllowedActions(state) → UI conditional rendering
  └─ S0.5 Admin Hermes Monitor page

S1  UPSC Race — Readiness Dashboard     ← depends S0.3
  ├─ S1.1 readinessScore() endpoint
  ├─ S1.2 Strength/Weakness radar chart component
  ├─ S1.3 Trend line (days to ready)
  └─ S1.4 Comparative positioning vs other aspirants

S2  Study Squads (Beta)                ← depends S0.1
  ├─ S2.1 squad_members table
  ├─ S2.2 Create/Join squad flow
  ├─ S2.3 Squad leaderboard
  └─ S2.4 Squad daily plan sync

S3  Day 14 Reveal                      ← depends S0.1, S1.1
  ├─ S3.1 cohort tracking table
  ├─ S3.2 Day 14 readiness reveal modal
  ├─ S3.3 Adjusted plan based on reveal
  └─ S3.4 WhatsApp/email nudge at Day 7 and Day 13
```

---

## Story S0: Hermes Wiring — App Integration

**Epic:** 2 — Hermes Orchestrator Phase B
**Priority:** P0 — BLOCKS ALL OTHER STORIES
**Estimated Effort:** 6 dev-days (12 story points)
**Dependencies:** Sprint 3 S0 completion (Hermes state machine exists)

### Scope
- [x] In Scope: Schema DDL for user_sessions and agent_tasks, Hermes session init on onboarding, state transitions on UI actions, getAllowedActions(), admin monitor
- [ ] Out of Scope: Redis queue, LangGraph, real-time WebSocket sync, push notifications

### Tasks

- [ ] **S0.1** Database schema migration
  - `user_sessions`: user_id PK, session_state CHECK, current_topic_id FK, current_quiz_id FK, daily_plan_id FK, last_activity_at, readiness_score, created_at, updated_at
  - `agent_tasks`: id PK, user_id FK, agent_type, status CHECK, payload JSONB, result JSONB, attempt_count, created_at, completed_at
  - Indexes: (user_id, status), (status, created_at) for polling
- [ ] **S0.2** Initialize session on onboarding complete
  - Hook into onboarding page: after baseline_score saved, call `createUserSession(userId)`
  - Default state: `idle`, readiness_score: 0
- [ ] **S0.3** State transitions on user actions
  - `/topic/[id]`: on mount → transition to `studying`
  - Quiz submit → transition to `quizzing` then `feedback`
  - Daily plan complete → transition to `adapting` then `done`
- [ ] **S0.4** UI conditional rendering via getAllowedActions()
  - If state === `studying`: show "Take Quiz" CTA, hide "Next Topic"
  - If state === `feedback`: show "Review Weak Areas", hide "Continue"
  - Dashboard adapts based on current state
- [ ] **S0.5** Admin Hermes Monitor (`/admin/hermes`)
  - List all `user_sessions` with state, last_activity_at
  - Show transition history (if logged)
  - Force-reset state button for debugging

### Acceptance Criteria
- [ ] User session row created automatically after onboarding
- [ ] State changes when user opens topic, submits quiz, completes plan
- [ ] `getAllowedActions()` returns correct actions for every state
- [ ] Dashboard reflects current session state
- [ ] Admin `/admin/hermes` loads and shows active sessions
- [ ] Build passes 0 TS errors

### Definition of Done
- [ ] DB migrations applied
- [ ] All code committed
- [ ] Manual test: new user onboarding → topic → quiz → plan complete cycle
- [ ] Artifact updated with commit hash and test log

---

## Story S1: UPSC Race — Readiness Dashboard

**Epic:** 21 — Progression Engine + Readiness Score
**Priority:** P1
**Estimated Effort:** 4 dev-days (8 story points)
**Dependencies:** S0.3 (Hermes transitions operational), S0.1 (user_sessions)

### Tasks
- [ ] **S1.1** `readinessScore()` endpoint in `lib/progression-engine.ts`
  - Inputs: quiz attempts, weak areas, streak count, time studied
  - Output: 0-100 score, L1-L5 level, estimated_days_to_ready
- [ ] **S1.2** `/race` page with radar chart
  - Recharts or Chart.js for 5-dimension radar (Polity, History, Economy, Ethics, CSAT)
  - Strengths (score > 70) vs Weaknesses (score < 40) highlighting
- [ ] **S1.3** Trend line component
  - Last 14 days readiness score trend
  - Predicted exam-ready date
- [ ] **S1.4** Comparative positioning
  - Anonymous percentile ranking vs all app users
  - Median score benchmark line

### Acceptance Criteria
- [ ] `/race` page accessible from dashboard nav
- [ ] Radar chart renders with real data from user history
- [ ] Trend line shows 14-day trajectory
- [ ] Estimated exam-ready date calculates correctly
- [ ] Build passes cleanly

---

## Story S2: Study Squads (Beta)

**Epic:** 22 — Social Learning Layer
**Priority:** P2
**Estimated Effort:** 3 dev-days (6 story points)
**Dependencies:** S0.1 (user_sessions for member tracking)

### Tasks
- [ ] **S2.1** `squad_members` table
  - squad_id, user_id, joined_at, role ENUM('leader', 'member')
  - `squads` table: id, name, invite_code, subject, created_by
- [ ] **S2.2** Create/Join squad flow
  - `/squads` page: list public squads, create squad modal
  - Join via invite code
- [ ] **S2.3** Squad leaderboard
  - Aggregate readiness_score per squad member
  - Weekly ranking
- [ ] **S2.4** Squad daily plan sync
  - Shared topic for the day
  - Member completion status

### Acceptance Criteria
- [ ] User can create a squad with name and subject
- [ ] User can join via 6-character invite code
- [ ] Leaderboard shows avg squad readiness
- [ ] Daily plan sync visible to all members
- [ ] Build passes cleanly

---

## Story S3: Day 14 Reveal

**Epic:** 23 — Cohort Onboarding Experience
**Priority:** P2
**Estimated Effort:** 2 dev-days (4 story points)
**Dependencies:** S0.1, S1.1 (readiness score baseline)

### Tasks
- [ ] **S3.1** `user_cohorts` table
  - user_id, cohort_start_date, day_14_revealed BOOLEAN, baseline_readiness, day_14_readiness
- [ ] **S3.2** Day 14 reveal modal
  - Trigger on login if day_14_revealed = false AND today >= cohort_start_date + 14 days
  - Show before/after comparison, percentile jump, next-phase recommendation
- [ ] **S3.3** Adjusted plan post-reveal
  - If readiness improved > 20%: accelerate to advanced topics
  - If stagnant: remedial plan with extra weak-area focus
- [ ] **S3.4** Nudge system (placeholder)
  - Log nudge events at Day 7 and Day 13
  - Actual WhatsApp/email deferred to Sprint 5

### Acceptance Criteria
- [ ] Cohort row created on first onboarding
- [ ] Modal triggers precisely on Day 14
- [ ] Before/after comparison renders correctly
- [ ] Adjusted plan reflects reveal outcome
- [ ] Build passes cleanly

---

## 🎯 Sprint 4 Success Criteria

| Metric | Target |
|--------|--------|
| Hermes states wired | 8/8 states reachable via UI |
| Readiness dashboard live | /race renders real data |
| Study Squads functional | create + join + leaderboard work |
| Day 14 Reveal | modal fires on day 14 for test cohort |
| Test coverage | ≥15% (up from ~8%) |
| Build | 0 TS errors, all routes compile |
