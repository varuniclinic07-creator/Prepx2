---
sprint: 3
status: formal-plan-complete → awaiting approval
date: 2026-04-23
persona: BMAD Bob (Scrum Master)
velocity_basis: 1 solo full-stack dev, ~5 story points / 2-week sprint
---

# 🏃 Sprint 3 Plan: Hermes Brain + Polity Completion

## Sprint Goal
Build the Hermes orchestration layer (the brain), complete the Polity smart book (10 topics), harden test infrastructure, and establish subscription gating so Sprint 4 can scale to multi-subject.

**Sprint Duration:** 2 weeks (aggressive) — recommended 3 weeks given corrective course additions
**Capacity:** 1 solo full-stack dev
**Risk:** HIGH if Hermes core is not completed by Day 4. Escalate immediately if blocked.

---

## 🚨 P0 Critical Gaps Addressed This Sprint

| # | Gap | Story | Owner | Day Target |
|---|-----|-------|-------|------------|
| 1 | Hermes Orchestrator missing | S0 | Dev | Day 1–5 |
| 2 | Agent Tasks table missing | S0.1 | Dev | Day 1–2 |
| 3 | Subscription/monetization missing | S6 (PDF watermark tiering) | Dev | Day 8–10 |
| 4 | Tests at 1.5/5 maturity | S9 (Test Hardening) | Dev | Parallel Week 1–2 |
| 5 | Multi-subject framework missing | S0.4 (Subject Registry) | Dev | Day 3–4 |

**Victor's innovations queued for Sprint 4+:**
- Government source ingestion (PIB, ARC, Lok Sabha) → Sprint 5
- Predictive question modeling → Sprint 5
- Comparative positioning / UPSC Race → Sprint 4
- Study squads → Sprint 4
- Day 14 reveal → Sprint 4

---

## 📋 Story Order (Dependency-First)

```
S0  Hermes Core Infrastructure      ← CRITICAL PATH START
  ├─ S0.1 user_sessions table
  ├─ S0.2 agent_tasks table
  ├─ S0.3 lib/hermes.ts state machine
  ├─ S0.4 Subject Teacher base + Registry
  └─ S0.5 Polity Teacher Agent

S9  Test Infrastructure Hardening   ← PARALLEL TRACK WEEK 1–2

S1  Complete Polity Topic Coverage  ← depends S0.5
S2  Mnemonics for All Chapters      ← depends S1
S3  Chapter-End Quizzes (Batch)     ← depends S1

S4  Animated Mindmaps               ← depends S1
S5  Concept Shorts Pipeline         ← depends S1

S6  PDF Export with Watermarks      ← depends S1, needs subscription gating
S7  Self-Improvement Loop           ← depends S1, S3, S0.3
S8  Admin Spot-Check Audit          ← depends S1, S7
```

---

## Story S0: Hermes Core Infrastructure

**Epic:** 2 — Hermes Orchestrator + Phase A (Corrective Course)
**Priority:** P0 — BLOCKS ALL OTHER STORIES
**Estimated Effort:** 5 dev-days (10 story points)
**Dependencies:** None — foundational
**RTO:** Must complete by Day 5 or sprint is at risk

### Scope
- [x] In Scope: `user_sessions` table, `agent_tasks` table, `lib/hermes.ts` state machine, Subject Teacher base class, Subject Registry map, Polity Teacher agent, Admin Agent Dashboard page
- [ ] Out of Scope: LangGraph integration, Redis queue, multi-subject teachers beyond Polity, nightly cron re-scoring, readiness score algorithm, government source ingestion

### Tasks (Execution Plan)

- [ ] **S0.1** Create `user_sessions` table in Supabase schema
  - [ ] Columns: `user_id UUID PK`, `session_state TEXT CHECK`, `current_topic_id UUID FK`, `current_quiz_id UUID FK`, `daily_plan_id UUID FK`, `last_activity_at TIMESTAMPTZ`, `readiness_score NUMERIC DEFAULT 0`, `created_at`, `updated_at`
  - [ ] RLS: user can read own row only
  - [ ] Row auto-created on first onboarding completion
- [ ] **S0.2** Create `agent_tasks` table in Supabase schema
  - [ ] Columns: `id UUID PK`, `user_id UUID FK → auth.users`, `agent_type TEXT`, `status TEXT CHECK('queued'|'running'|'completed'|'failed')`, `payload JSONB`, `result JSONB`, `attempt_count INT DEFAULT 0`, `created_at`, `completed_at`
  - [ ] Index on `(user_id, status)` for queue queries
  - [ ] Index on `(status, created_at)` for worker polling
