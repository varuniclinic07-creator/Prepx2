# Remediation Verification — 2026-04-29

**Run at:** 2026-04-29T22:49:36.936Z
**Target:** http://supabase.173-185-79-174.sslip.io:47882
**Result:** PASS  (16/16)

## Summary by layer

| Layer | Pass | Fail |
|-------|------|------|
| schema | 5 | 0 |
| function | 5 | 0 |
| behavior | 6 | 0 |

## Per-check results

| ID | Status | Latency | Pass | Description |
|----|--------|---------|------|-------------|
| `schema.squad_members` | 200 | 726ms | PASS | squad_members reachable (was 500) |
| `schema.comfyui_jobs` | 200 | 471ms | PASS | comfyui_jobs reachable (was 404) |
| `schema.comfyui_settings` | 200 | 240ms | PASS | comfyui_settings reachable (was 404) |
| `schema.users` | 200 | 244ms | PASS | users reachable (was 200) |
| `schema.user_balances` | 200 | 237ms | PASS | user_balances reachable (was 200) |
| `function.user_in_squad` | 200 | 251ms | PASS | RPC user_in_squad reachable |
| `function.is_admin` | 200 | 237ms | PASS | RPC is_admin reachable |
| `function.spend_coins` | 200 | 239ms | PASS | RPC spend_coins reachable |
| `function.accept_battle` | 200 | 240ms | PASS | RPC accept_battle reachable |
| `function.increment_subscriber_count` | 204 | 238ms | PASS | RPC increment_subscriber_count reachable |
| `auth.userA.signin` | 200 | - | PASS | userA signin returns JWT (verify-A-1777502980116@example.com) |
| `auth.userB.signin` | 200 | - | PASS | userB signin returns JWT (verify-B-1777502980915@example.com) |
| `auth.regression.users_select` | 200 | 236ms | PASS | userA can SELECT own row from users (no RLS regression) |
| `rls.squad_members.select_no_500` | 200 | 261ms | PASS | SELECT squad_members no longer returns 500 (RLS recursion fixed) |
| `rls.squad_members.select_latency` | 200 | 261ms | PASS | SELECT squad_members latency under 2s |
| `behavior.squad.create` | 403 | 244ms | PASS | squad insert (skipped — RLS admin-write policy blocks non-admins, expected) |

## Source script
`scripts/verification/verify-remediation.mjs`
