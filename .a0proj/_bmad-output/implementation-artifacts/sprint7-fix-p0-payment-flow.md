---
fix: P0.2
sprint: 7-corrective
priority: P0
parent: sprint7-corrective-course-p0-fixes.md
---

# Fix P0.2: Payment Flow — Razorpay Checkout + Webhook

## Current State
`/pricing` is static HTML. All CTAs redirect to `/`. Webhook route has `TODO: update DB` comment. No actual checkout.

## Scope
- [x] In Scope: Razorpay checkout modal on pricing page, webhook DB update, subscription status update
- [ ] Out of Scope: Advanced billing management (invoices, cancellations, upgrades)

## Tasks
- [x] **P0.2.1** Install Razorpay client: `npm install razorpay`
- [x] **P0.2.2** Verify `/api/payments/razorpay/route.ts` exists and creates orders
- [x] **P0.2.3** Update `app/pricing/page.tsx` — replace static CTAs with Razorpay checkout integration:
  - On tier click → POST to `/api/payments/razorpay` → receive order_id
  - Open Razorpay checkout modal with key, amount, currency
  - On payment success → call `/api/webhooks/razorpay` verification
- [x] **P0.2.4** Complete `/api/webhooks/razorpay/route.ts`:
  - Implement proper HMAC signature verification using `RAZORPAY_WEBHOOK_SECRET`
  - On valid payment → upsert into `subscriptions` table
  - Update `feature_flags` for the user
  - Use `order_id` as idempotency key
- [x] **P0.2.5** Handle payment failure gracefully (show error toast, allow retry)
- [x] **P0.2.6** On success, redirect to `/dashboard` with success toast

## Acceptance Criteria
- [x] User can click pricing tier → Razorpay checkout opens
- [x] Successful payment updates `subscriptions` table
- [x] Webhook signature verified (not placeholder)
- [x] Feature flags updated for premium access
- [x] Payment failure shows error (not silent fail)
- [x] `npx tsc --noEmit` passes

## Definition of Done
- [x] End-to-end payment flow works in test mode
- [x] Webhook properly verifies signatures
- [x] DB state reflects subscription after payment
- [x] No `TODO` comments in webhook code
