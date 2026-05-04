-- Sprint 7-D: atomic award_coins RPC + Stripe webhook event dedup table.
-- Mirrors the existing spend_coins RPC: single transaction, insert
-- coin_transactions (UNIQUE on user_id+idempotency_key catches replays)
-- and update user_balances together.

CREATE OR REPLACE FUNCTION award_coins(
  p_user_id         uuid,
  p_amount          int,
  p_reason          text,
  p_idempotency_key text
) RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_id uuid;
  v_new_balance int;
BEGIN
  IF p_amount <= 0 THEN RETURN -1; END IF;

  SELECT id INTO v_existing_id
    FROM coin_transactions
    WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    SELECT coins INTO v_new_balance
      FROM user_balances WHERE user_id = p_user_id;
    RETURN COALESCE(v_new_balance, 0);
  END IF;

  INSERT INTO coin_transactions (user_id, amount, reason, idempotency_key)
    VALUES (p_user_id, p_amount, p_reason, p_idempotency_key);

  INSERT INTO user_balances (user_id, coins, lifetime_earned)
    VALUES (p_user_id, p_amount, p_amount)
    ON CONFLICT (user_id) DO UPDATE
      SET coins          = user_balances.coins + EXCLUDED.coins,
          lifetime_earned = user_balances.lifetime_earned + EXCLUDED.lifetime_earned,
          updated_at      = now()
    RETURNING coins INTO v_new_balance;

  RETURN v_new_balance;
END;
$$;

-- Stripe event dedup. We persist every processed event id so a webhook
-- replayed by Stripe (or by an attacker with a captured payload) is a no-op
-- after the first processing. Bounded by the unique index on event_id.
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id   TEXT PRIMARY KEY,
  type       TEXT NOT NULL,
  user_id    UUID,
  payload    JSONB,
  processed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed
  ON stripe_webhook_events (processed_at DESC);

ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stripe_webhook_events_admin_read ON stripe_webhook_events;
CREATE POLICY stripe_webhook_events_admin_read ON stripe_webhook_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
