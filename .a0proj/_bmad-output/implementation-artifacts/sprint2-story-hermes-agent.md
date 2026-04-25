---
sprint: 2
story: "2.1: Hermes Orchestrator — Central Agent Brain"
epic: 2 (Hermes Orchestrator)
status: planned → awaiting approval
date: 2026-04-23
depends_on: sprint2-story-ai-router
priority: CRITICAL
---

# 📋 Story: Hermes Orchestrator — The Brain

## 🎯 Goal
Build Hermes — the central orchestration agent that coordinates ALL AI agents (subject teachers, research, quiz, daily plan) based on user context, daily plan, and weak areas.

---

## 📦 Scope

### ✅ In Scope
- **Hermes Engine**: State machine that reads user context and decides which agent(s) to spawn
- **Agent Registration System**: Each agent registers its capabilities to Hermes
- **Agent Spawn Logic**: Hermes delegates tasks to appropriate agent via AI Router + Supabase
- **Agent Communication**: Shared memory via `agent_tasks` table + Supabase Realtime
- **Subject Teacher Base Interface**: Common pattern for all subject agents
- **Polity Teacher Agent**: First implementation of a subject teacher spawned by Hermes
- **Agent Status Dashboard**: Admin can see which agents are running and their tasks

### ❌ Out of Scope
- Economy/History/Geography subject teachers (Sprint 4+)
- Real-time voice/video agents (Sprint 7)
- Gamification engine (Sprint 7)
- Interview prep agents (Sprint 7)
- 3D visualization agents (Sprint 5)

---

## 📏 Acceptance Criteria

- [ ] Hermes Engine has a deterministic state machine with these states: `idle`, `planning`, `delegating`, `monitoring`, `reviewing`
- [ ] Hermes reads user's daily_plan, weak_areas, quiz_attempts to build context
- [ ] Hermes delegates tasks to: `SubjectTeacher`, `QuizGenerator`, `DailyPlanner`, `ResearchAgent`
- [ ] Each subject teacher agent runs with system prompt specifying subject expertise
- [ ] Agent tasks stored in `agent_tasks` table with status tracking
- [ ] Admin panel shows active agent count + task queue

## ✅ Definition of Done

- [ ] `lib/hermes.ts` implements orchestration engine
- [ ] `lib/agents/subject-teacher.ts` base class with system prompt builder
- [ ] `lib/agents/polity-teacher.ts` extends base with Polity expertise
- [ ] `lib/agents/research-agent.ts` with web search capability (placeholder)
- [ ] `lib/agents/quiz-agent.ts` with quiz generation capability
- [ ] `lib/agents/daily-plan-agent.ts` with plan generation
- [ ] `supabase/agent_tasks` table created in schema with RLS
- [ ] Admin panel shows agent activity feed

## 🚨 Execution Rule
NO CODE EXECUTION UNTIL EXPLICIT APPROVAL
