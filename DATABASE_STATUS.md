# DATABASE_STATUS.md

**Last Updated:** 2026-04-29T04:55:00Z

---

## Migration Status

| Migration | Name | Status |
|-----------|------|--------|
| 001-041 | Core schema (users through comfyui_settings) | DEPLOYED (committed) |
| 042 | atomic_financial_operations (`spend_coins`, `accept_battle` functions) | UNCOMMITTED — needs deployment |
| 043 | tighten_rls_policies (`is_admin()` function, restrictive INSERT policies) | UNCOMMITTED — needs deployment |
| 099 | policies_indexes_functions (master RLS + indexes) | DEPLOYED (committed) |

## Tables (41 total)
Core: users, topics, quizzes, daily_plans, quiz_attempts, user_weak_areas
Sessions: activity_log, user_sessions, agent_tasks
Community: squads, squad_members, user_cohorts
Subscriptions: subscriptions, feature_flags, nudge_log
Assessments: mains_attempts, user_notifications, user_balances, coin_transactions, user_predictions
Battles: streak_battles, battle_participants, battle_royale_events, battle_royale_participants, daily_dhwani
External: user_telegrams, astra_scripts
Essay/Territory: essay_colosseum_matches, essay_colosseum_submissions, user_office_ranks, districts, district_topics, territory_ownership, territory_wars
Finance/Tutors: isa_contracts, isa_payments, ai_tutors, tutor_subscriptions
White-Label: white_label_tenants
ComfyUI: comfyui_settings

## PostgreSQL Functions (from migration 042)
- `spend_coins(p_user_id, p_amount, p_reason)` — Atomic coin deduction with balance check
- `accept_battle(p_battle_id, p_user_id, p_wager)` — Atomic battle acceptance with coin lock

## Pending: Deploy migrations 042 + 043 to Supabase
