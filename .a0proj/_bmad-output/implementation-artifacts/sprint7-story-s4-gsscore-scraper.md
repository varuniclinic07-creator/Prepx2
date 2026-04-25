---
story: S4
epic: 30 — Content Coverage Expansion
sprint: 7
priority: P1
effort: 1.5 dev-days (3 story points)
dependencies: None
---

# Story S4: GSScore Source + Scraper Hardening

## Scope
- [x] In Scope: New source config, exponential backoff, Cloudflare CAPTCHA handling
- [ ] Out of Scope: Proxy rotation, distributed scraping, legal compliance review

## Tasks
- [x] **S4.1** Add `gsscore.in` to scraper config in `lib/scraper/config.ts`
- [x] **S4.2** Exponential backoff retry in `lib/scraper/engine.ts`
- [x] **S4.3** Cloudflare CAPTCHA graceful handling (skip + log)

## Acceptance Criteria
- [x] GSScore pages return structured content on success
- [x] Failed requests retry with exponential backoff (1s → 2s → 4s → 8s)
- [x] CAPTCHA pages are logged and skipped, not crashed
- [x] No regression in existing scraper sources

## Definition of Done
- [x] Scraper config includes gsscore with correct selectors
- [x] Retry logic has unit test verifying backoff delays
- [x] CAPTCHA pages return null gracefully
