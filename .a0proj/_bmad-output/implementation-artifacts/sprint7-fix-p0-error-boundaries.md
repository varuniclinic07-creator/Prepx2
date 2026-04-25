---
fix: P0.3
sprint: 7-corrective
priority: P0
parent: sprint7-corrective-course-p0-fixes.md
---

# Fix P0.3: Global Error Boundaries + 404 + Loading States

## Current State
No `error.tsx`, `not-found.tsx`, `loading.tsx`, or `global-error.tsx` found anywhere in `app/`.

## Scope
- [x] In Scope: `app/error.tsx`, `app/not-found.tsx`, `app/loading.tsx`, `app/global-error.tsx`
- [x] In Scope: Skeleton screens for `DailyPlan`, `TopicViewer`, `QuizComponent`
- [ ] Out of Scope: Full skeleton library for every component

## Tasks
- [x] **P0.3.1** Create `app/error.tsx` — root error boundary with "Something went wrong" UI, retry button, contact support link
- [x] **P0.3.2** Create `app/not-found.tsx` — 404 page with "Page not found", back to home
- [x] **P0.3.3** Create `app/loading.tsx` — global loading spinner using `LoadingSpinner` component
- [x] **P0.3.4** Create `app/global-error.tsx` — catches errors outside root layout
- [x] **P0.3.5** Create `components/skeletons/DailyPlanSkeleton.tsx`
- [x] **P0.3.6** Create `components/skeletons/TopicViewerSkeleton.tsx`
- [x] **P0.3.7** Create `components/skeletons/QuizComponentSkeleton.tsx`
- [x] **P0.3.8** Wire skeletons into respective pages as fallback while data loads
- [x] Navigating to non-existent route shows custom 404
- [x] Throwing error in any page shows custom error boundary
- [x] Loading states visible on all server component pages
- [x] Skeletons match real component layout (avoid layout shift)
- [x] `npx tsc --noEmit` passes after all changes

- [x] All 4 error/loading boundary files exist
- [x] Skeleton components exist and are wired
- [x] No bare `<div>Loading...</div>` left in codebase
