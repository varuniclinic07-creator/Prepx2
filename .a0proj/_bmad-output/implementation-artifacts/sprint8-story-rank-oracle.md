---
story: F1
sprint: 8
name: Rank Oracle
priority: P0
parent: sprint8-plan.md
---

# Story F1: Predictive Rank Engine (Rank Oracle)

## Scope
AI model that predicts user AIR (All India Rank) based on quiz accuracy, answer-writing scores, time spent, and mock test performance. Updated every 48 hours.

## In Scope
- [x] Feature store aggregating quiz/daily-plan/answer-writing stats per user
- [x] Heuristic rank prediction (AI prompt-based, no external ML infra)
- [x] `/app/rank/page.tsx` showing projected AIR, deficit gaps, timeline
- [x] `/api/rank/predict/route.ts` inference endpoint
- [x] Data persistence to `user_predictions` table

## Out of Scope
- XGBoost/LightGBM model training pipeline
- 30 years PYQ dataset manual curation

## Tasks
- [x] **F1.1** Schema: Add `user_predictions` table to `supabase/schema.sql`:
  id, user_id, predicted_rank_min, predicted_rank_max, confidence_pct, deficit_gaps JSONB, days_to_cutoff, created_at
- [x] **F1.2** Create `lib/rank-oracle.ts`:
  - Fetch user stats: total_quizzes, avg_accuracy, total_answers, avg_score, streak, weak_areas count
  - Call `aiChat()` with structured prompt: "Given these stats, predict likely AIR range for UPSC Prelims. Return JSON."
  - Fallback heuristic if AI fails
- [x] **F1.3** Create `/api/rank/predict/route.ts`:
  - Accept POST { user_id }
  - Call rankOracle(user_id)
  - Upsert into `user_predictions`
  - Return prediction JSON
- [x] **F1.4** Create `app/rank/page.tsx`:
  - Server component fetching latest prediction
  - Display: predicted rank range, confidence %, progress bar
  - Deficit gaps list: "Environment accuracy -23% to toppers"
  - Timeline: "Cross cutoff in X days at current velocity"
  - Refresh button → calls `/api/rank/predict`
- [x] **F1.5** Auto-trigger prediction generation:
  - When user completes quiz OR daily plan → incrementally updated
  - Background recalculation every 48h

## Acceptance Criteria
- [x] User sees predicted rank range on `/rank`
- [x] Prediction updates within 48 hours or after significant activity
- [x] Gaps identified are actionable (specific subject + improvement %)
- [x] tsc clean
