# PrepX Backend Security Audit — API Routes

**Date:** 2026-04-26
**Scope:** 31 API routes under `app/api/`
**Auditor:** Agent Zero (Developer)

---

## Summary Table

| # | Route | Try/Catch | Input Validation | Auth | Authz (Role) | Rate Limit | SQLi Risk | Called By | Issues |
|---|-------|-----------|-----------------|------|-------------|-----------|----------|------------|-------|
| 1 | astra/generate | Yes (L7-50) | Manual — `topic` truthy+string, no length cap | ❌ No | ❌ No | ❌ No | ❌ No | astra/page.tsx | Unauthenticated LLM burn; prompt inj risk |
| 2 | battle-royale | Yes (L21,23,78) | Manual — `action` checked only; fields unvalidated | ✅ Yes | ✅ Admin (create/live/complete) | ❌ No | ❌ No | battle-royale/page.tsx | No bounds on prize_pool/question_count |
| 3 | battles/accept | ❌ No | Manual — `battle_id` truthy only | ✅ Yes | ❌ No | ❌ No | ❌ No | battles/page.tsx | Any auth user can accept any battle; req.json unwrapped |
| 4 | battles/create | ❌ No | Manual — email truthy, wager number; no caps | ✅ Yes | ❌ No | ❌ No | ❌ No | battles/page.tsx | Self-battle possible; req.json unwrapped |
| 5 | bot/telegram | Yes (L9,17) | Manual — splits text, no command whitelist | ❌ No | ❌ No | ❌ No | ❌ No | — | Open webhook; no secret/IP check |
| 6 | daily-plan/add-topic | ❌ No | Manual — `topic_id` truthy only | ✅ Yes | ❌ No | ❌ No | ❌ No | predictions/page.tsx | req.json unwrapped; array mutation risk |
| 7 | daily-plan/generate | ❌ No | ❌ None — no body read | ✅ Yes | ❌ No | ❌ No | ❌ No | page.tsx | No size validation before upsert |
| 8 | dhwani/generate | Yes (L19-37) | ❌ None — no body read | ✅ Yes | ✅ Admin | ❌ No | ❌ No | — | Admin but no rate limit |
| 9 | essay-colosseum/accept | Yes (L9-23) | Manual — `match_id` truthy only | ✅ Yes | ❌ No | ❌ No | ❌ No | essay-colosseum/page.tsx | Anyone can accept any open match |
| 10 | essay-colosseum/create | Yes (L8-31) | Manual — `topic` truthy string; email unvalidated | ✅ Yes | ❌ No | ❌ No | ❌ No | essay-colosseum/page.tsx | No topic length cap |
| 11 | essay-colosseum/list | Yes (L8-20) | ❌ None | ✅ Yes | ❌ No | ❌ No | ❌ No | essay-colosseum/page.tsx | No pagination offset |
| 12 | essay-colosseum/submit | Yes (L11-68) | Manual — match_id, essay_text truthy; no length cap | ✅ Yes | ❌ No | ❌ No | ❌ No | essay-colosseum/page.tsx | **IDOR**: any auth user can submit to any match; race condition; prompt injection |
| 13 | interview/evaluate | Yes (L21-34) | Manual — question/answer truthy only | ✅ Yes | ❌ No | ❌ No | ❌ No | interview/page.tsx | Prompt injection; no length cap; catch returns 200 masking errors |
| 14 | isa/enroll | ❌ No | ❌ None | ✅ Yes | ❌ No | ❌ No | ❌ No | isa/page.tsx | Read-then-write race; rankOrder.indexOf may return -1 |
| 15 | isa/list | ❌ No | ❌ None | ✅ Yes | ✅ Admin | ❌ No | ❌ No | admin/isa/page.tsx | No pagination |
| 16 | isa/payment | ❌ No | Manual — milestone whitelisted against MILESTONE_AMOUNTS | ✅ Yes | ✅ Implicit (contract.user_id check) | ❌ No | ❌ No | admin/isa/page.tsx | Razorpay dummy fallback secrets; not atomic; leaks Razorpay errors to client |
| 17 | mains/evaluate | Yes (L5-36) | Manual — question_id, answer_text, user_id truthy | ❌ No | ❌ No | ❌ No | ❌ No | — | **P0**: Unauthenticated LLM endpoint; prompt injection; no length cap |
| 18 | mnemonics/generate | Yes (L15-25) | Manual — `topic` truthy string; no length cap | ✅ Yes | ❌ No | ❌ No | ❌ No | mnemonics/page.tsx | LLM cost abuse |
| 19 | payments/razorpay | Yes (L5-25) | Manual — destructures amount/userId/plan, no validation | ❌ No | ❌ No | ❌ No | ❌ No | pricing/page.tsx | **P0**: No auth on payment; userId spoofing; dummy Razorpay credentials |
| 20 | predictions | ❌ No | ❌ None | ✅ Yes | ❌ No | ❌ No | ❌ No | predictions/page.tsx | Unhandled errors return 500 |
| 21 | rank/predict | Yes (L13-31) | Manual — body parsed with catch; user_id unvalidated | ✅ Yes | ❌ No | ❌ No | ❌ No | rank/RefreshButton.tsx | **IDOR**: can predict/store for any user_id |
| 22 | scrape/run | Yes (L6-11) | Manual — sourceId unvalidated | ❌ No | ❌ No | ❌ No | ❌ No | admin/scraper/page.tsx | Unauthenticated admin trigger; DoS risk |
| 23 | spatial/topics | ❌ No | ❌ None | ❌ No | ❌ No | ❌ No | ❌ No | spatial/page.tsx | Public JSONB content leak; no pagination |
| 24 | territory/capture | Yes (L10-20) | Manual — `district_id` truthy only | ✅ Yes | ❌ No | ❌ No | ❌ No | territory/page.tsx | No squad membership check; no district existence check |
| 25 | territory/list | Yes (L7-23) | ❌ None | ❌ No | ❌ No | ❌ No | ❌ No | territory/page.tsx | Public squad data; in-memory sorting |
| 26 | test-ai | Yes (L5-18) | ❌ None — provider unused | ❌ No | ❌ No | ❌ No | ❌ No | admin/ai-providers/page.tsx | **P1**: Public AI burn endpoint |
| 27 | tutors/create | ❌ No | Manual — POST checks name/notes truthy; PATCH checks id | Partial (GET no auth, POST/PATCH yes) | POST: aspirant blocked; PATCH: admin only | ❌ No | ❌ No | tutors/page.tsx, tutors/create/page.tsx, tutors/[id]/page.tsx, admin/tutors/page.tsx | Prompt injection via notes; no req.json wrapping |
| 28 | tutors/hire | ❌ No | Manual — `tutorId` truthy only | ✅ Yes | ❌ No | ❌ No | ❌ No | — | Razorpay dummy fallback; not atomic; leaks Razorpay errors |
| 29 | webhooks/razorpay | Yes (L17-51) | Signature verified via HMAC | Webhook (sig verify) | N/A | ❌ No | ❌ No | — | timingSafeEqual outside try-catch; potential month-end date bug |
| 30 | webhooks/stripe | ❌ No | Manual — body parsed, no sig check | ❌ No | ❌ No | ❌ No | ❌ No | — | **P0**: Missing Stripe webhook sig verification — anyone can fake payments |
| 31 | white-label/tenants | ❌ No | Manual — POST cast body, no field validation | Partial (GET no auth, POST/PATCH yes) | POST/PATCH: admin only | ❌ No | ❌ No | admin/white-label/page.tsx, admin/white-label/[slug]/page.tsx | **Mass assignment** via whole-body insert; no slug/fee validation |
| 32 | white-label/tenants/[slug] | ❌ No | Manual — slug unvalidated | ❌ No | ❌ No | ❌ No | ❌ No | — | Leaks global user count; .single() throws → 500 |