- [ ] **S0.3** Build `lib/hermes.ts` — deterministic state machine
  - [ ] Define 8 states: `idle` → `planning` → `ready` → `studying` → `quizzing` → `feedback` → `adapting` → `done`
  - [ ] `transition(currentState, event)` returns nextState or throws InvalidTransition
  - [ ] `getAllowedActions(state)` returns UI actions user can take
  - [ ] Unit tests for every state-event permutation
- [ ] **S0.4** Build Subject Teacher base framework
  - [ ] `lib/agents/subject-teacher.ts` — abstract base class with: `generateContent(topicId)`, `generateQuiz(topicId)`, `generateMnemonic(topicId)`, `generateMindmap(topicId)`
  - [ ] `lib/agents/subject-registry.ts` — singleton map: `subjectKey → SubjectTeacher instance`
  - [ ] `registerSubject(key, instance)` and `getTeacher(key)` methods
  - [ ] Type-safe contract so Hermes delegates without knowing subject internals
- [ ] **S0.5** Build Polity Teacher Agent
  - [ ] `lib/agents/polity-teacher.ts` extends SubjectTeacher
  - [ ] Implements all 4 methods using AI Router + Supabase
  - [ ] Constraints: syllabus tags `GS2-P1-L1..L10` only, corpus from approved sources
  - [ ] Error handling: task → `agent_tasks` queue on failure, retry up to 3x
- [ ] **S0.6** Admin Agent Dashboard (`/admin/agents`)
  - [ ] List all `agent_tasks` with status, agent_type, created_at
  - [ ] Filter by status (queued, running, completed, failed)
  - [ ] Retry failed tasks button
  - [ ] Show `user_sessions` state distribution pie chart

### Acceptance Criteria

- [ ] `user_sessions` table exists with all columns + RLS
- [ ] `agent_tasks` table exists with all columns + indexes
- [ ] `lib/hermes.ts` passes 100% state-machine unit tests (all 8 states × all events)
- [ ] `lib/agents/polity-teacher.ts` can generate content for a topic end-to-end
- [ ] Failed agent task goes to `agent_tasks` with `status='failed'` and `attempt_count` > 0
- [ ] `/admin/agents` loads without errors and shows task list
- [ ] `npx next build` passes cleanly
- [ ] `npx vitest run` passes for all new hermes + agent tests

### Definition of Done

- [ ] All database migrations applied to Supabase
- [ ] All code files committed with descriptive messages
- [ ] Unit tests exist for `hermes.ts` state transitions (≥20 tests)
- [ ] Unit tests exist for Polity Teacher (≥5 tests: generateContent, generateQuiz, error path)
- [ ] Admin dashboard manually verified in browser
- [ ] This artifact updated with proof (commit hashes, test output)
- [ ] Build passes with 0 TS errors
- [ ] No console errors on `/admin/agents` load

---

## Story S1: Complete Polity Topic Coverage (10 Topics)

**Epic:** 16 — Content Writing Specialist Agent
**Priority:** 1
**Estimated Effort:** 3 dev-days (6 story points)
**Dependencies:** S0.5 (Polity Teacher Agent operational)

### Tasks

- [ ] Expand Polity Teacher with `GS2-P1-L2` → `L10` syllabus tags
- [ ] Run Polity Teacher via `/admin/content` for 9 remaining topics
- [ ] Verify each topic JSONB has: `definitions`, `key_concepts[]`, `pyqs[]`, `common_traps[]`, `summary`, `mnemonic` (placeholder), `mindmap` (placeholder)
- [ ] Run Quiz Generator batch via `/admin/quizzes` for 9 topics
- [ ] Verify quiz linkage: each topic has ≥1 row in `quizzes` table
- [ ] Admin dashboard spot-check: all 10 topics visible, no empty content fields

### Acceptance Criteria

- [ ] Exactly 10 Polity topics in `topics` table with tags `GS2-P1-L1` → `L10`
- [ ] Each topic has non-empty `content` JSONB with all required keys
- [ ] Each topic has ≥1 linked quiz in `quizzes` table
- [ ] Admin `/admin/content` reflects all 10 entries
- [ ] Build passes cleanly

### Definition of Done

- [ ] Database count query returns 10 topics, 10 quizzes minimum
- [ ] No empty JSONB fields in any topic
- [ ] Artifact updated with proof (row counts)
- [ ] All admin-verified with screenshot or log

---

## Story S2: Mnemonics for All Chapters

**Epic:** 16 (cont.)
**Priority:** 2
**Estimated Effort:** 2 dev-days (4 story points)
**Dependencies:** S1

