---
story: S9F4
sprint: 9
name: Voice-First Interface
priority: P0
parent: sprint9-plan.md
---

# Story S9F4: Voice-First Interface

## Scope
Hands-free quiz mode via speech input. MVP uses browser Web Speech API + AI text response. Wake-word is a stub button (real wake-word via Vosk is P2).

## In Scope
- [x] `app/voice/page.tsx` with microphone UI
- [x] Browser Web Speech API for speech-to-text
- [x] AI dialogue via `ai-router.ts`
- [x] Text-to-speech via browser SpeechSynthesis API
- [x] Session tracking

## Out of Scope
- On-device wake-word detection (Vosk/Picovoice)
- True streaming TTS (ElevenLabs streaming)
- Offline voice support

## Tasks
- [x] **S9F4.1** Create `lib/voice-session.ts`:
  - Track session state: idle → listening → thinking → speaking
  - Store dialogue history
  - Map voice commands to actions: "quiz me on X" → start quiz, "what is my rank" → fetch rank
- [x] **S9F4.2** Create `app/voice/page.tsx`:
  - Big microphone button (wake-word stub)
  - Waveform animation while listening
  - Show transcribed text after speech recognition
  - Show AI response
  - Speak AI response via SpeechSynthesis
  - Visual conversation log
- [x] **S9F4.3** Speech recognition:
  - Use native `window.SpeechRecognition` or `webkitSpeechRecognition`
  - Listen for 5 seconds after button tap
  - Transcribe Hindi + English
- [x] **S9F4.4** Intent parsing:
  - In `lib/voice-session.ts`, parse transcript for keywords:
    - "quiz me on [topic]" → route to quiz generation
    - "what is my rank" → route to rank prediction
    - "generate mnemonic for [topic]" → route to mnemonic engine
    - fallback → general conversation via `aiChat()`
- [x] **S9F4.5** Text-to-speech:
  - Use browser `SpeechSynthesisUtterance`
  - Select Hindi or English voice based on user preference
  - Rate: 0.9 (slightly slower for learning)

## Acceptance Criteria
- [x] User taps mic button → speaks question → sees transcription
- [x] AI responds contextually (quiz, rank, or conversation)
- [x] Response is spoken aloud via browser TTS
- [x] Works on mobile Chrome and Safari
- [x] tsc clean
