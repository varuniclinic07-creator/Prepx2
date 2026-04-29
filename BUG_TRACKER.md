# BUG_TRACKER.md

**Last Updated:** 2026-04-29T04:55:00Z

---

## Open Bugs

### CRITICAL (P0)
| ID | Description | File | Status |
|----|-------------|------|--------|
| BUG-001 | `astra/generate` unauthenticated LLM access | app/api/astra/generate/route.ts | OPEN |
| BUG-002 | `mains/evaluate` unauthenticated + IDOR | app/api/mains/evaluate/route.ts | OPEN |

### HIGH (P1)
| ID | Description | File | Status |
|----|-------------|------|--------|
| BUG-003 | `test-ai` public AI burn endpoint | app/api/test-ai/route.ts | OPEN |
| BUG-004 | `scrape/run` unauthenticated admin trigger | app/api/scrape/run/route.ts | OPEN |
| BUG-005 | `rank/predict` IDOR via body user_id | app/api/rank/predict/route.ts | OPEN |
| BUG-006 | `essay-colosseum/submit` IDOR | app/api/essay-colosseum/submit/route.ts | OPEN |
| BUG-007 | `essay-colosseum/accept` anyone can accept | app/api/essay-colosseum/accept/route.ts | OPEN |
| BUG-008 | `white-label/tenants` mass assignment | app/api/white-label/tenants/route.ts | FIXED |
| BUG-009 | `bot/telegram` no secret token verification | app/api/bot/telegram/route.ts | FIXED |

### MEDIUM (P2)
| ID | Description | File | Status |
|----|-------------|------|--------|
| BUG-010 | `spatial/topics` public JSONB content leak | app/api/spatial/topics/route.ts | OPEN |
| BUG-011 | `white-label/tenants/[slug]` global user count leak | app/api/white-label/tenants/[slug]/route.ts | OPEN |

### Pre-existing Warnings (non-blocking)
| ID | Description | File |
|----|-------------|------|
| WARN-001 | `<img>` should use `<Image>` | app/layout.tsx:49 |
| WARN-002 | useEffect missing `supabase` dep | app/reveal/page.tsx:30 |
| WARN-003 | containerRef.current stale in cleanup | components/SpatialCanvas.tsx:84 |
| WARN-004 | frames in useCallback deps | app/astra/page.tsx:54 |

## Resolved This Session
| ID | Description | Resolution |
|----|-------------|-----------|
| FIXED-001 | TypeScript build errors from DI migration | Added supabase param to 6 callers |
| FIXED-002 | Buffer type mismatch in Stripe webhook | Wrapped in Uint8Array |
| FIXED-003 | Missing `lib/subscription.ts` | Created module |
| FIXED-004 | Module-level requireEnv breaks build | Changed to optionalEnv |
| FIXED-005 | Next.js 15 params Promise type | Updated 7 dynamic routes |
| FIXED-006 | ESLint unescaped entities | Fixed in dhwani + ranks pages |
| FIXED-007 | BUG-009: Telegram webhook open to spoofed requests | Added X-Telegram-Bot-Api-Secret-Token verification with timingSafeEqual |
| FIXED-008 | BUG-008: White-label tenants GET unauthenticated | Added admin auth check to GET handler |
