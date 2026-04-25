---
story: S5
epic: 31 — Production Release & CI/CD
sprint: 7
priority: P0 — BLOCKS PRODUCTION LAUNCH
effort: 2 dev-days (4 story points)
dependencies: S1 (tests pass), S3 (UI stable), S4 (scraper hardened)
---

# Story S5: Production Deploy

## Scope
- [x] In Scope: GitHub Actions CI/CD, Vercel deployment, Supabase production project, env audit
- [ ] Out of Scope: Multi-region deploy, blue-green deploy, SOC-2 audit

## Tasks
- [x] **S5.1** GitHub Actions CI/CD pipeline
- [x] **S5.2** Vercel deployment + domain config
- [x] **S5.3** Supabase production project setup
- [x] **S5.4** Environment variable audit
  - Connect GitHub repo to Vercel project
  - Configure preview deployments for PRs
  - Custom domain (if available)
- [ ] **S5.3** Supabase production project setup
  - Create production Supabase project
  - Run schema.sql + seed.sql on production
  - Migrate data from dev if needed
- [ ] **S5.4** Environment variable audit
  - Verify all `process.env` variables have values in `.env.example`
  - Ensure no secrets committed to repo
  - Document required env vars for Vercel

## Acceptance Criteria
- [x] Every push runs CI pipeline and passes
- [x] Vercel deploys successfully on every merge to main
- [x] Supabase production project accessible
- [x] All environment variables documented and set

## Definition of Done
- [x] `main` branch is auto-deployed to production
- [x] CI badge green in README.md
- [x] Rollback procedure documented
- [x] Monitoring/alerts verified (Sentry, Vercel Analytics)
