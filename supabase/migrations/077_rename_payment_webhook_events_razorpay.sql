-- Sprint 7-D revision: India-only payment stack — drop Stripe, keep Razorpay.
-- Generalise the dedup table so it covers any payment provider; Razorpay sends
-- x-razorpay-event-id for replay detection (mirrors Stripe's event.id).

-- Rename + add provider column. The previous migration created
-- stripe_webhook_events; that table is empty in cloud (verified) so this is safe.
ALTER TABLE IF EXISTS stripe_webhook_events RENAME TO payment_webhook_events;

ALTER TABLE payment_webhook_events
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'razorpay';

ALTER TABLE payment_webhook_events
  ALTER COLUMN provider DROP DEFAULT;

ALTER INDEX IF EXISTS idx_stripe_webhook_events_processed
  RENAME TO idx_payment_webhook_events_processed;

DROP POLICY IF EXISTS stripe_webhook_events_admin_read ON payment_webhook_events;
DROP POLICY IF EXISTS payment_webhook_events_admin_read ON payment_webhook_events;
CREATE POLICY payment_webhook_events_admin_read ON payment_webhook_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
