---
story: S9F3
sprint: 9
name: Telegram Bot
priority: P0
parent: sprint9-plan.md
---

# Story S9F3: PrepX Telegram Bot

## Scope
Telegram bot delivering daily quiz, facts, and rank info. Uses polling or webhook. Stateless — all data from Supabase.

## In Scope
- [x] `/api/bot/telegram/route.ts` webhook handler
- [x] Commands: /quiz, /fact, /plan, /rank
- [x] Daily 5-question quiz delivered as interactive poll
- [x] User linking by chat_id storage

## Out of Scope
- Payment via Telegram
- Group admin features (P2)

## Tasks
- [x] **S9F3.1** Schema: Add `user_telegrams` table:
  id, user_id UUID REFERENCES users(id), chat_id TEXT UNIQUE, created_at
- [x] **S9F3.2** Create `lib/telegram-bot.ts`:
  - `handleCommand(chatId, command, args)` switch statement
  - /quiz → fetch 5 random questions → format as Telegram poll
  - /fact → fetch random high-yield fact
  - /plan → fetch today's daily plan
  - /rank → fetch latest prediction
  - /start → welcome message + link account instructions
  - /link account_code → verify and store chat_id
- [x] **S9F3.3** Create `app/api/bot/telegram/route.ts`:
  - POST webhook handler (Telegram sends updates here)
  - Parse message.text, route to telegram-bot.ts
  - Return 200 OK to Telegram
- [x] **S9F3.4** Create `/admin/bot/` admin page:
  - View connected users count
  - Broadcast nudge to all Telegram users
  - Show command usage stats
- [x] **S9F3.5** Account linking flow:
  - User copies account code from `/profile`
  - Sends `/link <code>` to bot
  - Verifies code → stores chat_id

## Acceptance Criteria
- [x] Telegram bot responds to /quiz with 5-question poll
- [x] /fact returns a UPSC-relevant fact
- [x] /rank shows latest predicted AIR
- [x] Account linking works via generated code
- [x] Admin can broadcast nudges via Telegram
- [x] tsc clean
