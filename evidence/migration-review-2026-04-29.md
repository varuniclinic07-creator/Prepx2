# Migration Review — 2026-04-29

**Goal:** User reported "I migrated 1 file, the rest showed errors, so I stopped." Audit all 44 migration files against the live Supabase DB to separate real bugs from agent hallucinations, and propose minimal fixes.

**Method:**
- Compared file-defined tables vs `evidence/supabase-table-inventory.json` (live probe of every CREATE TABLE name)
- Read each flagged migration directly. Ignored agent claims that contradicted observed live DB state.

---

## TL;DR

The user's "everything errored" was almost certainly a **client-side issue** (psql connection, SQL editor session, or migration runner config), **not** a sequence of broken migration files. Live evidence:

- **38 of 41 migration-defined tables exist on the live DB.** Only migrations that didn't run: **041 (ComfyUI)**, **042 (atomic financial functions)**, **043 (RLS tightening)**.
- **Most files are clean and applied successfully.** One real schema bug in `099` causes the `squad_members` 500 error.
- **One real correctness bug in `042`** (overwrites `created_at`).

So the migration run was largely successful; only the last 3 files (041, 042, 043) need to be applied, and one fix is needed in `099`.

---

## What's actually applied vs missing

Source: `evidence/supabase-table-inventory.json`

| State | Tables |
|-------|--------|
| Present (38) | All tables from migrations 001–040 except ComfyUI |
| Missing (2) | `comfyui_jobs`, `comfyui_settings` (migration 041) |
| 500 error (1) | `squad_members` — table exists, RLS policy in 099 is broken |

There is **no evidence** migrations 001–040 failed broadly. The agent's earlier claim that "33 files would fail because pgcrypto is not enabled" is **wrong** — those 33 files all use `gen_random_uuid()` and they obviously ran (their tables exist). Self-hosted Supabase enables `pgcrypto` by default in the `extensions` schema.

---

## Real issues found (verified)

### 1. `099_policies_indexes_functions.sql` lines 250–256 — squad_members RLS recursion (P0)

**File:**
```sql
ALTER TABLE squad_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Squad members read own" ON squad_members FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM squad_members sm
    WHERE sm.squad_id = squad_members.squad_id AND sm.user_id = auth.uid()
  )
);
```

**Bug:** Policy on `squad_members` queries `squad_members`. PostgreSQL detects infinite recursion in the policy and the request returns 500 (`ERROR: infinite recursion detected in policy for relation "squad_members"`). This matches the live behavior we observed.

**Fix:** Use `SECURITY DEFINER` helper or break the recursion. Minimal patch:

```sql
DROP POLICY IF EXISTS "Squad members read own" ON squad_members;

CREATE OR REPLACE FUNCTION user_in_squad(p_squad_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM squad_members
    WHERE squad_id = p_squad_id AND user_id = auth.uid()
  );
$$;

CREATE POLICY "Squad members read own" ON squad_members FOR SELECT USING (
  user_id = auth.uid() OR user_in_squad(squad_id)
);
```

`SECURITY DEFINER` makes the inner query bypass RLS, so no recursion.

### 2. `042_atomic_financial_operations.sql` line 80 — overwrites created_at (P2)

```sql
UPDATE streak_battles SET status = 'active', created_at = now() WHERE id = p_battle_id;
```

`created_at` should not be overwritten on activation. Either drop that update, or use a `started_at` column.

**Fix:**
```sql
UPDATE streak_battles SET status = 'active' WHERE id = p_battle_id;
```
(Simplest. If you want to track when the battle started, add `started_at TIMESTAMPTZ` and update that instead — but that's a separate change.)

### 3. Migrations 041, 042, 043 — never applied

- 041 (ComfyUI tables): both tables missing. Apply if ComfyUI is in scope; else skip.
- 042 (atomic spend/accept functions): the app code in `lib/coins.ts` and battle endpoints likely already calls `spend_coins(...)`. Without 042 those RPC calls fail.
- 043 (tightened RLS for daily_dhwani / battle_royale_events / territory_ownership / isa_payments / astra_scripts / white_label_tenants): without it, those tables either have over-permissive `USING(true)` policies or no policies at all.

**Action:** apply 042 (with the line-80 fix) and 043 in order. 041 only if ComfyUI is needed for MVP.

---

## Agent claims that are NOT real bugs

These were flagged in an earlier audit. I verified each against the actual file or live DB and they are wrong:

| Claimed bug | Reality |
|-------------|---------|
| `pgcrypto` not enabled → all 33 files using `gen_random_uuid()` will fail | False. 38/41 tables exist. Self-hosted Supabase enables pgcrypto by default. |
| `041_comfyui_settings.sql` line 80 `ON CONFLICT DO NOTHING` is invalid syntax | False. `ON CONFLICT DO NOTHING` without a target is valid Postgres. |
| Migrations 001 only enables vector, missing other extensions | True statement, but harmless — Supabase ships with the extensions the app uses. |
| Wide failure across 001–040 | False. Live DB proves these ran. |

---

## Recommended action sequence

Run these against the live DB (in order, in a single session). Stop on first error and report.

```sql
-- Step 1: fix squad_members RLS recursion
DROP POLICY IF EXISTS "Squad members read own" ON squad_members;

CREATE OR REPLACE FUNCTION user_in_squad(p_squad_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM squad_members
    WHERE squad_id = p_squad_id AND user_id = auth.uid()
  );
$$;

CREATE POLICY "Squad members read own" ON squad_members FOR SELECT USING (
  user_id = auth.uid() OR user_in_squad(squad_id)
);

-- Step 2: apply 042 (with created_at fix)
-- Open supabase/migrations/042_atomic_financial_operations.sql
-- Edit line 80: remove ", created_at = now()"
-- Then run the whole file.

-- Step 3: apply 043
-- Run supabase/migrations/043_tighten_rls_policies.sql verbatim.

-- Step 4 (optional): apply 041 if ComfyUI is in MVP scope
-- Run supabase/migrations/041_comfyui_settings.sql verbatim.
```

Verify with:
```bash
node --env-file=.env.local scripts/verification/list-supabase-tables.mjs
```

Expected after Step 1: `squad_members` flips from `status-500` to `exists`.
Expected after Step 4: `comfyui_jobs` and `comfyui_settings` flip from `MISSING` to `exists`.

---

## What I did NOT do

- Did not run any DDL against the live DB. All changes above are proposals for the user to execute and verify.
- Did not audit every line of every file — focused on the ones flagged plus the ones the live DB tells us didn't apply.
- Did not modify any migration file. The fix to line 80 of 042 is described, not committed.

---

**Status of migration review: COMPLETE.** The substrate is in better shape than the user feared. Three concrete fixes will get to a fully migrated DB.
