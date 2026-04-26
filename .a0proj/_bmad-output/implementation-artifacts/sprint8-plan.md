---
sprint: 8
type: futuresprint-p0-batch1
date: 2026-04-26
---

# Sprint 8: Futuresprint P0 Batch 1 — Core Innovation Engine

## Scope
Build 4 P0 features that require NO external dependencies (no ElevenLabs, Telegram API, TTS).
All leverage existing PrepX infrastructure: ai-router.ts, Supabase, Razorpay, realtime.

## Features in this Sprint

| # | Feature | File | Rationale |
|---|---------|------|-----------|
| F1 | **Rank Oracle** | `app/rank/page.tsx`, `lib/rank-oracle.ts` | Uses existing quiz data + AI predictions. Pure analytics + AI inference. |
| F2 | **Collector Coins** | `app/shop/page.tsx`, `lib/coins.ts` | Virtual economy layer on top of existing quiz/daily-plan events. |
| F3 | **Streak Battles** | `app/battles/page.tsx`, `lib/streak-battles.ts` | Builds on existing streak_count + real-time subscriptions. |
| F4 | **Mnemonic Generator** | `app/mnemonics/page.tsx`, `lib/mnemonic-engine.ts` | Pure AI prompt engineering. No new infrastructure needed. |

## Technical Foundation (Already Exists)
- `ai-router.ts` → All AI features
- `supabase` → Real-time + data persistence
- `razorpay` → Coin redemption payments
- `realtime.ts` → Battle live updates
- `middleware.ts` → RBAC enforcement

## Order of Implementation
1. F2 Collector Coins (infrastructure first — everything else depends on it)
2. F1 Rank Oracle (pure analytics, safe to build after coins)
3. F4 Mnemonic Generator (AI prompt, standalone)
4. F3 Streak Battles (builds on coins + realtime)

## Definition of Done
- All 4 story files have checkboxes ticked
- `npx tsc --noEmit` passes
- Each feature has at least one API route + one page
- Data persists to Supabase tables