### Tasks

- [ ] Add `generateMnemonic(topicId)` to Polity Teacher if not in S0.5
- [ ] Trigger mnemonic generation for all 10 topics via admin panel
- [ ] Store mnemonic in `topics.content.mnemonic`
- [ ] Render mnemonic in `TopicViewer` component below key concepts
- [ ] Verify mnemonics are UPSC-relevant (not generic nonsense)

### Acceptance Criteria

- [ ] 10/10 topics have non-empty `content.mnemonic`
- [ ] Mnemonics visible in topic view UI
- [ ] Admin can re-generate a mnemonic per topic
- [ ] All mnemonics ≤140 characters (memorable length)

### Definition of Done

- [ ] `topics` table verified: 10 mnemonics present
- [ ] UI renders without layout shift
- [ ] Artifact updated with sample mnemonics listed

---

## Story S3: Chapter-End Quizzes (Batch)

**Epic:** 16 (cont.)
**Priority:** 2
**Estimated Effort:** 2 dev-days (4 story points)
**Dependencies:** S1

### Tasks

- [ ] Ensure Quiz Generator produces exactly 5 MCQs per chapter-end quiz
- [ ] Batch run for any topic missing a quiz (should be 0 after S1, but verify)
- [ ] Validate MCQ JSONB schema: `question`, `options[4]`, `correct_index`, `explanation`, `difficulty`, `topic_tag`
- [ ] Admin batch report showing success/fail per topic
- [ ] Link quizzes to topics in `topic_quizzes` join table or `quizzes.topic_id` FK

### Acceptance Criteria

- [ ] 10/10 topics have exactly 1 chapter-end quiz with 5 MCQs each
- [ ] Total 50 MCQs in database, all valid JSONB
- [ ] Batch generation report shows 10/10 success
- [ ] Admin `/admin/quizzes` shows 10 quizzes

### Definition of Done

- [ ] Database query: `SELECT COUNT(*) FROM quizzes WHERE type='chapter_end'` = 10
- [ ] Database query: `SELECT SUM(jsonb_array_length(questions)) FROM quizzes` = 50
- [ ] No malformed MCQs (all have 4 options, correct_index in 0..3)
- [ ] Artifact updated with proof

---

## Story S4: Animated Mindmaps

**Epic:** 16 (cont.)
**Priority:** 3
**Estimated Effort:** 3 dev-days (6 story points)
**Dependencies:** S1

### Tasks

- [ ] Add `generateMindmap(topicId)` to Polity Teacher
- [ ] Mindmap JSON schema: `{ root: string, children: [{ label, children? }] }`
- [ ] Store in `topics.content.mindmap`
- [ ] Build `MindmapViewer` component: collapsible tree using recursive React + Tailwind
- [ ] Integrate into `TopicViewer` below content
- [ ] Add expand-all / collapse-all controls
- [ ] Mobile-responsive (horizontal scroll if needed)

### Acceptance Criteria

- [ ] 10/10 topics have `content.mindmap` JSON
- [ ] `TopicViewer` renders mindmap as interactive tree
- [ ] Clicking node expands/collapses children
- [ ] Works on mobile without horizontal overflow clipping
- [ ] Build passes

### Definition of Done

- [ ] All 10 mindmaps generated and stored
- [ ] Component tested manually on desktop + mobile viewport
- [ ] No console errors on topic load
- [ ] Artifact updated with mindmap structure sample

---

## Story S5: Concept Shorts Pipeline

**Epic:** 16 (cont.)
**Priority:** 3
**Estimated Effort:** 2 dev-days (4 story points)
**Dependencies:** S1

### Tasks

- [ ] Add `generateConceptShort(topicId, conceptKey)` to Polity Teacher
- [ ] Target: 20 concept shorts across 10 chapters (2 per chapter avg)
- [ ] Store in `topics.content.concept_shorts[]` as `{ concept, short_text }`
- [ ] Render in `TopicViewer` as "Quick Recall" cards
- [ ] Admin toggle: show/hide concept shorts in topic view
- [ ] Text-only in this sprint (video generation is Sprint 5)

### Acceptance Criteria

- [ ] ≥20 concept shorts exist across all topics
- [ ] Each short is 60–80 words
- [ ] UI shows them as styled cards, not wall of text
- [ ] Admin can regenerate per concept

### Definition of Done

- [ ] Database count: ≥20 `concept_shorts` entries
- [ ] `TopicViewer` renders cards with distinct visual treatment
- [ ] Artifact updated with proof (count + sample texts)

---

