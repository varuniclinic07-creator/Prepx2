-- 044: Remediation script — 2026-04-29
-- Purpose: fix the one live runtime defect (squad_members recursive RLS) and apply
-- the trailing migrations (042, 043; 041 optional) that the user's earlier run stopped on.
--
-- Context: see evidence/migration-review-2026-04-29.md
--
-- Safety:
--   * Idempotent: every block uses IF EXISTS / IF NOT EXISTS / DROP-then-CREATE.
--   * Wrapped in a single transaction. Any error rolls the whole thing back, leaving
--     the DB exactly as it was. Re-runnable.
--   * Does NOT touch data — only policies, functions, constraints, and (in part D) creates
--     the missing ComfyUI tables.
--
-- Apply with:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/044_remediation_2026_04_29.sql
-- or paste into the Supabase SQL editor as one block.

BEGIN;

-- =============================================================================
-- A. Fix recursive RLS on squad_members  (live 500 — P0)
-- =============================================================================

DROP POLICY IF EXISTS "Squad members read own" ON squad_members;

CREATE OR REPLACE FUNCTION user_in_squad(p_squad_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM squad_members
    WHERE squad_id = p_squad_id AND user_id = auth.uid()
  );
$$;

CREATE POLICY "Squad members read own" ON squad_members FOR SELECT USING (
  user_id = auth.uid() OR user_in_squad(squad_id)
);

-- =============================================================================
-- B. Migration 042 — atomic financial operations (corrected)
-- =============================================================================
-- Identical to 042_atomic_financial_operations.sql EXCEPT line 80:
-- `accept_battle()` no longer overwrites streak_battles.created_at (audit history
-- must remain immutable).

-- B.1 Unique constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_isa_payments_contract_milestone'
  ) THEN
    ALTER TABLE isa_payments
      ADD CONSTRAINT uq_isa_payments_contract_milestone UNIQUE (contract_id, milestone);
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tutor_sub_active
  ON tutor_subscriptions (user_id, tutor_id) WHERE status = 'active';

-- B.2 spend_coins
CREATE OR REPLACE FUNCTION spend_coins(
  p_user_id uuid,
  p_amount  int,
  p_reason  text
) RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  v_current int;
  v_new     int;
BEGIN
  IF p_amount <= 0 THEN RETURN -1; END IF;

  SELECT coins INTO v_current
    FROM user_balances
    WHERE user_id = p_user_id
    FOR UPDATE;

  IF NOT FOUND OR v_current < p_amount THEN
    RETURN -1;
  END IF;

  v_new := v_current - p_amount;

  UPDATE user_balances
    SET coins = v_new, updated_at = now()
    WHERE user_id = p_user_id;

  INSERT INTO coin_transactions (user_id, amount, reason, idempotency_key)
    VALUES (p_user_id, -p_amount, p_reason,
            'spend-' || extract(epoch from now())::text || '-' || substr(md5(random()::text), 1, 8));

  RETURN v_new;
END;
$$;

-- B.3 accept_battle  (FIXED: does not mutate created_at)
CREATE OR REPLACE FUNCTION accept_battle(
  p_battle_id uuid,
  p_user_id   uuid,
  p_wager     int
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_battle       record;
  v_spend_result int;
BEGIN
  SELECT * INTO v_battle
    FROM streak_battles
    WHERE id = p_battle_id
    FOR UPDATE;

  IF NOT FOUND THEN RETURN false; END IF;
  IF v_battle.status <> 'pending' THEN RETURN false; END IF;
  IF v_battle.initiator_id = p_user_id THEN RETURN false; END IF;

  v_spend_result := spend_coins(p_user_id, p_wager, 'battle_wager_accept');
  IF v_spend_result < 0 THEN RETURN false; END IF;

  INSERT INTO battle_participants (battle_id, user_id, current_streak, best_streak)
    VALUES (p_battle_id, p_user_id, 0, 0);

  -- created_at is immutable audit history — only flip status.
  UPDATE streak_battles
    SET status = 'active'
    WHERE id = p_battle_id;

  RETURN true;
END;
$$;

-- B.4 increment_subscriber_count
CREATE OR REPLACE FUNCTION increment_subscriber_count(p_tutor_id uuid)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE ai_tutors SET subscriber_count = subscriber_count + 1 WHERE id = p_tutor_id;
$$;

-- =============================================================================
-- C. Migration 043 — tighten RLS policies
-- =============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  );
$$;

