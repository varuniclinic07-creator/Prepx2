---
story: F3
sprint: 8
name: Streak Battles
priority: P0
parent: sprint8-plan.md
---

# Story F3: Streak Battles

## Scope
Friend-to-friend streak duels. Users challenge each other to maintain a study streak. Winner gets reward (coins + badge).

## In Scope
- [x] `streak_battles` table + `stattle_participants` table
- [x] Challenge creation flow
- [x] Real-time progress dashboard
- [x] Winner/loser determination on battle end
- [x] Coin rewards via existing `lib/coins.ts`

## Out of Scope
- Telegram integration for battles
- Charity penalty payments

## Tasks
- [x] **F3.1** Schema: Add tables to `supabase/schema.sql`:
  - `streak_battles`: id, initiator_id, duration_days INT DEFAULT 7, status ENUM('pending','active','completed'), wager_coins INT, winner_id, created_at, ended_at
  - `battle_participants`: id, battle_id, user_id, current_streak, best_streak, status, joined_at
- [x] **F3.2** Create `/app/battles/page.tsx`:
  - List active battles
  - "New Challenge" button: enter opponent email/handle, set wager (coins), duration
  - Real-time updates via `realtime.ts`
- [x] **F3.3** Create `/api/battles/create/route.ts` and `/api/battles/accept/route.ts`:
  - Create: insert battle + participant record
  - Accept: update status to active, deduct wager coins from both
- [x] **F3.4** Streak tracking integration:
  - On daily plan completion → update `battle_participants.current_streak`
  - If user missed day → reset streak, check if forfeit
- [x] **F3.5** Battle completion logic:
  - After duration ends: compare streaks, mark winner, award coins + badge
  - Update winner's `user_balances`
  - Show result card shareable to social

## Acceptance Criteria
- [x] User can challenge and accept streak battles
- [x] Real-time progress updates during battle
- [x] Winner determined automatically and rewarded
- [x] tsc clean
