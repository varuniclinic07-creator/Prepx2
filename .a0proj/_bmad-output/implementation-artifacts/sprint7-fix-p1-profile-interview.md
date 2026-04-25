---
fix: P1.1+P1.2
sprint: 7-corrective
priority: P1
parent: sprint7-corrective-course-p0-fixes.md
---

# Fix P1.1: Profile & Settings Page + Fix P1.2: Interview Module

## Current State
- No `/profile` page exists. User language preference only in `localStorage`, never synced to Supabase.
- No `/interview` page exists. No AI mock interview panel.

## Scope
- [x] In Scope: `/profile` page with stats, settings, subscription management. `/interview` page with SAR coaching.
- [ ] Out of Scope: Full DAF profile builder, video interview recording.

## Tasks P1.1: Profile & Settings
- [ ] **P1.1.1** Migrate `preferred_language` from `localStorage` to Supabase `users` table (sync on change)
- [ ] **P1.1.2** Create `app/profile/page.tsx` — async server component
  - Display user stats: total quizzes attempted, accuracy %, streak count, weak areas list
  - Show subscription tier badge
  - Language preference toggle (EN|HI) — persisted to Supabase
  - Theme toggle (light/dark)
  - Link to `/pricing` for upgrades
- [ ] **P1.1.3** Ensure nav links to `/profile` from header/user menu

## Tasks P1.2: Interview Module
- [ ] **P1.2.1** Create `app/interview/page.tsx` — async server component
  - Display mock interview setup: topic selection or DAF-based questions
  - AI-generated interview question displayed
  - User types or voice-inputs answer
  - Submit button → POST to `/api/interview/evaluate`
  - Real-time scoring display (fluency, content, presence of mind)
- [ ] **P1.2.2** Create `app/api/interview/evaluate/route.ts` — POST endpoint
  - Accept `{ question, answer, user_id }`
  - Call `aiChat()` with SAR coaching rubric prompt
  - Return scores JSON

## Acceptance Criteria
- [ ] User can navigate to `/profile` and see performance summary
- [ ] Language preference persists across devices (Supabase, not just localStorage)
- [ ] Interview page loads and evaluates answers via AI
- [ ] `npx tsc --noEmit` passes

## Definition of Done
- [x] Both pages accessible and functional
- [x] No dead-end UI states