---

## Critical Findings

### 🚨 P0 — Immediate Action Required

| # | File | Issue | Impact | Fix |
|---|------|-------|--------|-----|
| 1 | `payments/razorpay` | **Unauthenticated payment order creation** — no session check; `userId` from body not verified against session | Fake orders, userId spoofing, revenue loss | Add `supabase.auth.getUser()`; verify `userId` against `user.id` |
| 2 | `webhooks/stripe` | **Missing Stripe signature verification** — raw `req.json()` with no `stripe.webhooks.constructEvent()` | Anyone can POST fake checkout events and trigger subscriptions | Implement `constructEvent()` with `STRIPE_WEBHOOK_SECRET` |
| 3 | `mains/evaluate` | **Fully unauthenticated LLM endpoint** — no auth check; `user_id` accepted from body | Credit abuse, prompt injection, data pollution | Add `getUser()`; remove `user_id` from body |
| 4 | `payments/razorpay` + `tutors/hire` + `isa/payment` | **Razorpay dummy credential fallbacks** — `rzp_test_dummy` / `dummy_secret` hardcoded | Production payments fail or leak test credentials | Remove fallback strings; fail hard if env vars missing |

### ⚠️ P1 — High Priority

| # | File | Issue | Impact | Fix |
|---|------|-------|--------|-----|
| 5 | `test-ai` | **Public AI burn endpoint** — unauthenticated `aiChat` trigger | API credit exhaustion | Add auth + rate limit |
| 6 | `scrape/run` | **Unauthenticated admin trigger** — anyone can trigger long-running scraper | DoS, server resource exhaustion | Add admin role check |
| 7 | `bot/telegram` | **Open webhook without secret verification** — no `X-Telegram-Bot-Api-Secret-Token` or IP allowlist | DoS, unauthorized command injection | Add secret token + IP allowlist |
| 8 | `rank/predict` | **IDOR** — authenticated user can pass arbitrary `user_id` in body to generate predictions for others | Data pollution, privacy violation | Verify `body.user_id === user.id` or remove param |
| 9 | `essay-colosseum/submit` | **IDOR + unauthorized submission** — any auth user can submit to any match; no membership check | Match manipulation, unfair outcomes | Validate `user.id` is `initiator_id` or `opponent_id` |
| 10 | `essay-colosseum/accept` | **Anyone can accept any open match** — no invitation/ownership check | Match hijacking | Check match ownership or invitation system |
| 11 | `white-label/tenants` | **Mass assignment** — entire request body inserted into DB | Attacker can set hidden columns (api_key, stripe_account_id) | Use Zod schema + whitelist allowed fields |
| 12 | `webhooks/razorpay` | **timingSafeEqual outside try-catch** — length mismatch throws uncaught exception | 500 leak, potential DoS | Wrap in try-catch or check buffer lengths first |

