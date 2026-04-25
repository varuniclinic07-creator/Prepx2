---
sprint: CC (Corrective Course)
type: architecture-gap-correction
date: 2026-04-23
persona: BMad Barry (Quick Flow Solo Dev)
status: critical-gap-detected → awaiting-approval
---

# 🚨 BMAD Corrective Course: Hermes + Multi-Subject Architecture

## Detected By
User feedback during Sprint 3 planning.

## Critical Findings

| Gap | Impact | Story Artifact Status |
|-----|--------|----------------------|
| **Hermes Orchestrator (Epic 2)** — The central brain | Core dependency missing. All agent orchestration is unmanaged. | `sprint2-story-hermes-agent.md` ⏳ JUST CREATED — awaiting approval |
| **Subject Teacher Framework** | Only Polity exists. No framework for Economy/History/Geography/Science. | `sprint2-story-subject-teachers.md` ⏳ JUST CREATED — awaiting approval |
| **Agent Task Table** | No database table to track agent tasks, state, or handoffs. | `supabase/agent_tasks` NOT IN SCHEMA |
| **Admin Agent Dashboard** | Cannot see active agents. No observability of agent health. | `/admin/agents` PAGE NOT CREATED |
| **Cross-subject coordination** | Hermes was supposed to spawn 24/7 agents per field. | ZERO COORDINATION CODE |

## Why This Happened
Sprint 1–2 focused on "Quick Flow" MVP delivery (users, topics, quizzes, auth) and missed the **orchestration layer**. Hermes (Epic 2) appears in PRD but was deprioritized during Sprint 1 planning.

## Correction Plan

### Phase A: Hermes Core (Sprint 2 retroactive)
| # | Story | File | Priority |
|---|-------|------|----------|
| A1 | Hermes Engine (state machine) | `lib/hermes.ts` | CRITICAL |
| A2 | Subject Teacher Base Framework | `lib/agents/subject-teacher.ts` | CRITICAL |
| A3 | Polity Teacher Agent | `lib/agents/polity-teacher.ts` | CRITICAL |
| A4 | Subject Registry (map) | `lib/agents/subject-registry.ts` | CRITICAL |
| A5 | Agent Tasks Table | `supabase/schema.sql` | CRITICAL |
| A6 | Admin Agent Dashboard | `app/admin/agents/page.tsx` | HIGH |

### Phase B: Hermes Integration (Sprint 3)
| # | Story | File | Priority |
|---|-------|------|----------|
| B1 | Hermes reads daily_plan + weak_areas | `lib/hermes.ts` update | HIGH |
| B2 | Hermes delegates to Quiz Agent | `lib/agents/quiz-agent.ts` | HIGH |
| B3 | Hermes delegates to Research Agent | `lib/agents/research-agent.ts` | MEDIUM |
| B4 | Hermes delegates to Daily Plan Agent | `lib/agents/daily-plan-agent.ts` | MEDIUM |

### Phase C: Multi-Subject Expansion (Sprint 4)
| # | Story | Subject | Notes |
|---|-------|---------|-------|
| C1 | Economy Teacher Agent | economy | GS3 syllabus |
| C2 | History Teacher Agent | history | GS1 syllabus |
| C3 | Geography Teacher Agent | geography | GS1 syllabus |
| C4 | Science Teacher Agent | science | GS3 syllabus |
| C5 | Current Affairs Teacher Agent | current-affairs | GS2/GS3 cross |

## Impact on Sprint 3
Stories 1–8 of Sprint 3 (Polity completion, mnemonics, quizzes, mindmaps, shorts, PDF, self-improvement, audit) **all depend on Hermes being operational first.**

**Without Hermes:**
- No 24/7 agent spawns
- No cross-agent coordination
- Mnemonics and content refinement have no orchestration layer
- Self-improvement loop has no state machine
- Research agent has no caller

---

## 🧭 Approve Correction?

Reply with:
- `APPROVE A` → Build Hermes Core (Phase A) before any Sprint 3 code
- `APPROVE A+B` → Build Hermes Core + Integration before Sprint 3
- `SKIP HERMES` → Proceed with Sprint 3 without orchestration
- `EDIT` → modify correction scope
