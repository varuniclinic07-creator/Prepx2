---
story: S10F1
sprint: 10
name: Astra Stream
priority: P1
parent: sprint10-plan.md
---

# Story S10F1: Astra Stream (AI Video Lecture Generator)

## Scope
AI generates 3-5 minute video lecture scripts on any topic. MVP generates text script + key frames (text overlays). Video rendering is STUBBED (Remotion/ElevenLabs need accounts). Display as readable script with animated text highlights.

## In Scope
- [x] `lib/astra-engine.ts` — AI script + frame generation
- [x] `app/astra/page.tsx` — input topic, generate script, display as slides
- [x] `app/api/astra/generate/route.ts` — POST endpoint, admin or user trigger
- [x] `astra_scripts` table in Supabase

## Out of Scope
- Remotion video rendering (P2)
- ElevenLabs audio generation (P2)
- Animated diagrams (placeholder frames)

## Tasks
- [x] **S10F1.1** Schema: `astra_scripts`: id, topic TEXT, subject TEXT, script JSONB (array of frames {timestamp, speaker_text, visual_hint}), status ENUM('pending','rendered'), created_at
- [x] **S10F1.2** `lib/astra-engine.ts`: call aiChat() with structured prompt: "Generate a 3-minute UPSC lecture script on [topic]. Return JSON: frames array with timestamp, speaker_text (in user's language), visual_hint, and key_concept tags."
- [x] **S10F1.3** `app/api/astra/generate/route.ts`: accept POST { topic, language }, call astra-engine, save to table
- [x] **S10F1.4** `app/astra/page.tsx`: topic input, generate button, display script as slide cards with playback controls (next/prev), text-to-speech via browser SpeechSynthesis (free), progress ring
- [x] **S10F1.5** Pre-cache 50 scripts on high-frequency topics at deployment
- [x] **S10F1.6** Add `/astra` nav link

## Acceptance Criteria
- [x] User can input any topic → get a 3-minute lecture script in under 30 seconds
- [x] Script is readable as slide cards with auto-advance playback
- [x] SpeechSynthesis reads script aloud
- [x] tsc clean