## Story S6: PDF Export with Watermarks

**Epic:** 14 — Advanced Features
**Priority:** 4
**Estimated Effort:** 3 dev-days (6 story points)
**Dependencies:** S1 (needs content to export), subscription gating infrastructure

### Tasks

- [ ] Build `GET /api/topic/[id]/export/pdf` route
- [ ] Use Puppeteer or jsPDF to generate PDF from topic content
- [ ] Include topic title, content sections, key concepts, mnemonic, mindmap (text representation)
- [ ] Watermark: "PREPX FREE TIER — UPGRADE FOR CLEAN PDF" on free users
- [ ] No watermark for Premium (₹299) and Premium+ (₹1,199)
- [ ] Check `user_subscriptions` table for active tier before export
- [ ] Return 403 if free user exceeds quota (3 exports/week)
- [ ] Add download button in `TopicViewer` (gated)

### Acceptance Criteria

- [ ] API returns PDF blob with correct Content-Type
- [ ] Free user PDF has diagonal watermark text on every page
- [ ] Premium user PDF has NO watermark
- [ ] Free user blocked after 3 exports/week (429 or 403)
- [ ] Build passes

### Definition of Done

- [ ] Manual test: free export → watermark visible
- [ ] Manual test: premium export → no watermark
- [ ] Manual test: 4th free export → blocked
- [ ] Unit test for quota middleware (≥2 tests)
- [ ] Artifact updated with test results

---

## Story S7: Self-Improvement Loop

**Epic:** 16 (cont.)
**Priority:** 4
**Estimated Effort:** 4 dev-days (8 story points)
**Dependencies:** S1, S3 (needs quiz data), S0.3 (Hermes state machine)

### Tasks

- [ ] Define "low-performing chapter" = avg quiz score < 60% after ≥5 attempts
- [ ] Build analytics query in `lib/analytics.ts`: chapter performance per topic
- [ ] Admin dashboard: "Quality Score" column per topic (0–100)
- [ ] Regenerate button: triggers Polity Teacher to rewrite `content` for that topic
- [ ] Versioning: `content.version` increments on regeneration, old content archived in `content_history` JSONB
- [ ] Post-regeneration quiz auto-generated to verify improvement
- [ ] Compare readability score (Flesch-Kincaid) before/after

### Acceptance Criteria

- [ ] Admin can see quality score per topic (0–100)
- [ ] Regenerate button creates new content + increments version
- [ ] New quiz generated automatically post-regeneration
- [ ] Readability_score tracked before/after
- [ ] No data loss: old content preserved in history

### Definition of Done

- [ ] Analytics dashboard renders quality scores
- [ ] Regeneration tested end-to-end on 1 low-performing topic
- [ ] Version history queryable
- [ ] Artifact updated with sample before/after metrics

---

## Story S8: Admin Spot-Check Audit

**Epic:** 4 — Admin Control Center
**Priority:** 5
**Estimated Effort:** 2 dev-days (4 story points)
**Dependencies:** S1, S7 (quality scores must exist)

### Tasks

- [ ] Build `/admin/audit` page
- [ ] Random selection: load 3 random topics on page load
- [ ] Show content preview + quality checklist per topic:
  - [ ] All JSONB keys present?
  - [ ] Mnemonic non-empty?
  - [ ] Mindmap non-empty?
  - [ ] Quiz linked?
  - [ ] Content length > 500 words?
  - [ ] No AI hallucination red flags?
- [ ] Completeness score auto-calculated (6 checks = 100%)
- [ ] Flag button: mark topic for review with note
- [ ] Export audit report as CSV

### Acceptance Criteria

- [ ] `/admin/audit` loads 3 random topics on every visit
- [ ] Completeness score shown per topic (0–100%)
- [ ] Flagged topics stored in `audit_flags` table
- [ ] CSV export works
- [ ] Build passes

### Definition of Done

- [ ] Page manually tested with 10 topics
- [ ] All 6 checklist items validated against database
- [ ] Flagged topic queryable in Supabase
- [ ] Artifact updated with audit screenshot/log

---

## Story S9: Test Infrastructure Hardening

**Epic:** Test Architecture (TEA Module)
**Priority:** P0 — PARALLEL TRACK
**Estimated Effort:** 4 dev-days (8 story points)
**Dependencies:** None — can run parallel to S0
**RTO:** Should show measurable coverage improvement by end of Week 1

### Tasks

