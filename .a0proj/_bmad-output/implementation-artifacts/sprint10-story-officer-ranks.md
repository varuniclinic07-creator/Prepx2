---
story: S10F3
sprint: 10
name: Officer Ranks
priority: P1
parent: sprint10-plan.md
---

# Story S10F3: Officer Rank Progression System

## Scope
Gamified rank progression: ASO → Deputy Collector → Collector → Secretary → Cabinet Secretary.

## In Scope
- [x] `user_office_ranks` table
- [x] Rank-up logic based on streak + quiz + answer-writing milestones
- [x] `/app/ranks/page.tsx` showing current rank + progress
- [x] Coin rewards on rank-up
- [x] Rank displayed on profile

## Out of Scope
- Physical merchandise (P2)
- Real government rank correlation (pure gamification)

## Tasks
- [x] **S10F3.1** Schema: `user_office_ranks`: user_id, current_rank ENUM('ASO','Deputy Collector','Collector','Secretary','Cabinet Secretary'), promoted_at, next_rank_requirement JSONB
- [x] **S10F3.2** Rank-up requirements:
  - ASO → Deputy Collector: 7-day streak + 50 correct answers
  - Deputy → Collector: 30-day streak + 5 essays >70%
  - Collector → Secretary: 100-day streak + 1 mock test
  - Secretary → Cabinet Secretary: 200-day streak + rank in top 500 + 3 referrals
  - Check on daily plan completion → auto-promote if criteria met
- [x] **S10F3.3** `lib/rank-progression.ts`: checkUserRank(userId) → evaluate criteria → if met, promote, award coins, send notification
- [x] **S10F3.4** `app/ranks/page.tsx`: current rank badge, progress bar to next rank, history of promotions, shareable "promoted to X" cards
- [x] **S10F3.5** Show rank on `/profile` page
- [x] **S10F3.6** Add `/ranks` nav link

## Acceptance Criteria
- [x] User auto-promotes when criteria met
- [x] Progress bar shows concrete steps to next rank
- [x] Rank-up triggers coin reward + notification
- [x] Profile and layout show current rank badge
- [x] tsc clean
