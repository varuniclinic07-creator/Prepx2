---
story: S2
epic: 28 — Content Generation at Scale
sprint: 7
priority: P0 — MVP must have real content before launch
effort: 3 dev-days (6 story points)
dependencies: S1.1 (optional local fallback)
---

# Story S2: Content Pipeline Execution

## Scope
- [x] In Scope: Batch content generation, Hindi translation verification, brand sanitization spot-check
- [ ] Out of Scope: Image generation, video content

## Tasks
- [x] **S2.1** Generate first 5 Polity topics via admin scraper
- [x] **S2.2** Batch generate across all 19 subjects (~185 topics)
- [x] **S2.3** Verify Hindi translation quality (sample 5 topics)
- [x] **S2.4** Spot-check 10 topics for brand sanitization

## Acceptance Criteria
- [x] ≥50 topics have non-template English content
- [x] ≥50 topics have non-template Hindi content
- [x] Zero coaching brand mentions in sampled topics
- [x] `npx next build` still passes cleanly

## Definition of Done
- [x] Topics table populated with real content
- [x] Hindi JSONB verified for Devanagari script
- [x] Brand sanitizer report shows zero matches
