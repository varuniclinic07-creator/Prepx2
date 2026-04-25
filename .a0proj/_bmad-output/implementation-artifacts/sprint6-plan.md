---
sprint: 6
status: formal-plan-draft → implementing
date: 2026-04-24
persona: BMAD Bob (Scrum Master)
velocity_basis: 1 solo full-stack dev, ~5 story points / 2-week sprint
---

# 🏃 Sprint 6 Plan: Razorpay + Nudge System + E2E Tests

## Sprint Goal
Integrate Razorpay for India-specific payments, build WhatsApp/email nudge system for cohort retention, and scaffold E2E tests with Playwright.

**Sprint Duration:** 2 weeks
**Capacity:** 1 solo full-stack dev

---

## 📋 Story Order

```
S0  Razorpay India Payments                    ← CRITICAL PATH
  ├─ S0.1 Razorpay order creation endpoint
  ├─ S0.2 Razorpay webhook verification
  ├─ S0.3 Pricing page Razorpay toggle
  └─ S0.4 Subscription sync to Supabase

S1  WhatsApp + Email Nudge System              ← depends S0
  ├─ S1.1 nudge_log table + scheduler
  ├─ S1.2 Day 7 reminder template
  ├─ S1.3 Day 13 urgency template
  └─ S1.4 Admin nudge panel with manual trigger

S2  E2E Test Suite                            ← non-blocking
  ├─ S2.1 Playwright config
  ├─ S2.2 Onboarding flow test
  └─ S2.3 Quiz submission test
```

---

## Story S0: Razorpay India Payments

**Priority:** P0
**Estimated Effort:** 3 dev-days

### Tasks
- [ ] `app/api/payments/razorpay/route.ts` — create order endpoint
- [ ] `app/api/webhooks/razorpay/route.ts` — webhook signature verify
- [ ] `lib/razorpay.ts` — order creation + subscription sync
- [ ] Update `/pricing` with Razorpay checkout button

### Acceptance Criteria
- Order creation returns Razorpay order_id
- Webhook updates subscription_status
- Pricing page has working checkout flow

## Story S1: Nudge System

**Priority:** P1
**Estimated Effort:** 2 dev-days

### Tasks
- [ ] `nudge_log` table: user_id, type, channel, status, sent_at
- [ ] `app/api/nudge/route.ts` — trigger endpoint
- [ ] Templates: Day 7 "Keep going", Day 13 "Reveal tomorrow"
- [ ] Admin nudge panel: `/admin/nudges`

## Story S2: E2E Tests

**Priority:** P2
**Estimated Effort:** 2 dev-days

### Tasks
- [ ] Playwright config + 2 passing tests
- [ ] Test: onboarding → login → dashboard
- [ ] Test: topic → quiz → submit
