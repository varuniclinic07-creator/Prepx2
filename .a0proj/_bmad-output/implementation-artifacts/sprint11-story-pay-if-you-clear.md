---
story: S11F1
sprint: 11
name: Pay-If-You-Clear ISA
priority: P2
parent: sprint11-plan.md
---

# Story S11F1: Pay-If-You-Clear ISA (Vijay Guarantee)

## Scope
Income share agreement: aspirant pays ₹0 upfront. Pays ₹2,999 on Prelims clearance, ₹4,999 on Mains, ₹9,999 on final selection. Only offered to users with high readiness index.

## In Scope
- [x] `isa_contracts` table + `isa_payments` table
- [x] `/app/isa/page.tsx` — eligibility check + enrollment
- [x] `/api/isa/enroll/route.ts` + `/api/isa/payment/route.ts`
- [x] Payment flow via existing Razorpay, deferred charges
- [x] Admin ISA dashboard

## Out of Scope
- Eduvanz/Propelld underwriting integration (P2-stub: webhook placeholder)
- Insurance-backed risk pool (legal compliance beyond MVP)

## Tasks
- [x] **S11F1.1** Schema:
  - `isa_contracts`: id, user_id, status ENUM('pending','active','completed','voided'), enrollment_date, prelims_cleared BOOLEAN DEFAULT FALSE, mains_cleared BOOLEAN DEFAULT FALSE, final_selected BOOLEAN DEFAULT FALSE, total_due INT DEFAULT 0
  - `isa_payments`: id, contract_id, milestone ENUM('prelims','mains','final'), amount INT, status ENUM('pending','paid','failed'), razorpay_order_id, paid_at
- [x] **S11F1.2** Eligibility engine:
  - `lib/isa-eligibility.ts`: check if user has `user_predictions.confidence >= 60` AND `user_office_ranks.current_rank >= 'Collector'`
  - If eligible → show "Vijay Guarantee" banner on `/pricing`
- [x] **S11F1.3** Enrollment flow:
  - `app/isa/page.tsx`: eligibility check → terms display → e-signed agreement (simple checkbox confirmation for MVP) → enroll
  - `app/api/isa/enroll/route.ts`: create contract, mark active, send notification
- [x] **S11F1.4** Payment triggers:
  - Admin marks milestone as achieved (Prelims/Mains/Final) → contract status updated → Razorpay order created → notification sent
  - `app/api/isa/payment/route.ts`: accept milestone, create Razorpay order, return checkout data
- [x] **S11F1.5** Admin `/admin/isa/page.tsx`: list all contracts, filter by status, trigger milestone payments, view analytics
- [x] **S11F1.6** Add `/isa` nav link in pricing page

## Acceptance Criteria
 ✅ [x] Eligible user sees Vijay Guarantee offer
 ✅ [x] User can enroll with agreement confirmation
 ✅ [x] Admin can trigger milestone payment
 ✅ [x] Payment collected via Razorpay
 ✅ [x] Contract status tracked correctly
 ✅ [x] tsc clean
