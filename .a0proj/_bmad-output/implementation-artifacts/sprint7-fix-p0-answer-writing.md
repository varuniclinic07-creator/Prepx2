---
fix: P0.1
sprint: 7-corrective
priority: P0
parent: sprint7-corrective-course-p0-fixes.md
---

# Fix P0.1: Answer Writing Flow — Wire AnswerComposer

## Current State
`components/AnswerComposer.tsx` renders a textarea and "Submit" button, but button only sets `submitted=true`. No API call. No persistence. User sees dead-end message.

## Scope
- [x] In Scope: API route, evaluator wiring, persistence, history view
- [ ] Out of Scope: AI-based mains evaluation (keep heuristic for now)

- [x] **P0.1.1** Create `app/api/mains/evaluate/route.ts` — POST endpoint accepting `{ question_id, answer_text, user_id }`. Calls `evaluateMainsAnswer()` from `lib/mains-evaluator.ts`. Returns scores JSON.
- [x] **P0.1.2** Wire `AnswerComposer.tsx` — on submit, POST to `/api/mains/evaluate`. Show loading state. Display scores after response.
- [x] **P0.1.3** Add word count tracking (real-time counter below textarea)
- [x] **P0.1.4** Add timer (count up from 0, display MM:SS)
- [x] **P0.1.5** Create `mains_attempts` table in `supabase/schema.sql` if not exists: `id, user_id, question_id, answer_text, scores JSONB, created_at`
- [x] **P0.1.6** Persist evaluation results to `mains_attempts` table
- [x] **P0.1.7** Show evaluation history below composer (last 5 attempts)
- [x] User can type answer → submit → see scores breakdown
- [x] Word count shown in real time
- [x] Timer tracks writing duration
- [x] Results persisted and viewable in history
- [x] `npx tsc --noEmit` passes

- [x] End-to-end flow works: type → submit → score → history
- [x] No dead-end UI states
- [x] Data persists to Supabase
