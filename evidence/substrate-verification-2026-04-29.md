# Substrate Verification — 2026-04-29

**Goal:** Per Reality-First Protocol, verify every external dependency before building any feature on top of it. No mocks, no claims without evidence.

**Method:** Real HTTP calls from Windows dev machine to each external service. One non-streaming chat completion per provider/model. One probe per table on Supabase. Real signup against `/auth/v1/signup`.

**Evidence files:**
- `evidence/provider-verification-raw.json` — JSON dump of every provider call
- `evidence/provider-verification-stdout.log` — Human-readable run output
- `evidence/supabase-verification-raw.json` — Supabase connection + table sample
- `evidence/supabase-verification-stdout.log` — Run output
- `evidence/supabase-table-inventory.json` — All 41 migration tables probed
- `evidence/supabase-table-inventory-stdout.log` — Run output

**Scripts:**
- `scripts/verification/verify-providers.mjs`
- `scripts/verification/verify-supabase.mjs`
- `scripts/verification/list-supabase-tables.mjs`

---

## 1. AI Providers

| Provider | Status | Working keys | Working models | Notes |
|----------|--------|--------------|----------------|-------|
| **ollama-cloud** | `verified` | 1/1 | `deepseek-v4-pro:cloud` | 14s latency on first call (cold start). Reasoning model — content goes via reasoning channel, plain text in `message.content` after completion. |
| **groq** | `partial` | 6/7 | `llama-3.3-70b-versatile` | Key-1 returns 400 `Organization has been restricted` — rotate or escalate. Other 6 keys: 100–400ms latency. |
| **9router** | `verified` | 1/1 | `kr/claude-sonnet-4.5` | ~3s latency. **Returns SSE streaming by default even with `stream:false`** — client must handle `data:` chunks. |
| **kilo** | `partial` | 4/4 keys | `nvidia/nemotron-3-super-120b-a12b:free`, `kilo-auto/free`, `openrouter/free` | All 4 keys auth fine. **2 of 5 declared models broken:** `bytedance-seed/dola-seed-2.0-pro:free` (free period ended), `x-ai/grok-code-fast-1:optimized:free` (chat_completions unsupported, only `responses` endpoint). |
| **nvidia** | `partial` | 1/1 | `nvidia/nemotron-3-super-120b-a12b`, `moonshotai/kimi-k2.5`, `nvidia/llama-3.3-nemotron-super-49b-v1.5` | **4 of 7 declared models broken:** `minimax/minimax-m2.5` (404), `qwen/qwen3.5-397b-a17b` (timeout 30s+), `mistralai/mistral-large-3-675b-instruct-2512` (timeout 30s+), `zai/glm-5` (404). |
| **opencode** | `failed` | 0/2 | none | `localhost:3100` not running on this Windows dev box. Expected — this is a self-hosted local provider; only available when its docker container is up. |

### Recommendations
- **Drop or fix the broken model entries** in the AI router config. Keeping non-existent NVIDIA/Kilo models in the fallback list silently wastes 30s per call when reached.
- **Rotate Groq key-1** — restricted at the org level.
- **9router needs SSE-aware client.** The OpenAI SDK handles this if `stream:true` is set; calling it with `stream:false` and expecting JSON will return parseable SSE that needs concatenation.
- **Opencode is `partial` at best** — only verifiable when the local container runs. Treat as optional.

---

## 2. Supabase (self-hosted at `173-185-79-174`)

URL: `http://supabase.173-185-79-174.sslip.io:47882`

| Component | Status | Evidence |
|-----------|--------|----------|
| **HTTP reachability** | `verified` | Root returns 401 (auth required, expected); `/rest/v1/` returns 200 |
| **PostgREST** | `verified` | 200 OK, 2.1s first response |
| **GoTrue auth** | `verified` | `/auth/v1/health` returns 200 |
| **Real signup** | `verified` | Created user `d5886b51-573a-47f0-be1d-b6efd72d2be7` (`verify-1777465299632@example.com`), got UUID, identity record, email_verified=false (confirmation flow active) |
| **Schema applied** | `partial` | 38/41 migration-defined tables exist, 2 missing (ComfyUI), 1 errors (squad_members → 500) |

### Schema state

