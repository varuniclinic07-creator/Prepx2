---
type: story
phase: 4-implementation
sprint: 11
---

# Phase 3 — Complete Missing Features (P2 — 12 Fixes)

- [x] 3.1 Build `shop/page.tsx` with real purchasable items + Razorpay checkout
- [x] 3.2 Battle Royale real-time via `lib/realtime.ts` (not setInterval polling)
- [x] 3.3 Dhwani audio playback (TTS generation → audio_url → HTML5 audio)
- [x] 3.4 Astra video rendering pipeline (frames → MP4 → video player)
- [x] 3.5 Notification bell component + real-time subscription
- [x] 3.6 Squad leaderboard + activity feed on `/squads`
- [x] 3.7 Interview question bank (dynamic from DB, not hardcoded)
- [x] 3.8 Voice wake-word detection ("PrepX" triggers listening)
- [x] 3.9 Stripe webhook subscription sync (SKIP per India)
- [x] 3.10 ISA milestone tracker UI (timeline + payment status)
- [x] 3.11 Territory wars auto-transition (cron scheduling, real-time updates)
- [x] 3.12 Admin DELETE APIs (topics, quizzes, nudges, tutors, tenants, ISA)

## Acceptance Criteria
- All checkboxes ✅
- `npx tsc --noEmit` = EXIT 0 after every fix batch
- Shop page lists items, checkout creates Razorpay order
- Battle Royale uses Supabase realtime subscription, no polling
- Interview questions loaded from `interview_questions` table
- Admin DELETE APIs return 204 on success
- TypeScript build clean

## Definition of Done
All 12 P2 fixes applied, type-checked, grep-verified.