### 📌 P2 — Medium Priority

| # | File | Issue | Impact | Fix |
|---|------|-------|--------|-----|
| 13 | **Multiple (all 31)** | **No rate limiting** on any route | DoS, LLM credit abuse, brute force | Add Vercel/Upstash rate limiter middleware |
| 14 | **Multiple (~14 routes)** | **Missing try/catch around `req.json()`** | Unhandled JSON parse errors return 500 | Wrap `req.json()` in try/catch |
| 15 | **All routes** | **No Zod validation** | Inconsistent validation, mass assignment risk | Add Zod schemas for every route |
| 16 | `interview/evaluate`, `mains/evaluate`, `mnemonics/generate`, `tutors/create` | **Prompt injection** — unsanitized user input into LLM prompts | AI manipulation, jailbreak | Add input sanitization/length caps; use structured prompts |
| 17 | `white-label/tenants/[slug]` | **Global user count leak** — `count('exact')` not filtered by tenant | Info disclosure | Add `.eq('tenant_slug', slug)` to count query |
| 18 | `bot/telegram` | **Empty response on unhandled commands** — commands not in map return `null` silently | Confusing UX, potential info leak | Return explicit 400 for unknown commands |
| 19 | `scrape/run` | **sourceId passed directly into pipeline** without whitelist | Arbitrary scraper execution | Whitelist valid source IDs |
| 20 | `payments/razorpay` | **`amount * 100` may produce NaN** if amount is non-numeric | Invalid Razorpay order creation | Add `typeof amount === 'number'` and min/max check |
| 21 | `isa/enroll` | **Read-then-write race condition** on duplicate contract check | Duplicate ISA contracts | Add DB unique constraint on `(user_id, exam_year)` |
| 22 | `daily-plan/add-topic` | **In-place array mutation of Supabase result** | Potential cache/dirty data issues | Clone array before mutation (`[...tasks]`) |

---

## Security Posture Summary

| Metric | Count |
|--------|-------|
| Total routes audited | 31 |
| Routes with NO authentication | 7 (`astra/generate`, `bot/telegram`, `mains/evaluate`, `payments/razorpay`, `scrape/run`, `spatial/topics`, `test-ai`, etc) |
| Routes with NO try/catch | 14 |
| Routes with NO input validation | 8 |
| Routes with rate limiting | 0 |
| Routes with Zod validation | 0 |
| Routes with prompt injection risk | 4 |
| Routes with IDOR risk | 3 |
| Webhooks missing signature verification | 1 (Stripe) |

---

*End of audit.*
