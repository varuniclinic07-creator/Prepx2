---
sprint: 3
story: "Story 1: Complete Polity Topic Coverage"
epic: 16 (Content Writing Specialist Agent)
status: planned → awaiting approval
date: 2026-04-23
persona: BMad Barry (Quick Flow Solo Dev)
priority: 1
depends_on: sprint2-story-content-agent, sprint2-story-quiz-generation
---

# 📋 Story 1: Complete Polity Topic Coverage

## 🎯 Goal
Expand Polity content coverage from 1 → 10 topics under GS2-P1 syllabus tags with quizzes linked per topic.

---

## 📦 Scope

### ✅ In Scope
- GS2-P1-L2 → L10 topic generation (9 additional topics)
- Quiz generation per topic (9 additional quizzes)
- Admin dashboard verification
- Content quality baseline (structured JSONB with all required fields)

### ❌ Out of Scope
- Mnemonics generation (Story 2)
- Adaptive learning algorithms
- Quality optimization / self-improvement loops (Story 5)
- UI redesign or new components
- Animated mindmaps or concept shorts
- PDF export or premium features
- Economy subject expansion

---

## 📏 Acceptance Criteria (MANDATORY)

Exactly 10 Polity topics exist in the database.
Each topic has:
- Valid syllabus tag (GS2-P1-L1 → L10)
- Non-empty structured content (definitions, key_concepts, pyqs, common_traps, summary)
- Each topic has ≥1 linked quiz in `quizzes` table
- Admin dashboard reflects all 10 entries correctly

---

## 🧩 Tasks (Execution Plan)

- [ ] Expand `lib/content-agent.ts` with GS2-P1-L2 → L10 tags
- [ ] Run Content Agent via `/admin/content` for remaining 9 topics
- [ ] Run Quiz Generator via `/admin/quizzes` (batch mode)
- [ ] Verify topic count ≥ 10 via admin dashboard
- [ ] Verify quiz linkage per topic in database
- [ ] Update this artifact with completion checklist + proof (counts/logs)

---

## ✅ Definition of Done (DoD)

Story is **COMPLETE** only if ALL of the following are true:

- [ ] 10/10 topics visible in admin panel (`/admin`)
- [ ] 10/10 topics have linked quizzes in `quizzes` table
- [ ] No missing syllabus tags (GS2-P1-L1 through L10)
- [ ] No empty content JSONB fields
- [ ] This artifact updated with proof (row counts, logs, or admin screenshot)
- [ ] `npx next build` passes cleanly after all changes

---

## 🚨 Execution Rule

**NO CODE EXECUTION UNTIL EXPLICIT APPROVAL ON THIS STORY.**

---

## 💡 Critical Insight

Story 1 is a **foundation story**. If this is sloppy:

- Mnemonics (Story 2) breaks — no content to generate mnemonics from
- Quiz consistency (Story 3) breaks — missing quizzes or malformed content
- Self-improvement loop (Story 5) becomes garbage-in-garbage-out

---

## 🧭 Final Decision

**👉 Approve this story artifact?**

Reply with:
- `APPROVE` → I proceed with task list, one checkbox at a time
- `EDIT` → tell me what to change in acceptance criteria, scope, or tasks
- `REJECT` → skip to next story
