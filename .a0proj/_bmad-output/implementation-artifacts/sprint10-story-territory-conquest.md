---
story: S10F4
sprint: 10
name: Territory Conquest
priority: P1
parent: sprint10-plan.md
---

# Story S10F4: Territory Conquest (Bharat Ka Vijay Map)

## Scope
Risk-style map where users capture Indian districts by mastering topics. Squad wars real-time.

## In Scope
- [x] `territory_ownership` + `district_topics` tables
- [x] Interactive SVG/Leaflet map of India district boundaries (simplified GeoJSON)
- [x] Capture mechanics: master topic → own district
- [x] Real-time conquest updates
- [x] Weekly squad war events

## Out of Scope
- Full Risk combat math (P2)
- 3D map rendering (P2)
- Historical conquest replay (P2)

## Tasks
- [x] **S10F4.1** Schema:
  - `districts`: id, name TEXT, state TEXT, geojson TEXT (simplified polygon)
  - `district_topics`: district_id, topic_id
  - `territory_ownership`: district_id, squad_id, captured_at, capture_count INT
- [x] **S10F4.2** Data: populate `districts` with simplified map data (use static JSON of Indian state boundaries; district-level is too dense — use state boundaries for MVP)
- [x] **S10F4.3** `lib/territory-conquest.ts`: captureDistrict(userId, districtId) — check if user has mastered linked topic → if yes, assign district to user's squad, update ownership
- [x] **S10F4.4** `app/territory/page.tsx`: interactive SVG map of India (color coded by squad ownership), hover shows district name, topic, owner squad, click-to-capture if topic mastered, real-time updates via `realtime.ts`
- [x] **S10F4.5** Weekly war: admin schedules war on a state → squads compete → most captures wins → coins spread among squad members
- [x] **S10F4.6** Add `/territory` nav link

## Acceptance Criteria
- [x] User sees India map color-coded by squad ownership
- [x] Clicking unlocked district captures it for squad
- [x] Real-time updates show conquests happening live
- [x] Weekly war has leaderboard + rewards
- [x] tsc clean
