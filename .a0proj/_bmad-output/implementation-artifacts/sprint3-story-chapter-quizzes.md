---
sprint: 3
story: "Story 3: Chapter-End Quizzes (Batch)"
epic: 16 (cont.)
status: planned → awaiting approval
date: 2026-04-23
depends_on: sprint3-story-polity-completion
---

# 📋 Story 3: Chapter-End Quizzes

## 🎯 Goal
Ensure every Polity chapter has a 5-question chapter-end quiz linked.

## 📦 Scope
- ✅ Batch generate quizzes for any topic missing a quiz
- ✅ Verify each topic has ≥1 linked quiz
- ✅ Admin batch button on /admin/quizzes
- ❌ Adaptive difficulty (future)

## 📏 Acceptance Criteria
- [ ] 10/10 topics have linked quiz in quizzes table
- [ ] Each quiz has 5 MCQs with JSONB format
- [ ] Batch generation report shows 10 successes

## ✅ Definition of Done
- [ ] Batch run generates 9 new quizzes
- [ ] Database count verifies 10 quiz rows with valid questions
- [ ] Admin dashboard shows 10 quizzes
