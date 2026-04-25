---
fix: P1.4
sprint: 7-corrective
priority: P1
parent: sprint7-corrective-course-p0-fixes.md
---

# Fix P1.4: Nudge Delivery Mechanism

## Current State
- `nudge_log` table exists.
- Admin UI reads it (`/admin/nudges`).
- No creation UI.
- No delivery scheduler.
- No in-app notification system.

## Scope
- [x] In Scope: Nudge creation UI, delivery via edge function, in-app toast notification
- [ ] Out of Scope: Push notifications (FCM), email delivery via SMTP

## Tasks
- [ ] **P1.4.1** Build admin nudge creation form at `/admin/nudges`:
  - Title, message body, target user filter (all, by tier, by subject)
  - Schedule type: immediate or future datetime
  - Submit → insert into `nudge_log` with status `pending`
- [ ] **P1.4.2** Create Supabase Edge Function `functions/poll-nudges/index.ts`:
  - Poll `nudge_log` for `pending` items where `scheduled_at <= now()`
  - Insert into `user_notifications` table (or broadcast via Realtime)
  - Mark status as `sent` or `failed`
- [ ] **P1.4.3** Create `user_notifications` table if not exists:
  ```sql
  CREATE TABLE user_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- [ ] **P1.4.4** Wire aspirant dashboard to show unread notification count in header
- [ ] **P1.4.5** Show toast/toast-like component on login if unread notifications exist

## Acceptance Criteria
- [ ] Admin can create and schedule nudges from `/admin/nudges`
- [ ] Pending nudges get delivered automatically (edge function or periodic poll)
- [ ] Aspirants see notifications in-app
- [ ] `npx tsc --noEmit` passes

## Definition of Done
- [ ] End-to-end nudge creation → delivery → display works
- [ ] No manual DB edits required for nudge delivery
