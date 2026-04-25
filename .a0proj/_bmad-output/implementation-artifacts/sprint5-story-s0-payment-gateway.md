---
story_id: S0
sprint: 5
epic: 24 — Monetization Layer
persona: BMAD Bob (Scrum Master)
priority: P0 — Revenue-Blocking
date: 2026-04-24
status: artifact-ready → implementing
---

# Story S0: Payment Gateway + Subscription Gating

## Goal
Activate Stripe subscription payments with tiered feature gating so free users are blocked from premium features.

## Acceptance Criteria
- [ ] `subscriptions` and `feature_flags` tables exist in schema
- [ ] Stripe webhook endpoint updates subscription_status
- [ ] `lib/subscription.ts` hasFeature() blocks free users from premium features
- [ ] `/pricing` page shows 3 tiers with Stripe Checkout
- [ ] PDF watermark respects subscription tier
- [ ] Admin `/admin/pricing` shows current subscriptions

## Tasks
- [ ] **S0.1** Database schema migration (`supabase/schema.sql`)
- [ ] **S0.2** Feature gating middleware (`lib/subscription.ts`)
- [ ] **S0.3** Pricing + checkout (`app/pricing/page.tsx` + `app/api/webhooks/stripe/route.ts`)
- [ ] **S0.4** PDF watermark conditional (`lib/watermark.ts`)
- [ ] **S0.5** Admin pricing panel (`app/admin/pricing/page.tsx`)

## Definition of Done
- All DB migrations applied
- All code compiles (tsc clean)
- Payment flow stub verified locally
- Commit hash recorded in this artifact
