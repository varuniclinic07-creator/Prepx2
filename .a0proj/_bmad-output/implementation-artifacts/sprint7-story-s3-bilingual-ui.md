---
story: S3
epic: 29 — Localization & Accessibility
sprint: 7
priority: P1
effort: 2 dev-days (4 story points)
dependencies: S2.2 (content must exist first)
---

# Story S3: Bilingual UI Polish

## Scope
- [x] In Scope: EN/HI toggle, language preference, mobile responsiveness
- [ ] Out of Scope: Full i18n framework, regional language support (Tamil, etc.)

## Tasks
- [x] **S3.1** TopicViewer language toggle `<EN | HI>` button
- [x] **S3.2** Language preference in user profile (`preferred_language` ENUM `en` | `hi`)
- [x] **S3.3** Mobile responsiveness pass (375px viewport)

## Acceptance Criteria
- [x] User can toggle between EN and HI on any topic
- [x] Toggle persists across sessions (localStorage)
- [x] Hindi content renders correct Devanagari script
- [x] All aspirant pages pass basic mobile viewport check

## Definition of Done
- [x] Users table has `preferred_language` column
- [x] Onboarding asks "Study in English or Hindi?"
- [x] Admin panels desktop-only; aspirant pages mobile-friendly
