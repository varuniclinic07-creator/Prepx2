---
story: F2
sprint: 8
name: Collector Coins
priority: P0
parent: sprint8-plan.md
---

# Story F2: Collector Coins (In-App Economy)

## Scope
Virtual currency earned by study actions, spendable on premium perks via in-app shop.

## In Scope
- [x] `user_balances` table + `coin_transactions` table
- [x] Coin earning hooks on quiz correct, daily plan complete, essay submit, referral, rank-up
- [x] `/app/shop/page.tsx` with redemption items
- [x] Coin balance display in header/layout
- [x] RLS-protected tables

## Out of Scope
- Physical merchandise fulfillment (track only)
- UPI payouts beyond existing Razorpay infra

## Tasks
- [x] **F2.1** Schema: Add tables to `supabase/schema.sql`:
  - `user_balances`: id, user_id, coins INT DEFAULT 0, lifetime_earned INT DEFAULT 0
  - `coin_transactions`: id, user_id, amount INT, reason TEXT, idempotency_key TEXT, created_at
  - RLS policies for both
- [x] **F2.2** Create `lib/coins.ts`:
  - `awardCoins(userId, amount, reason, idempotencyKey)` — checks for duplicate, inserts transaction, updates balance
  - `getBalance(userId)` — returns current coins
  - `spendCoins(userId, amount, reason)` — deducts with balance check
- [x] **F2.3** Wire earning hooks:
  - Quiz correct: +5 in `QuizComponent.tsx` after submit
  - Daily plan complete: +50 in `DailyPlan.tsx` on mark complete
  - Essay submit: +100 in `AnswerComposer.tsx` after evaluation
  - Referral (placeholder in signup): +200
- [x] **F2.4** Create `/app/shop/page.tsx`:
  - Display current balance
  - Items: 500 coins = 1 day Premium, 2000 = AI video lecture, 5000 = mock interview session
  - Purchase flow: spendCoins() → update subscription/feature flag or log
  - Show purchase history
- [ ] **F2.5** Show coin balance in header `app/layout.tsx` (next to notification bell)
- [x] **F2.5** Show coin balance in header `app/layout.tsx` (next to notification bell)
## Acceptance Criteria
- [x] User gains coins upon quiz correct answer
- [x] User can see balance and shop items
- [x] User can redeem coins for items
- [x] Duplicate transactions prevented by idempotency key
- [x] tsc clean