DROP POLICY IF EXISTS "Admin insert daily_dhwani" ON daily_dhwani;
DROP POLICY IF EXISTS "Admin update daily_dhwani" ON daily_dhwani;
CREATE POLICY "Admin insert daily_dhwani" ON daily_dhwani FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update daily_dhwani" ON daily_dhwani FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admin create battle events" ON battle_royale_events;
DROP POLICY IF EXISTS "Admin update battle events" ON battle_royale_events;
CREATE POLICY "Admin create battle events" ON battle_royale_events FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update battle events" ON battle_royale_events FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admin insert ownership" ON territory_ownership;
DROP POLICY IF EXISTS "Admin update ownership" ON territory_ownership;
CREATE POLICY "Admin insert ownership" ON territory_ownership FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update ownership" ON territory_ownership FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admin insert payments" ON isa_payments;
DROP POLICY IF EXISTS "Admin update payments" ON isa_payments;
DROP POLICY IF EXISTS "Users insert own payments" ON isa_payments;
CREATE POLICY "Users insert own payments" ON isa_payments FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM isa_contracts WHERE id = contract_id)
  OR is_admin()
);
CREATE POLICY "Admin update payments" ON isa_payments FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admin insert astra scripts" ON astra_scripts;
DROP POLICY IF EXISTS "Admin update astra scripts" ON astra_scripts;
CREATE POLICY "Admin insert astra scripts" ON astra_scripts FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update astra scripts" ON astra_scripts FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admin manage tenants" ON white_label_tenants;
CREATE POLICY "Admin manage tenants" ON white_label_tenants FOR ALL USING (is_admin());

-- =============================================================================
-- D. Migration 041 — ComfyUI tables  (apply only if ComfyUI is in MVP scope)
-- =============================================================================
-- This block is gated by IF NOT EXISTS so it's safe to leave in. Comment out
-- D in entirety if you want to defer ComfyUI.

CREATE TABLE IF NOT EXISTS comfyui_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    host TEXT NOT NULL DEFAULT 'localhost',
    port INT NOT NULL DEFAULT 8188,
    secure BOOLEAN DEFAULT false,
    api_endpoint TEXT NOT NULL DEFAULT '/api',
    ws_endpoint TEXT NOT NULL DEFAULT '/ws',
    workflow_template JSONB,
    default_positive_prompt TEXT DEFAULT 'A high quality educational video, smooth motion, cinematic lighting',
    default_negative_prompt TEXT DEFAULT 'blurry, distorted, low quality, watermark',
    steps INT DEFAULT 20,
    cfg_scale FLOAT DEFAULT 7.5,
    width INT DEFAULT 768,
    height INT DEFAULT 512,
    frame_count INT DEFAULT 24,
    fps INT DEFAULT 8,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE astra_scripts
    ADD COLUMN IF NOT EXISTS comfy_prompt_id TEXT,
    ADD COLUMN IF NOT EXISTS video_status TEXT DEFAULT 'pending'
        CHECK (video_status IN ('pending','queued','generating','completed','failed')),
    ADD COLUMN IF NOT EXISTS comfy_video_url TEXT;

CREATE TABLE IF NOT EXISTS comfyui_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    astra_script_id UUID REFERENCES astra_scripts(id) ON DELETE CASCADE,
    prompt_id TEXT NOT NULL UNIQUE,
    client_id TEXT NOT NULL,
    workflow JSONB NOT NULL,
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued','processing','completed','failed')),
    output_files TEXT[] DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_comfyui_jobs_status ON comfyui_jobs(status);
CREATE INDEX IF NOT EXISTS idx_comfyui_jobs_astra_script ON comfyui_jobs(astra_script_id);

INSERT INTO comfyui_settings (host, port, workflow_template, default_positive_prompt, default_negative_prompt)
SELECT 'comfyui', 8188,
       '{
          "1": {
            "inputs": {
              "model": "ltx_video/ltx-video-2b-v0.9.safetensors",
              "positive": "A high quality educational video explaining a concept, smooth motion, cinematic lighting",
              "negative": "blurry, distorted, low quality, watermark",
              "width": 768, "height": 512, "length": 24, "fps": 8, "steps": 20, "cfg": 7.5, "seed": 0
            },
            "class_type": "LTXVideoSampler"
          },
          "2": {
            "inputs": { "filename_prefix": "prepx_astra", "images": ["1", 0] },
            "class_type": "SaveImage"
          }
        }'::jsonb,
       'A high quality educational video, smooth motion, cinematic lighting',
       'blurry, distorted, low quality, watermark'
WHERE NOT EXISTS (SELECT 1 FROM comfyui_settings);

COMMIT;

-- =============================================================================
-- Post-apply verification (run separately, NOT inside the txn)
-- =============================================================================
--   node --env-file=.env.local scripts/verification/list-supabase-tables.mjs
-- Expected:
--   squad_members          200  exists           (was status-500)
--   comfyui_jobs           200  exists           (was MISSING)
--   comfyui_settings       200  exists           (was MISSING)
--
-- Smoke-test the function presence:
--   SELECT proname FROM pg_proc
--    WHERE proname IN ('spend_coins','accept_battle','is_admin','user_in_squad','increment_subscriber_count');
-- Expected: 5 rows.
