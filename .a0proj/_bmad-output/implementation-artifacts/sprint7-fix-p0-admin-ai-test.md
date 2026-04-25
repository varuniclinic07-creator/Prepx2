---
fix: P0.4
sprint: 7-corrective
priority: P0
parent: sprint7-corrective-course-p0-fixes.md
---

# Fix P0.4: Admin AI Provider Test Button

## Current State
`/admin/ai-providers` page has a "Test" button that calls `/api/test-ai` which **does not exist**.

## Scope
- [x] In Scope: New API route + admin UI wiring
- [ ] Out of Scope: Full provider management (enable/disable toggles, key rotation)

- [x] **P0.4.1** Create `app/api/test-ai/route.ts` — POST endpoint that calls `ai-router.ts.createCompletion()` with a simple prompt ("Hello, are you working?") and returns the response text
- [x] **P0.4.2** Wire admin page button to call `/api/test-ai` and display response in a toast/alert
- [x] **P0.4.3** Handle failure gracefully (show error if AI router returns no response)
- [x] Clicking "Test" on admin AI providers page returns a response
- [x] If all AI providers fail, shows error message (not crash)
- [x] `npx tsc --noEmit` passes

- [x] `/api/test-ai` route exists and works
- [x] Admin button functional end-to-end
- [x] Error state handled
