-- 048_hermes_observability.sql
-- Hermes 24/7 Worker Infrastructure (B2-2): job lifecycle, observability,
-- crawl-history audit trail, coach-message log, study recommendations.
--
-- Companion: 049_hermes_dispatch_helpers.sql (claim/complete/requeue funcs).

-- ──────────────────────────────────────────────────────────────────────────
-- 1) Extend agent_tasks with worker-aware columns + expand status enum
-- ──────────────────────────────────────────────────────────────────────────

ALTER TABLE agent_tasks
  ADD COLUMN IF NOT EXISTS started_at    timestamptz,
  ADD COLUMN IF NOT EXISTS retry_count   int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries   int NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS last_error    text,
  ADD COLUMN IF NOT EXISTS result        jsonb,
  ADD COLUMN IF NOT EXISTS priority      int NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS tenant_id     uuid REFERENCES white_label_tenants(id) ON DELETE CASCADE;

-- Tighten status check to include worker lifecycle states.
-- The original 010 migration had no CHECK on status; safe to add now.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'agent_tasks_status_check'
  ) THEN
    ALTER TABLE agent_tasks DROP CONSTRAINT agent_tasks_status_check;
  END IF;
END $$;

ALTER TABLE agent_tasks
  ADD CONSTRAINT agent_tasks_status_check
  CHECK (status IN ('queued','processing','completed','failed','retried','dead_letter'));

CREATE INDEX IF NOT EXISTS idx_agent_tasks_status_created
  ON agent_tasks (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent_status
  ON agent_tasks (agent_type, status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_scheduled
  ON agent_tasks (scheduled_for) WHERE scheduled_for IS NOT NULL;

-- ──────────────────────────────────────────────────────────────────────────
-- 2) Extend user_sessions with optional tenant_id
-- ──────────────────────────────────────────────────────────────────────────

ALTER TABLE user_sessions
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES white_label_tenants(id) ON DELETE SET NULL;

-- ──────────────────────────────────────────────────────────────────────────
-- 3) job_logs: append-only audit trail for every worker attempt
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_task_id   uuid REFERENCES agent_tasks(id) ON DELETE CASCADE,
  agent_type      text NOT NULL,
  status          text NOT NULL CHECK (status IN ('queued','processing','completed','failed','retried','dead_letter')),
  error_message   text,
  duration_ms     int,
  started_at      timestamptz,
  ended_at        timestamptz,
  result          jsonb,
  attempt         int NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_logs_task         ON job_logs (agent_task_id);
CREATE INDEX IF NOT EXISTS idx_job_logs_status_time  ON job_logs (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_logs_agent_status ON job_logs (agent_type, status);

ALTER TABLE job_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin select job_logs" ON job_logs;
CREATE POLICY "Admin select job_logs" ON job_logs FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "Admin insert job_logs" ON job_logs;
CREATE POLICY "Admin insert job_logs" ON job_logs FOR INSERT WITH CHECK (is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 4) crawl_history: per-source audit for the research sweep (B2-4 wires data)
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crawl_history (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id           text NOT NULL,
  source_name         text,
  total_articles      int  DEFAULT 0,
  articles_processed  int  DEFAULT 0,
  articles_errored    int  DEFAULT 0,
  crawled_at          timestamptz,
  duration_ms         int,
  last_error          text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crawl_history_source_time
  ON crawl_history (source_id, crawled_at DESC);

ALTER TABLE crawl_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin select crawl_history" ON crawl_history;
CREATE POLICY "Admin select crawl_history" ON crawl_history FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "Admin insert crawl_history" ON crawl_history;
CREATE POLICY "Admin insert crawl_history" ON crawl_history FOR INSERT WITH CHECK (is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 5) coach_messages: real coaching nudges produced by guide-agents
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS coach_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_type  text NOT NULL,
  message     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_messages_user_time
  ON coach_messages (user_id, created_at DESC);

ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users select own coach_messages" ON coach_messages;
CREATE POLICY "Users select own coach_messages" ON coach_messages FOR SELECT
  USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "Admin insert coach_messages" ON coach_messages;
CREATE POLICY "Admin insert coach_messages" ON coach_messages FOR INSERT WITH CHECK (is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 6) study_recommendations: planner output read by client UI
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS study_recommendations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id    uuid REFERENCES topics(id) ON DELETE SET NULL,
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_recommendations_user_time
  ON study_recommendations (user_id, created_at DESC);

ALTER TABLE study_recommendations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users select own study_recommendations" ON study_recommendations;
CREATE POLICY "Users select own study_recommendations" ON study_recommendations FOR SELECT
  USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "Admin insert study_recommendations" ON study_recommendations;
CREATE POLICY "Admin insert study_recommendations" ON study_recommendations FOR INSERT WITH CHECK (is_admin());
