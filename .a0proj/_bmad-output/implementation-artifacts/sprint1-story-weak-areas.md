---
sprint: 1
story: "1.5: Weak Area Auto-Injection"
status: completed
date: 2026-04-22
files: components/QuizComponent.tsx, lib/supabase.ts, types/index.ts
acceptance:
  - Wrong answers create user_weak_areas rows
  - Quiz attempts persisted with score + response JSON
  - Schema includes score/max_score/response columns
