---
fix: P1.6
sprint: 7-corrective
priority: P1
parent: sprint7-corrective-course-p0-fixes.md
---

# Fix P1.6: AI-Powered Predictions (Replace Heuristic)

## Current State
- `app/predictions/page.tsx` computes confidence via deterministic heuristic (ID length modulo).
- No AI involved. No actionability (cannot add to plan).

## Scope
- [x] In Scope: AI-based prediction generation, PYQ frequency analysis, "Add to Plan" action
- [ ] Out of Scope: Training custom ML model (use prompt engineering on existing AI router)

## Tasks
- [ ] **P1.6.1** Create `lib/prediction-engine.ts`:
  - Accept subject/topic list + previous year question (PYQ) patterns
  - Call `aiChat()` with prompt: "Analyze these UPSC PYQ topics and predict 5 most likely topics for next Prelims. Return JSON with topic_id, confidence_score (0-100), reason."
  - Fallback to heuristic if AI fails
- [ ] **P1.6.2** Update `app/predictions/page.tsx`:
  - Fetch predictions from `/api/predictions`
  - Display with confidence bars (visual)
  - Add "Add to Daily Plan" button per prediction (POST to `/api/daily-plan/add-topic`)
- [ ] **P1.6.3** Create `/api/predictions/route.ts` — GET endpoint:
  - Fetch recent attempts + topic metadata
  - Call `prediction-engine.ts`
  - Return ranked predictions
- [ ] **P1.6.4** Create `/api/daily-plan/add-topic/route.ts` — POST endpoint:
  - Add a specific topic to today's `daily_plans.tasks`

## Acceptance Criteria
- [x] Predictions are AI-generated (not deterministic heuristic)
- [ ] Confidence score visualized
- [ ] User can add prediction to daily plan
- [ ] `npx tsc --noEmit` passes

## Definition of Done
- [x] Predictions page shows AI-powered, actionable predictions
- [ ] Fallback to heuristic graceful on AI failure
