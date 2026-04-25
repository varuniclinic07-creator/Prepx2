---
sprint: 2
story: "2.2: Subject Teacher Agent Framework + Polity Teacher"
epic: 2 (Hermes Orchestrator)
status: planned → awaiting approval
date: 2026-04-23
depends_on: sprint2-story-hermes-agent
priority: CRITICAL
blocks: sprint4-story-economy-teacher, sprint4-story-history-teacher, sprint4-story-geography-teacher, sprint4-story-science-teacher, sprint4-story-current-affairs-teacher
---

# 📋 Story: Subject Teacher Agent Framework

## 🎯 Goal
Create the Subject Teacher Agent base framework that Hermes spawns. All subject teachers (Polity, Economy, History, Geography, Science, Current Affairs, etc.) extend this base.

---

## 📦 Scope

### ✅ In Scope
- **Base SubjectTeacher class** with: system prompt builder, subject metadata, syllabus tag parser
- **Polity Teacher Agent** — first concrete implementation (subject='polity')
- **Template for new subjects** — add subject → generate teacher with 1 config line
- **Subject registry** — Hermes looks up which subject teacher to spawn
- **Agent task routing** — Hermes routes quiz/content/doubt tasks to correct subject
- **Admin subject management** — admin can enable/disable subjects

### ❌ Out of Scope
- Economy/History/Geography/Science implementations (Sprint 4)
- Subject-specific quiz logic differences (future)
- Real-time video agents per subject (future)
- Cross-subject agents (future)

---

## 📏 Acceptance Criteria
- [ ] Base interface exists: `id, subject, displayName, syllabusTree, systemPromptTemplate`
- [ ] PolityTeacher extends base with GS2-P1-L1→L20 knowledge
- [ ] Admin can view subject list and enable/disable
- [ ] Hermes routes tasks using `task.subject` field
- [ ] Adding a new subject requires only: name, syllabus tags, display name

## ✅ Definition of Done
- [ ] `lib/agents/subject-teacher.ts` — abstract base class
- [ ] `lib/agents/polity-teacher.ts` — concrete class with GS2 syllabus
- [ ] `lib/agents/subject-registry.ts` — map: subject → agent factory
- [ ] Admin page: `/admin/subjects` showing all registered subjects
- [ ] Database schema includes `subjects` table if not existent