**Present (38):** activity_log, agent_tasks, ai_tutors, astra_scripts, battle_participants, battle_royale_events, battle_royale_participants, coin_transactions, daily_dhwani, daily_plans, district_topics, districts, essay_colosseum_matches, essay_colosseum_submissions, feature_flags, isa_contracts, isa_payments, mains_attempts, nudge_log, quiz_attempts, quizzes, squads, streak_battles, subscriptions, territory_ownership, territory_wars, topics, tutor_subscriptions, user_balances, user_cohorts, user_notifications, user_office_ranks, user_predictions, user_sessions, user_telegrams, user_weak_areas, users, white_label_tenants.

**Missing (2):** `comfyui_jobs`, `comfyui_settings` — Sprint 11.7 migrations not applied.

**Errors (1):** `squad_members` returns 500. Needs investigation — likely missing column or broken RLS policy.

### Important schema facts (vs original assumptions)

| Looked for | Actually named |
|------------|----------------|
| `battles` | `streak_battles` (also `battle_participants`, `battle_royale_events`, `battle_royale_participants`) |
| `payments` | `isa_payments` |
| `subjects` | **does not exist** — subjects appear to be hardcoded / handled via `topics.subject` column |
| `questions` | **does not exist** — questions stored inside `quizzes` JSONB |
| `quiz_answers` | **does not exist** — answers stored inside `quiz_attempts` JSONB |
| `essay_submissions` | `essay_colosseum_submissions` |
| `territories` | `territory_ownership` + `territory_wars` |

This is useful intelligence: the app stores quizzes/questions/answers as JSONB blobs rather than normalized rows. That's a real architectural choice, not missing tables.

### Action items

1. **Apply migrations 040–041** (ComfyUI tables) to this Supabase, OR mark ComfyUI as out-of-scope for MVP.
2. **Investigate `squad_members` 500** — run the migration manually if it failed silently.
3. **Apply Sprint 12 migrations 042–043** (atomic financial operations + tightened RLS) — confirm not already applied.

---

## 3. Local environment

| Component | Status | Notes |
|-----------|--------|-------|
| Node.js | `verified` | v24.13.0 — supports `--env-file` natively |
| `.env.local` | `verified` | Created, gitignored, contains all 19 credential vars |
| `evidence/`, `docs/`, `e2e/`, `monitoring/`, `runbooks/` directories | `verified` | Created |
| Opencode local server | `failed` | Not running on `localhost:3100` |

---

## 4. Overall verdict

**Substrate is real enough to start building.** The question shifts from "does any of this work" to "which features can we build on what works."

### Greenlit dependencies (use freely):
- Supabase (auth + most tables)
- Groq (6 keys, 1 model)
- 9router (1 model, with SSE handling)
- Ollama Cloud (1 model, slower)
- Kilo (3 models work, 4 keys)
- NVIDIA (3 models work)

### Yellow / use with care:
- `squad_members` table broken — feature relying on squads will fail
- ComfyUI tables missing — image/video gen via ComfyUI is `scaffold` only on this DB
- 9router streaming behavior — needs SSE-aware client wrapper

### Red / out of scope until fixed:
- Opencode (no local server)
- Razorpay/Stripe — **NOT YET VERIFIED**, no test keys provided
- Telegram bot — **NOT YET VERIFIED**, no token provided
- SMTP / Twilio (used by supabase-auth for email verification + SMS) — **NOT YET VERIFIED**
- Production app deployment — **NOT YET ATTEMPTED**

---

## 5. What's next

Per Phase 1 of the protocol — **Foundation** before features:

1. **Pick first vertical slice.** I recommend the *thinnest possible*:
   - User can sign up with email/password
   - User can log in
   - User can see their own profile (one row from `users` table)
   - Logout works
   - Refresh persists session

2. Run the Next.js dev server locally against this real Supabase.

3. Execute the flow in a real browser. Capture screenshots, network log, DB row.

4. Write `evidence/auth-flow-verified-2026-04-29.md`.

5. Tag the slice: `verified` (locally) / `partial` (some scenarios fail) / `scaffold` (doesn't work).

Only after that is `verified` do we add a second slice (e.g., quiz engine).

---

**Substrate verification status: COMPLETE.** No code claims based on TypeScript. Every above status is backed by a logged HTTP response.
