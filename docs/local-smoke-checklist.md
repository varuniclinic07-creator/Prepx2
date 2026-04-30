# PrepX Feature Inventory — Local Smoke Checklist

> Generated 2026-04-30. Use this as the master list for deciding sprint priority and as the per-feature local-test recipe.
> Status legend (matches CHECKPOINT.md): scaffold (code exists, untested) · partial (some layers verified) · verified (real evidence captured).

## Foundation status (as of 2026-04-30)

- Cloud Supabase project `vbddpwxbijwuarmrexme` — 47 migrations applied, 11/11 HTTP probes pass, B4+B5 browser tests pass.
- Auth foundation = **verified** locally against cloud Supabase.
- Production deploy (Coolify, `https://upsc.aimasteryedu.in`) — last green build was on the **self-hosted** Supabase URL. After the env rename to cloud creds, build #6 needs to be confirmed green before Step 5 (auth-slice vs production) can run.

## Feature table

| # | Feature | Routes / Components | API endpoints | Status | Local-test entry point |
|---|---|---|---|---|---|
| 1 | Auth & Onboarding | `/login`, `/signup`, `/onboarding` | Supabase `auth/v1/*` | verified | `localhost:3000/login` → email + password → diagnostic quiz |
| 2 | Profile & Dashboard | `/profile`, `/` | `/api/predictions` (GET) | verified | login → `/profile` → check rank, stats, weak areas |
| 3 | Daily Plan Generator | `/predictions` | `POST /api/daily-plan/generate` | partial | login → `/predictions` → "Add to Plan" |
| 4 | Quiz Engine | `/` (quiz embed) | `/api/admin/quizzes/*` | verified | login → answer quiz → `POST /api/coins/award` |
| 5 | Predictive Questions | `/predictions` | `POST /api/rank/predict` | partial | `/predictions` → confidence-scored topics; **IDOR risk in body** |
| 6 | Rank Progression | `/rank`, `/ranks` | `/api/rank/predict` | verified | `/rank` → RefreshButton; rank from quiz accuracy |
| 7 | Battles (1v1) | `/battles` | `/battles/{create,accept}` | partial | `/battles` → opponent email + wager; **authz gap on accept** |
| 8 | Battle Royale | `/battle-royale` | `/api/battle-royale` | scaffold | admin only; bounds missing on prize_pool / question_count |
| 9 | Essay Colosseum | `/essay-colosseum` | `/essay-colosseum/{create,accept,submit,list}` | partial | full match flow; **IDOR in submit** (patched in code) |
| 10 | Territory Conquest | `/territory` | `/territory/{capture,list,auto-transition}` | scaffold | squad capture flow; no membership check |
| 11 | Squads | `/squads` | `/api/squads/{activity,leaderboard}` | partial | `/squads` activity + leaderboard |
| 12 | Voice / Speech | `/voice` | Web Speech API | partial | desktop only; idle→listening→processing→speaking |
| 13 | Interview Mock | `/interview` | `/api/interview/{evaluate,questions}` | partial | mock QA + AI eval; prompt-injection risk |
| 14 | Mains Answer Eval | (admin) | `POST /api/mains/evaluate` | partial | **P0 unauthenticated LLM endpoint** |
| 15 | Mnemonics Generator | `/mnemonics` | `POST /api/mnemonics/generate` | partial | enter topic → AI memory aids |
| 16 | AI Tutors | `/tutors` | `/tutors/{create,hire}`, `/admin/tutors/*` | partial | hire flow uses Razorpay |
| 17 | ISA (Income Share) | `/isa` | `/api/isa/{enroll,list,payment,payments}` | partial | admin enrol; race + dummy Razorpay creds |
| 18 | Pricing & Payments | `/pricing` | `/api/payments/{razorpay,verify}`, `/webhooks/{razorpay,stripe}` | partial | **P0 Stripe webhook missing sig verify** |
| 19 | Shop (Coin Store) | `/shop` | (none) | scaffold | placeholder bundles only |
| 20 | Astra (Content Gen) | `/astra` | `POST /api/astra/generate` | scaffold | **P0 unauthenticated LLM endpoint** |
| 21 | Spatial (3D) | `/spatial` | `GET /api/spatial/topics` | partial | desktop only; public JSONB leak |
| 22 | Dhwani (Audio Gen) | `/dhwani` | `/api/dhwani/{generate,audio}` | partial | admin generate; no rate limit |
| 23 | Reveal | `/reveal` | (none) | scaffold | purpose unclear |
| 24 | Sources | `/sources` | (none) | scaffold | curated content placeholder |
| 25 | Admin Panel | `/admin/*` | `/admin/{topics,quizzes,isa,tutors,tenants}/*` | partial | **P1 scraper run unauthenticated** |
| 26 | White-Label Tenants | `/admin/white-label` | `/api/white-label/tenants[/slug]` | partial | mass-assignment risk; user-count leak |
| 27 | Health Check | (internal) | `GET /api/health` | verified | `curl localhost:3000/api/health` |
| 28 | Telegram Bot | (backend) | `/api/bot/telegram` (webhook) | partial | **P1 no secret / IP verify** |
| 29 | ComfyUI (Image Gen) | (admin) | `/api/comfyui/{generate,status,settings}` | scaffold | no UI route; experimental |
| 30 | Test AI (debug) | (admin) | `GET /api/test-ai` | scaffold | **P1 public AI burn** |

## Recommendation: lowest-risk-first ship order

1. **Auth & Onboarding** (#1) — already verified.
2. **Profile & Dashboard** (#2) — read-only, simple aggregations.
3. **Quiz Engine + Daily Plan** (#3, #4) — core learning loop, e2e tests exist, coin award uses idempotency.

**Hard gates before any deploy:** disable or auth-gate `/api/mains/evaluate`, `/api/astra/generate`, `/api/test-ai`, `/api/webhooks/stripe`, `/api/payments/razorpay` (P0 list from `BACKEND_SECURITY_AUDIT.md`). Merge essay-colosseum + rank-predict IDOR fixes (already commented `FIX` in code).
