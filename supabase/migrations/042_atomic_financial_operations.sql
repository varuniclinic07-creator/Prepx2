-- 042: Atomic Financial Operations
-- Fixes race conditions in coin spending, ISA payments, battle acceptance, tutor subscriptions

-- Unique constraint: prevent duplicate ISA milestone payments
ALTER TABLE isa_payments ADD CONSTRAINT uq_isa_payments_contract_milestone UNIQUE (contract_id, milestone);

-- Unique constraint: prevent duplicate tutor subscriptions (active only)
CREATE UNIQUE INDEX uq_tutor_sub_active ON tutor_subscriptions (user_id, tutor_id) WHERE status = 'active';

-- Atomic coin spend function: deducts only if balance >= amount, returns new balance or -1
CREATE OR REPLACE FUNCTION spend_coins(
  p_user_id uuid,
  p_amount int,
  p_reason text
) RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  v_current int;
  v_new int;
BEGIN
  IF p_amount <= 0 THEN RETURN -1; END IF;

  -- Lock the row to prevent concurrent reads
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

-- Atomic battle accept: sets status to active only if currently pending, returns true/false
CREATE OR REPLACE FUNCTION accept_battle(
  p_battle_id uuid,
  p_user_id uuid,
  p_wager int
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_battle record;
  v_spend_result int;
BEGIN
  -- Lock the battle row
  SELECT * INTO v_battle
    FROM streak_battles
    WHERE id = p_battle_id
    FOR UPDATE;

  IF NOT FOUND THEN RETURN false; END IF;
  IF v_battle.status <> 'pending' THEN RETURN false; END IF;
  IF v_battle.initiator_id = p_user_id THEN RETURN false; END IF;

  -- Atomic coin spend
  v_spend_result := spend_coins(p_user_id, p_wager, 'battle_wager_accept');
  IF v_spend_result < 0 THEN RETURN false; END IF;

  -- Insert participant
  INSERT INTO battle_participants (battle_id, user_id, current_streak, best_streak)
    VALUES (p_battle_id, p_user_id, 0, 0);

  -- Activate battle
  UPDATE streak_battles
    SET status = 'active', created_at = now()
    WHERE id = p_battle_id;

  RETURN true;
END;
$$;

-- Atomic tutor subscriber count increment
CREATE OR REPLACE FUNCTION increment_subscriber_count(p_tutor_id uuid)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE ai_tutors SET subscriber_count = subscriber_count + 1 WHERE id = p_tutor_id;
$$;
