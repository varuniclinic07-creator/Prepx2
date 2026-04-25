---
fix: P1.3
sprint: 7-corrective
priority: P1
parent: sprint7-corrective-course-p0-fixes.md
---

# Fix P1.3: Admin RBAC via `role` Column

## Current State
- `middleware.ts` and `app/admin/layout.tsx` use `subscription_status === 'premium_plus'` OR email domain (`@prepx.ai`) as admin proxy.
- This is a security anti-pattern: subscription tier is NOT a role.

## Scope
- [x] In Scope: Add `role` column to `users` table, migrate admin checks, implement proper RBAC
- [ ] Out of Scope: Full OAuth SSO, multi-org RBAC

## Tasks
- [ ] **P1.3.1** Add `role` column to `users` table in `supabase/schema.sql`:
  ```sql
  ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'aspirant' CHECK (role IN ('aspirant', 'admin', 'moderator'));
  ```
- [ ] **P1.3.2** Update `middleware.ts` — check `role = 'admin'` instead of subscription_status or email domain
- [ ] **P1.3.3** Update `app/admin/layout.tsx` — enforce `role = 'admin'`
- [ ] **P1.3.4** Update seed data in `supabase/seed.sql` — set at least one test user to `role = 'admin'`
- [ ] **P1.3.5** Remove all email-domain-based admin checks from codebase

## Acceptance Criteria
- [x] Only users with `role = 'admin'` can access `/admin/*`
- [x] Non-admin users get 403 or redirect to `/`
- [ ] `npx tsc --noEmit` passes

## Definition of Done
- [x] RBAC implemented via `users.role` column
- [x] No subscription-status-based admin checks remain
