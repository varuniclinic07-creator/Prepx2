---
story: S11F3
sprint: 11
name: White-Label Platform
priority: P2
parent: sprint11-plan.md
---

# Story S11F3: White-Label Platform

## Scope
Coaching institutes can license PrepX with custom branding, domain, and AI coach. Revenue share model.

## In Scope
- [x] `white_label_tenants` table
- [x] `/app/admin/white-label/page.tsx` — create tenant, configure branding
- [x] Middleware-based subdomain routing
- [x] Branded logo, colors, and AI coach name per tenant
- [x] Tenant analytics dashboard

## Out of Scope
- Custom domain SSL management (Vercel config stub)
- Multi-tenant database isolation (single DB with tenant_id for MVP)

## Tasks
- [x] **S11F3.1** Schema:
  - `white_label_tenants`: id, slug TEXT UNIQUE, name TEXT, primary_color TEXT, logo_url TEXT, ai_coach_name TEXT DEFAULT 'PrepX Coach', status ENUM('active','suspended'), setup_fee INT DEFAULT 200000, monthly_fee INT DEFAULT 50000, created_at
- [x] **S11F3.2** Middleware + routing:
  - `lib/tenant.ts`: extract tenant from subdomain (e.g., `drishti.prepx.ai` → slug `drishti`)
  - `middleware.ts`: if subdomain detected, inject tenant config into request headers
  - Fallback: no subdomain → default PrepX tenant
- [x] **S11F3.3** Branding system:
  - Layout reads tenant config from headers → applies `primary_color` to Tailwind theme CSS variables
  - Logo swaps based on `logo_url`
  - AI coach name injected into Hermes greetings and prompts
- [x] **S11F3.4** Admin tenant management:
  - `/admin/white-label/page.tsx`: create tenant (slug, name, color, logo, fees), suspend/activate, view tenant user count and revenue
- [x] **S11F3.5** `/admin/white-label/[slug]/page.tsx`: tenant detail with analytics (users, quizzes taken, revenue), edit config
- [x] **S11F3.6** Add `/admin/white-label` to admin sidebar

## Acceptance Criteria
- [x] Admin can create and configure a white-label tenant
- [x] Subdomain routing works (MVP: manual host override for testing)
- [x] Branded colors + logo apply to tenant subdomain
- [x] AI coach name is tenant-specific
- [x] tsc clean
