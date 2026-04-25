---
sprint: 5
status: formal-plan-draft → awaiting approval
date: 2026-04-24
persona: BMAD Bob (Scrum Master)
velocity_basis: 1 solo full-stack dev, ~5 story points / 2-week sprint
---

# 🏃 Sprint 5 Plan: Monetization + Predictive Intelligence + Government Sources

## Sprint Goal
Activate the subscription revenue model with tiered feature gating, build the predictive question engine that surfaces high-probability PYQs before exams, and wire government sources (PIB, ARC, Lok Sabha) into the content generation pipeline.

**Sprint Duration:** 2 weeks
**Capacity:** 1 solo full-stack dev
**Risk:** MEDIUM-HIGH — payment integration requires test credentials; government source parsing can be fragile.

---

## 📋 Story Order (Dependency-First)

```
S0  Payment Gateway + Subscription Gating     ← CRITICAL PATH START
  ├─ S0.1 Stripe webhook handler + subscription table
  ├─ S0.2 Feature flag middleware (Free vs Premium vs Premium+)
  ├─ S0.3 Pricing page + checkout flow
  └─ S0.4 PDF watermark removal for paid tiers

S1  Predictive Question Modeling               ← depends S0.2 (needs Premium tier)
  ├─ S1.1 pyqs_embedding table + vector search
  ├─ S1.2 Trend analysis service (topic frequency over years)
  ├─ S1.3 Predict score per topic (0-100 probability)
  └─ S1.4 Admin "Predict" panel + aspirant "likely questions" view

S2  Government Source Ingestion               ← depends S0.2 (Premium content)
  ├─ S2.1 PIB daily scraper stub (RSS → content)
  ├─ S2.2 ARC report indexer (PDF → text → embeddings)
  ├─ S2.3 Lok Sabha question-hour parser
  └─ S2.4 Source citation in generated content
```

---

## Story S0: Payment Gateway + Subscription Gating

**Epic:** 24 — Monetization Layer
**Priority:** P0 — Revenue-Blocking
**Estimated Effort:** 5 dev-days (10 story points)
**Dependencies:** None

### Scope
- [x] In Scope: Stripe checkout, webhook, subscription_status enforcement, feature gating middleware, PDF watermark removal for paid, pricing page
- [ ] Out of Scope: Razorpay (India-specific) deferred to Sprint 6, team/organization billing, Apple Pay

### Tasks

- [ ] **S0.1** Database schema + Stripe webhook
  - `subscriptions` table: user_id, stripe_customer_id, stripe_subscription_id, status, plan, current_period_end
  - `feature_flags` table: flag_name, enabled_for (free|premium|premium_plus), rollout_percentage
  - API route: `/api/webhooks/stripe` for checkout.session.completed + invoice.paid
- [ ] **S0.2** Feature gating middleware
  - `lib/subscription.ts` — `hasFeature(userId, featureName)` checks subscription_status + feature_flags
  - Block PDF export, advanced analytics, government sources for free tier
  - Watermark removal for premium+ on PDF export
- [ ] **S0.3** Pricing + checkout
  - `/pricing` page: 3 tiers (Free ₹0, Premium ₹499/mo, Premium+ ₹999/mo)
  - Stripe Checkout session creation
  - Success/cancel redirect pages
- [ ] **S0.4** PDF watermark conditional
  - `lib/watermark.ts` — apply watermark only if subscription_status !== 'premium_plus'
  - Watermark: "PrepX Free — upgrade for clean PDFs"

### Acceptance Criteria
- [ ] Stripe webhook updates subscription_status on successful payment
- [ ] Free user cannot access premium features (middleware returns 403 or redirect)
- [ ] Premium user sees "Upgrade to Premium+" CTA for premium+ features
- [ ] PDF export respects watermark rules per tier
- [ ] Pricing page loads without errors
- [ ] Build passes cleanly

### Definition of Done
- [ ] Stripe test mode verified with test card
- [ ] All subscription states tested (active, canceled, past_due)
- [ ] RLS policies protect subscription data

---

## Story S1: Predictive Question Modeling

**Epic:** 25 — AI-Powered Exam Intelligence
**Priority:** P1
**Estimated Effort:** 4 dev-days (8 story points)
**Dependencies:** S0.2 (needs Premium tier access to unlock predictions)

### Tasks
- [ ] **S1.1** `pyqs_embeddings` table
  - question_text, year, subject, topic_tag, embedding VECTOR(1536)
  - Index for vector similarity search
- [ ] **S1.2** Trend analysis
  - Count PYQs per topic per year (last 10 years)
  - Detect rising/falling trends
  - Surface topics with zero recent coverage but historically high frequency
- [ ] **S1.3** Prediction score
  - Algorithm: weighted sum of recency (0.5), frequency (0.3), syllabus alignment (0.2)
  - Output: 0-100 score per topic per year
- [ ] **S1.4** UI integration
  - Admin `/admin/predict` page: run predictions, view top 20 predicted topics
  - Aspirant `/predictions` page: "Most likely this year" cards with confidence badges

### Acceptance Criteria
- [ ] Predictions table populated for all 19 subjects
- [ ] Top 20 predictions have confidence > 60%
- [ ] UI shows year-over-year trend sparkline
- [ ] Build passes cleanly

---

## Story S2: Government Source Ingestion

**Epic:** 26 — Government Source Pipeline
**Priority:** P1
**Estimated Effort:** 3 dev-days (6 story points)
**Dependencies:** S0.2 (Premium content tier)

### Tasks
- [ ] **S2.1** PIB scraper stub
  - `/api/sources/pib` endpoint: fetch latest 5 press releases, parse title + summary
  - Store in `government_sources` table: source_type, title, url, published_at, summary
- [ ] **S2.2** ARC report indexer
  - Upload 2-3 sample ARC PDFs → text extraction → chunk → embed → store in topics.embedding
  - Manual upload via admin `/admin/sources` for now (no auto-crawl)
- [ ] **S2.3** Lok Sabha parser stub
  - `/api/sources/loksabha` endpoint: parse starred questions XML → extract question_text + answer
  - Store in government_sources table
- [ ] **S2.4** Source citation in content
  - Auto-append "Sources: PIB [date], ARC Report [title]" to generated topic summaries
  - Link to original document in content JSONB

### Acceptance Criteria
- [ ] Government sources table has ≥10 rows across PIB, ARC, Lok Sabha
- [ ] Content generation mentions specific ARC/PIB sources in ≥3 topics
- [ ] Admin source panel lists all ingested sources
- [ ] Build passes cleanly

---

## 🎯 Sprint 5 Success Criteria

| Metric | Target |
|--------|--------|
| Stripe integration | Test mode checkout completes end-to-end |
| Feature gating | 100% of premium features blocked for free |
| Prediction accuracy | ≥60% confidence on top 20 predictions |
| Government sources | ≥10 sources across PIB/ARC/Lok Sabha |
| Revenue readiness | Full payment flow ready for production |
| Build | 0 TS errors, all routes compile |
