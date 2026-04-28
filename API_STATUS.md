# API_STATUS.md

**Last Updated:** 2026-04-29T04:55:00Z

---

## API Routes Security Status (Post-Sprint 12)

### Hardened (Sprint 12 fixes applied)
| Route | Auth | Validation | Rate Limit | Webhook Sig |
|-------|------|-----------|------------|-------------|
| battles/accept | YES | Zod | YES (middleware) | N/A |
| battles/create | YES | Zod | YES (middleware) | N/A |
| battle-royale | YES | Zod | YES (middleware) | N/A |
| essay-colosseum/submit | YES | Zod | YES (middleware) | N/A |
| territory/capture | YES | Zod | YES (middleware) | N/A |
| payments/razorpay | YES | Zod | YES (30/min) | N/A |
| payments/verify | YES | Zod | YES (30/min) | N/A |
| isa/payment | YES | Zod | YES (30/min) | N/A |
| tutors/hire | YES | Zod | YES (middleware) | N/A |
| webhooks/razorpay | N/A | HMAC sig | YES (middleware) | YES |
| webhooks/stripe | N/A | HMAC sig | YES (middleware) | YES (custom) |
| bot/telegram | N/A | Zod | YES (middleware) | N/A |
| comfyui/* (3 routes) | YES | Zod | YES (middleware) | N/A |
| dhwani/audio | YES | Zod | YES (middleware) | N/A |
| rank/predict | YES | Zod | YES (middleware) | N/A |
| coins/award | YES | Zod | YES (middleware) | N/A |

### Still Vulnerable (from BACKEND_SECURITY_AUDIT.md)
| Route | Issue | Priority |
|-------|-------|----------|
| astra/generate | Unauthenticated LLM | P0 |
| mains/evaluate | Unauthenticated LLM + IDOR | P0 |
| test-ai | Public AI burn endpoint | P1 |
| scrape/run | Unauthenticated admin trigger | P1 |
| rank/predict | IDOR (user_id from body) | P1 |
| essay-colosseum/submit | IDOR (any user can submit) | P1 |
| essay-colosseum/accept | Anyone can accept any match | P1 |
| white-label/tenants | Mass assignment on POST | P1 |
| spatial/topics | Public data leak | P2 |

## 48+ routes total across the application
