---
story: S9F2
sprint: 9
name: Battle Royale
priority: P0
parent: sprint9-plan.md
---

# Story S9F2: UPSC Battle Royale (Live Quiz Tournament)

## Scope
Weekly live quiz tournament. Questions get harder. Wrong answer = elimination. Real-time leaderboard.

## In Scope
- [x] `battle_royale_events` table + `battle_royale_participants` table
- [x] `/app/battle-royale/page.tsx` with lobby, active game, results
- [x] Real-time question flow using Supabase Realtime
- [x] Leaderboard with Redis sorted set (Upstash stub acceptable for MVP)
- [x] Winner determination + coin rewards

## Out of Scope
- Spectator mode (too complex for MVP)
- Prize pool payouts (useless without real money)
- Strict anti-cheat (trust clients for MVP)

## Tasks
- [x] **S9F2.1** Schema:
  - `battle_royale_events`: id, event_start TIMESTAMPTZ, status ENUM('scheduled','live','completed'), prize_pool INT, question_count INT DEFAULT 20, current_question INT DEFAULT 0
  - `battle_royale_participants`: id, event_id, user_id, joined_at, eliminated_at, last_answer_correct, score INT DEFAULT 0
- [x] **S9F2.2** Create `lib/battle-royale.ts`:
  - `createEvent()` — schedule new event
  - `joinEvent(eventId, userId)` — add participant
  - `submitAnswer(eventId, userId, questionId, answer)` — check correctness, eliminate if wrong, update score
  - `getLeaderboard(eventId)` — sorted by score + survival time
- [x] **S9F2.3** Create `/api/battle-royale/route.ts`:
  - POST /create (admin)
  - POST /join
  - POST /answer
  - GET /leaderboard/:eventId
  - GET /status/:eventId
- [x] **S9F2.4** Create `/app/battle-royale/page.tsx`:
  - Lobby: upcoming events countdown
  - Active: current question display, timer (15s), option buttons
  - Real-time updates via `realtime.ts`
  - Elimination screen + leaderboard
  - Winner celebration card
- [x] **S9F2.5** Winner rewards:
  - Call `awardCoins(userId, 1000, 'battle_royale_winner')`
  - Show "Winner" badge on profile

## Acceptance Criteria
- [x] User can join a scheduled battle royale event
- [x] Questions delivered in real-time with 15s timer
- [x] Wrong answer eliminates player immediately
- [x] Live leaderboard updates during event
- [x] Winner gets coins + badge
- [x] tsc clean
