---
story: S10F2
sprint: 10
name: Essay Colosseum
priority: P1
parent: sprint10-plan.md
---

# Story S10F2: Essay Colosseum (Peer-Review + AI Evaluation Arena)

## Scope
Users anonymously challenge each other with mains essays. AI evaluates both essays side-by-side and declares a winner.

## In Scope
- [x] `essay_colosseum_matches` + `essay_colosseum_submissions` tables
- [x] `app/essay-colosseum/page.tsx` — challenge, write, evaluate, results
- [x] `/api/essay-colosseum/create`, `/api/essay-colosseum/submit`, `/api/essay-colosseum/evaluate`
- [x] AI side-by-side evaluation using existing `mains-evaluator.ts`

## Out of Scope
- Scheduled tournaments (P2)
- Real-time spectator voting (P2)

## Tasks
- [x] **S10F2.1** Schema:
  - `essay_colosseum_matches`: id, topic TEXT, status ENUM('open','closed'), winner_user_id, ai_verdict JSONB, created_at
  - `essay_colosseum_submissions`: id, match_id, user_id, essay_text TEXT, word_count INT, scores JSONB, submitted_at
- [x] **S10F2.2** Create match flow:
  - `/essay-colosseum` page shows "Challenge" button → selects topic → invites by email/handle
  - Opponent accepts → both write essays in textareas with timer
  - After both submit → AI evaluates
- [x] **S10F2.3** AI evaluation:
  - Call `mains-evaluator.ts` for BOTH essays
  - Compare scores across dimensions: introduction, structure, arguments, conclusion
  - Generate verdict: "Player A wins on structure, Player B wins on argument depth. Overall: Player A."
  - Verdict JSON saved to match record
- [x] **S10F2.4** Results display: side-by-side essay cards with scored rubric, winner badge, coin rewards (500 to winner), share card
- [x] **S10F2.5** Add `/essay-colosseum` nav link

## Acceptance Criteria
- [x] User can challenge a friend to 1v1 essay battle
- [x] Both essays evaluated anonymously by AI
- [x] Verdict with reasoning displayed
- [x] Winner gets coins + badge
- [x] tsc clean
