-- 053: Weak-area auto-injection lifecycle
-- Adds expired_at lifecycle column, service-role INSERT/UPDATE policies on
-- user_weak_areas, and two SECURITY DEFINER RPCs that the daily-plan generator
-- and the Hermes worker use to (a) pick the top-3 freshly-detected weak areas
-- inside a 72h window and stamp auto_injected_at, and (b) garbage-collect
-- never-injected rows older than 72h.

-- ── Lifecycle column ──
ALTER TABLE user_weak_areas
  ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ NULL;

-- Index to keep the picker fast as rows accumulate.
CREATE INDEX IF NOT EXISTS idx_weak_areas_pick
  ON user_weak_areas (user_id, auto_injected_at, expired_at, detected_at DESC);

-- ── RLS policies (service-role only) ──
-- Service-role bypasses RLS entirely, so these policies are mostly defensive
-- documentation: they allow the planner role to write but block anon/auth.
DROP POLICY IF EXISTS "Service role insert weak areas" ON user_weak_areas;
CREATE POLICY "Service role insert weak areas" ON user_weak_areas
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role update weak areas" ON user_weak_areas;
CREATE POLICY "Service role update weak areas" ON user_weak_areas
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── RPC: inject_weak_areas_for_plan ──
-- Picks top-3 highest-severity weak areas detected in the last 72h that have
-- not yet been injected and not expired. Stamps auto_injected_at = now() on
-- the picked rows so they aren't re-picked tomorrow. Returns the picked rows.
CREATE OR REPLACE FUNCTION inject_weak_areas_for_plan(
  p_user_id UUID,
  p_plan_date DATE
)
RETURNS TABLE (
  topic_id UUID,
  gap_type TEXT,
  severity INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- p_plan_date is accepted for audit/log clarity; the eligibility window is
  -- always anchored to NOW() so back-dated planning doesn't reanimate stale
  -- weaknesses.
  PERFORM p_plan_date;

  RETURN QUERY
  WITH picked AS (
    SELECT w.id
    FROM user_weak_areas w
    WHERE w.user_id = p_user_id
      AND w.auto_injected_at IS NULL
      AND w.expired_at IS NULL
      AND w.detected_at >= NOW() - INTERVAL '72 hours'
    ORDER BY w.severity DESC NULLS LAST, w.detected_at DESC
    LIMIT 3
  ),
  updated AS (
    UPDATE user_weak_areas w
    SET auto_injected_at = NOW()
    WHERE w.id IN (SELECT id FROM picked)
    RETURNING w.topic_id, w.gap_type, w.severity
  )
  SELECT u.topic_id, u.gap_type, u.severity
  FROM updated u
  ORDER BY u.severity DESC NULLS LAST;
END;
$$;

-- ── RPC: expire_stale_weak_areas ──
-- Sets expired_at on weak areas that were never injected and are older than
-- 72h. Returns the count of expired rows for observability.
CREATE OR REPLACE FUNCTION expire_stale_weak_areas()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE user_weak_areas
    SET expired_at = NOW()
    WHERE auto_injected_at IS NULL
      AND expired_at IS NULL
      AND detected_at < NOW() - INTERVAL '72 hours'
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM expired;

  RETURN v_count;
END;
$$;

-- ── Grants ──
REVOKE ALL ON FUNCTION inject_weak_areas_for_plan(UUID, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION inject_weak_areas_for_plan(UUID, DATE) FROM anon;
GRANT EXECUTE ON FUNCTION inject_weak_areas_for_plan(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION inject_weak_areas_for_plan(UUID, DATE) TO service_role;

REVOKE ALL ON FUNCTION expire_stale_weak_areas() FROM PUBLIC;
REVOKE ALL ON FUNCTION expire_stale_weak_areas() FROM anon;
GRANT EXECUTE ON FUNCTION expire_stale_weak_areas() TO authenticated;
GRANT EXECUTE ON FUNCTION expire_stale_weak_areas() TO service_role;
