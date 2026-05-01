-- 049_hermes_dispatch_helpers.sql
-- Atomic SQL helpers for the BullMQ workers (B2-2):
--   * claim_next_agent_task — row-level FOR UPDATE SKIP LOCKED claim
--   * complete_agent_task   — terminal flip + job_logs append
--   * requeue_failed_task   — retry_count math + dead_letter promotion
--
-- All three are SECURITY DEFINER and pinned to (public, pg_catalog).
-- Only the service_role may EXECUTE; anon/authenticated cannot.

-- ──────────────────────────────────────────────────────────────────────────
-- claim_next_agent_task
-- ──────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.claim_next_agent_task(
  p_agent_type text,
  p_worker_id  text
)
RETURNS agent_tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_row agent_tasks;
BEGIN
  -- Atomic claim: pick the oldest queued task of this agent_type whose
  -- scheduled_for is null OR already in the past, lock it, flip status.
  WITH locked AS (
    SELECT id
    FROM agent_tasks
    WHERE agent_type = p_agent_type
      AND status = 'queued'
      AND (scheduled_for IS NULL OR scheduled_for <= now())
    ORDER BY priority ASC, created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE agent_tasks t
     SET status     = 'processing',
         started_at = now()
    FROM locked
   WHERE t.id = locked.id
   RETURNING t.* INTO v_row;

  IF v_row.id IS NOT NULL THEN
    INSERT INTO job_logs (agent_task_id, agent_type, status, started_at, attempt)
    VALUES (v_row.id, v_row.agent_type, 'processing', now(), v_row.retry_count + 1);
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_next_agent_task(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_next_agent_task(text, text) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.claim_next_agent_task(text, text) TO service_role;

-- ──────────────────────────────────────────────────────────────────────────
-- complete_agent_task
-- ──────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.complete_agent_task(
  p_task_id uuid,
  p_status  text,
  p_result  jsonb,
  p_error   text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_started   timestamptz;
  v_attempt   int;
  v_agent     text;
  v_duration  int;
BEGIN
  IF p_status NOT IN ('completed','failed','retried','dead_letter') THEN
    RAISE EXCEPTION 'invalid terminal status: %', p_status;
  END IF;

  UPDATE agent_tasks
     SET status       = p_status,
         result       = COALESCE(p_result, result),
         last_error   = p_error,
         completed_at = CASE WHEN p_status IN ('completed','dead_letter')
                             THEN now() ELSE completed_at END
   WHERE id = p_task_id
   RETURNING started_at, retry_count + 1, agent_type
        INTO v_started,  v_attempt,        v_agent;

  IF v_started IS NOT NULL THEN
    v_duration := GREATEST(0, EXTRACT(EPOCH FROM (now() - v_started))::int * 1000);
  END IF;

  INSERT INTO job_logs (
    agent_task_id, agent_type, status, error_message,
    duration_ms, started_at, ended_at, result, attempt
  ) VALUES (
    p_task_id, v_agent, p_status, p_error,
    v_duration, v_started, now(), p_result, COALESCE(v_attempt, 1)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_agent_task(uuid, text, jsonb, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.complete_agent_task(uuid, text, jsonb, text) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.complete_agent_task(uuid, text, jsonb, text) TO service_role;

-- ──────────────────────────────────────────────────────────────────────────
-- requeue_failed_task
-- ──────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.requeue_failed_task(p_task_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_retry int;
  v_max   int;
  v_agent text;
  v_next  text;
BEGIN
  SELECT retry_count, max_retries, agent_type
    INTO v_retry, v_max, v_agent
    FROM agent_tasks
   WHERE id = p_task_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'agent_task % not found', p_task_id;
  END IF;

  IF v_retry + 1 < v_max THEN
    v_next := 'queued';
    UPDATE agent_tasks
       SET status      = 'queued',
           retry_count = v_retry + 1,
           started_at  = NULL
     WHERE id = p_task_id;
  ELSE
    v_next := 'dead_letter';
    UPDATE agent_tasks
       SET status      = 'dead_letter',
           retry_count = v_retry + 1,
           completed_at = now()
     WHERE id = p_task_id;
  END IF;

  INSERT INTO job_logs (agent_task_id, agent_type, status, attempt)
  VALUES (p_task_id, v_agent, v_next, v_retry + 1);

  RETURN v_next;
END;
$$;

REVOKE ALL ON FUNCTION public.requeue_failed_task(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.requeue_failed_task(uuid) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.requeue_failed_task(uuid) TO service_role;
