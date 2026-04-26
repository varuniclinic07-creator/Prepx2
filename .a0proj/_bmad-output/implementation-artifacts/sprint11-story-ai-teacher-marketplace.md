---
story: S11F2
sprint: 11
name: AI Teacher Marketplace
priority: P2
parent: sprint11-plan.md
---

# Story S11F2: AI Teacher Marketplace

## Scope
Top rankers create AI tutor personas. Aspirants "hire" them. Toppers earn 70% royalty via Razorpay X payouts.

## In Scope
- [x] `ai_tutors` table + `tutor_subscriptions` table
- [x] `/app/tutors/page.tsx` — browse + hire tutors
- [x] `/api/tutors/create/route.ts` + `/api/tutors/hire/route.ts`
- [x] Tutor-persona prompt cloning via `ai-router.ts`
- [x] Weekly payouts tracking

## Out of Scope
- Automatic Razorpay X payouts (track only, manual payout stub)
- Video avatar synthesis (text avatar only)

## Tasks
- [x] **S11F2.1** Schema:
  - `ai_tutors`: id, creator_user_id, name, description, persona_prompt TEXT, subject SPECIALTY, price INT DEFAULT 499, rating FLOAT DEFAULT 5.0, subscriber_count INT DEFAULT 0, created_at
  - `tutor_subscriptions`: id, user_id, tutor_id, status ENUM('active','cancelled'), started_at, expires_at
- [x] **S11F2.2** Tutor creation:
  - `/app/tutors/create/page.tsx`: form for rankers to submit their strategy, notes, and upload files
  - AI clones their teaching style: "Analyze these notes and create an AI persona prompt that teaches like this person." → save persona_prompt
- [x] **S11F2.3** Browse + hire:
  - `/app/tutors/page.tsx`: grid of tutor cards with name, price, rating, subscriber count, preview dialogue
  - Hire button → Razorpay payment → create subscription record
  - Integration with existing `razorpay` order creation
- [x] **S11F2.4** Chat with tutor:
  - New chat interface or extension of existing voice/page
  - System prompt replaced with tutor's `persona_prompt`
  - Session tracked per tutor subscription
- [x] **S11F2.5** Admin `/admin/tutors/page.tsx`: list tutors, view earnings, approve/disapprove tutor applications
- [x] **S11F2.6** Add `/tutors` nav link

## Acceptance Criteria
- [x] Ranker can create AI tutor persona
- [x] Aspirant can browse and hire a tutor
- [x] Tutor chat uses personalized persona prompt
- [x] Subscription tracked per user-tutor pair
- [x] tsc clean
