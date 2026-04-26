---
story: S9F1
sprint: 9
name: Daily Dhwani
priority: P0
parent: sprint9-plan.md
---

# Story S9F1: Daily Dhwani (AI Current Affairs Podcast)

## Scope
Every morning at 6 AM, generate a 5-minute text summary of yesterday's UPSC-relevant news. MVP stores text script; TTS audio generation is a STUB (ElevenLabs account needed for real audio).

## In Scope
- [x] RSS scraper extension in `lib/scraper/` for news feeds
- [x] AI summarization pipeline → daily script JSON
- [x] `app/dhwani/page.tsx` showing today's script + playback area
- [x] `app/api/dhwani/generate/route.ts` admin trigger
- [x] `daily_dhwani` table in Supabase

## Out of Scope
- Real ElevenLabs TTS audio (stubbed with placeholder)
- Scheduled cron job (admin trigger for MVP)
- Regional languages beyond EN/HI

## Tasks
- [x] **S9F1.1** Schema: Add `daily_dhwani` table:
  id, date DATE, gs_paper TEXT, stories JSONB (array of {title, source, gs_relevance, summary}), script_text TEXT, audio_url TEXT, created_at
- [x] **S9F1.2** Extend `lib/scraper/config.ts` + `lib/scraper/engine.ts`:
  - RSS feed sources: The Hindu, Indian Express, PIB
  - Parse RSS → extract article titles/links
- [x] **S9F1.3** Create `lib/dhwani-engine.ts`:
  - Fetch RSS items
  - Call `aiChat()` with: "Extract 3 UPSC-relevant stories. Return JSON with title, source, gs_paper mapping, and a 2-paragraph summary."
  - Generate narrative script: Hook → Story 1 → Story 2 → Story 3 → Question → Outro
- [x] **S9F1.4** Create `app/api/dhwani/generate/route.ts`:
  - POST trigger (admin only)
  - Calls dhwani-engine
  - Upserts into `daily_dhwani`
  - Returns generated script
- [x] **S9F1.5** Create `app/dhwani/page.tsx`:
  - Server component fetching today's `daily_dhwani`
  - Display stories with GS Paper tags
  - Show full script text
  - Playback area with stub message: "Audio coming soon — read script below"
  - Download as PDF button
- [x] **S9F1.6** Admin trigger button on `/admin/content` or new `/admin/dhwani` page

## Acceptance Criteria
- [x] Admin can generate today's Dhwani script
- [x] Script contains 3 UPSC-relevant stories with GS Paper mapping
- [x] Aspirants can read today's Dhwani on `/dhwani`
- [x] tsc clean
