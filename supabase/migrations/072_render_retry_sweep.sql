-- Sprint 6 S6-4: classroom-lecture render retry sweep.
-- Adds retry tracking on video_render_jobs and a per-attempt audit table.

ALTER TABLE video_render_jobs
  ADD COLUMN IF NOT EXISTS retry_until timestamptz,
  ADD COLUMN IF NOT EXISTS last_attempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS retry_count int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_video_render_jobs_retry
  ON video_render_jobs(status, retry_until)
  WHERE status = 'failed';

-- Per-attempt history so admins can see what went wrong on attempt N before
-- the row was rewritten by attempt N+1.
CREATE TABLE IF NOT EXISTS video_render_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  render_job_id uuid REFERENCES video_render_jobs(id) ON DELETE CASCADE,
  attempt int NOT NULL,
  status text NOT NULL CHECK (status IN ('queued','running','succeeded','failed','cancelled')),
  comfy_prompt_id text,
  storage_path text,
  duration_ms int,
  error_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_render_attempts_job
  ON video_render_attempts(render_job_id, attempt DESC);

ALTER TABLE video_render_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_video_render_attempts ON video_render_attempts;
CREATE POLICY admin_video_render_attempts ON video_render_attempts FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
