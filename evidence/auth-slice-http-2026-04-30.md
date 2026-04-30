# Auth slice — HTTP layer — 2026-04-30

**Run at:** 2026-04-30T22:52:04.712Z
**Target:** https://vbddpwxbijwuarmrexme.supabase.co
**Result:** PASS  (11/11)

## Behaviors covered
- B1 signup + confirm + signin
- B2 own-row SELECT
- B3 cross-user RLS isolation
- B6a refresh issues new JWT
- B6b invalid token denied
- (B4 SSR reload + B5 multi-tab logout deferred to Playwright)

| ID | Status | Latency | Pass | Description |
|----|--------|---------|------|-------------|
| `b1.userA.admin_create` | 200 | - | PASS | admin API creates and confirms userA |
| `b1.userB.admin_create` | 200 | - | PASS | admin API creates and confirms userB |
| `b1.userA.signin` | 200 | - | PASS | userA password signin returns JWT + refresh |
| `b1.userB.signin` | 200 | - | PASS | userB password signin returns JWT + refresh |
| `b1.userA.users_row_present` | 200 | 307ms | PASS | public.users row exists for userA after signup (handle_new_user trigger) |
| `b2.userA.read_own` | 200 | 605ms | PASS | userA SELECTs own users row (RLS allow) |
| `b3.userA.read_userB_denied` | 200 | 214ms | PASS | userA SELECT of userB row returns empty (RLS deny) |
| `b6a.refresh_grants_new_jwt` | 200 | 217ms | PASS | POST /token?grant_type=refresh_token returns a NEW access token |
| `b6a.new_jwt_authenticates` | 200 | 206ms | PASS | new access token authenticates a PostgREST request |
| `b6b.invalid_refresh_denied` | 400 | 210ms | PASS | invalid refresh token returns 4xx (no infinite-refresh path) |
| `b6b.invalid_access_denied` | 401 | 200ms | PASS | invalid access token on PostgREST returns 401 |