- [ ] Add Vitest coverage provider (`@vitest/coverage-v8`)
- [ ] Add `nock` or `msw` for API mock interception
- [ ] Add `faker` for consistent test data generation
- [ ] Backfill unit tests for existing critical paths:
  - [ ] `lib/ai-router.ts` — parse response, fallback logic
  - [ ] `lib/content-agent.ts` — prompt construction
  - [ ] `lib/quiz-generator.ts` — MCQ validation
  - [ ] Auth middleware — role checks
  - [ ] `components/QuizComponent.tsx` — answer selection, score calc
- [ ] Add integration test: signup → onboarding → daily plan → quiz flow
- [ ] CI check: `vitest run --coverage` fails build if < 30% coverage
- [ ] Fix known QuizComponent async bug (state update after unmount)

### Acceptance Criteria

- [ ] Coverage report generated with `npm run test:coverage`
- [ ] Coverage ≥ 30% (up from ~5%)
- [ ] Hermes state machine has 100% branch coverage (S0.3)
- [ ] No flaky tests (run 5×, all pass)
- [ ] QuizComponent async bug fixed + regression test added

### Definition of Done

- [ ] `npm run test:coverage` exits 0 with ≥30% coverage
- [ ] CI workflow updated to enforce coverage gate
- [ ] Known bug fixed with test proving it
- [ ] Artifact updated with coverage screenshot

---

## 📊 Dependency Map

```
S0  Hermes Core ─────────────────────────────────────────┐
  ├─ S0.1 user_sessions                                    │
  ├─ S0.2 agent_tasks                                     │
  ├─ S0.3 hermes.ts       ← S7 depends                    │
  ├─ S0.4 Subject base    ← S1,S2,S3,S4,S5 delegates    │
  └─ S0.5 Polity Teacher  ← S1 uses                      │
                                                          │
S9  Test Hardening (parallel) ─────────────────────────┘

S1  Polity Complete (10 topics) ──────────────────────────┐
  ├─ S2 Mnemonics         ← next                         │
  ├─ S3 Chapter Quizzes   ← next                         │
  ├─ S4 Mindmaps          ← next                         │
  ├─ S5 Concept Shorts  ← next                         │
  └─ S6 PDF Export        ← after S1 + subscription gate │
                                                          │
S7  Self-Improvement Loop  ← depends S1 + S3 + S0.3      │
S8  Admin Audit            ← depends S1 + S7               │
```

---

## 📅 Proposed Sprint Schedule (2-Week Sprint)

| Day | Focus | Stories | Risk |
|-----|-------|---------|------|
| **Mon** | S0.1 + S0.2 tables, S9 setup | S0, S9 | Low |
| **Tue** | S0.3 state machine, unit tests | S0, S9 | Low |
| **Wed** | S0.4 + S0.5 Subject framework, S0.6 admin | S0 | Medium |
| **Thu** | S1 Polity generation run | S1 | Medium |
| **Fri** | S1 verification + S2 mnemonics | S1, S2 | Medium |
| **Mon** | S3 quizzes + S4 mindmaps start | S3, S4 | Medium |
| **Tue** | S4 mindmaps UI + S5 shorts | S4, S5 | Low |
| **Wed** | S6 PDF export + watermark | S6 | Medium |
| **Thu** | S7 self-improvement loop | S7 | High |
| **Fri** | S8 audit + S9 backfill completion | S8, S9 | Medium |
| **Buffer** | Regression testing, build, documentation | All | — |

**Critical Chain:** S0 → S1 → S3 → S7 → S8
**Slack:** S2, S4, S5, S6 have 1–2 days slack if critical chain slips.

---

## ✅ Sprint 3 Definition of Done (Global)

Sprint 3 is **COMPLETE** when ALL are true:

- [ ] Hermes operational: state machine passes tests, Polity Teacher generates content
- [ ] 10 Polity topics complete with quizzes, mnemonics, mindmaps, concept shorts
- [ ] PDF export works with tier-aware watermarking
- [ ] Self-improvement loop identifies and regenerates low-performing content
- [ ] Admin audit page functional with random spot-check
- [ ] Test coverage ≥ 30% with no flaky tests
- [ ] `npx next build` passes with 0 TS errors
- [ ] Supabase schema migrations applied in production
- [ ] All story artifacts updated with proof
- [ ] Sprint status updated in `sprint-plan.md`

---

## 🧭 Approve Sprint 3 Plan?

Reply with:
- `APPROVE` → Begin implementation. I update state and route to developer agent.
- `EDIT` → Tell me what to change (story split, effort, order, scope).
- `REJECT` → Discard plan, return to corrective course discussion.
- `SPLIT` → Recommend splitting into Sprint 3A (Hermes + Polity) and Sprint 3B (Features + PDF).
