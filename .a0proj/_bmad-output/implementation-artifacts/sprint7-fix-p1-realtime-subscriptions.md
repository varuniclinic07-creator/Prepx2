---
fix: P1.7
sprint: 7-corrective
priority: P1
parent: sprint7-corrective-course-p0-fixes.md
---

# Fix P1.7: Real-Time Supabase Subscriptions

## Current State
- No Supabase Realtime subscriptions used anywhere.
- Users must refresh page to see squad changes, new content, or plan updates.
- No optimistic UI updates.

## Scope
- [x] In Scope: Realtime channels for squads, daily plans, user sessions, notifications
- [ ] Out of Scope: WebRTC video, multiplayer real-time quiz

## Tasks
- [ ] **P1.7.1** Create `lib/realtime.ts`:
  - Export `subscribeToTable(table, filter, callback)` helper
  - Wraps `supabase.channel(...).on('postgres_changes', ...)`
  - Auto-unsubscribe on component unmount
- [ ] **P1.7.2** Wire `app/squads/page.tsx`:
  - Subscribe to `squad_members` changes → refresh squad list automatically
  - Show toast when new member joins
- [ ] **P1.7.3** Wire `app/page.tsx` (dashboard DailyPlan):
  - Subscribe to `daily_plans` updates for current user
  - Auto-refresh plan when admin or generator updates it
- [ ] **P1.7.4** Wire `app/admin/hermes/page.tsx`:
  - Subscribe to `user_sessions` changes → update session table in real-time
- [ ] **P1.7.5** Implement optimistic UI for task completion:
  - When user marks task complete, update UI immediately before DB confirms
  - Rollback on error

## Acceptance Criteria
- [ ] Squad membership updates appear without refresh
- [ ] Daily plan updates sync across sessions
- [ ] Admin Hermes sessions update in real-time
- [ ] Task completion feels instant (optimistic UI)
- [ ] `npx tsc --noEmit` passes

## Definition of Done
- [ ] No page requires manual refresh for core data updates
- [ ] Realtime channels cleaned up on unmount (no memory leaks)
