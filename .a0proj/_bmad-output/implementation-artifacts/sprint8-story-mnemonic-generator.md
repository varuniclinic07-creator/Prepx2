---
story: F4
sprint: 8
name: Mnemonic Generator
priority: P0
parent: sprint8-plan.md
---

# Story F4: AI Meme/Mnemonic Generator

## Scope
AI generates memorable mnemonics + memes for any UPSC topic list. Shareable to social.

## In Scope
- [x] `/app/mnemonics/page.tsx`
- [x] `/api/mnemonics/generate/route.ts` calling aiChat()
- [x] Display mnemonic card with text + visual placeholder
- [x] Share button (copy to clipboard + native share API)
- [x] History: past generated mnemonics

## Out of Scope
- DALL-E/Ideogram image generation (show placeholder image area)
- Video script generation

## Tasks
- [x] **F4.1** Create lib/mnemonic-engine.ts:
  - accept topicOrList string
  - call aiChat() with creative prompt: "Generate a funny, memorable Hindi/English mnemonic for this UPSC list. Return JSON with mnemonic_text and explanation."
  - Fallback if AI unavailable
- [x] **F4.2** Create `/api/mnemonics/generate/route.ts`:
  - POST { topic, user_id }
  - Call mnemonicEngine
  - Save to user_notes or new mnemonic_history table
  - Return JSON
- [x] **F4.3** Create `app/mnemonics/page.tsx`:
  - Input field for topic/list
  - "Generate" button → calls API → shows loading
  - Display result: mnemonic text in large font, explanation below
  - Placeholder area for meme image (future: DALL-E)
  - Share buttons: copy text, WhatsApp share link, native Web Share API
  - History sidebar: past mnemonics by topic
- [x] **F4.4** Add nav link to `/mnemonics` in `app/layout.tsx`

## Acceptance Criteria
- [x] User inputs any UPSC topic list → gets a mnemonic within 5 seconds
- [x] Mnemonic is memorable and humorous
- [x] User can share via WhatsApp or native share
- [x] History persists across sessions
- [x] tsc clean
