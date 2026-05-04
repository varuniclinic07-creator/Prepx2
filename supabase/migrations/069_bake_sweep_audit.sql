-- Sprint 6 S6-1: per-row bake audit + comfyui_settings RLS hardening.

CREATE TABLE IF NOT EXISTS bake_sweep_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sweep_id uuid REFERENCES bake_sweep_log(id) ON DELETE SET NULL,
  source_table text NOT NULL,
  row_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('rendered','failed','skipped')),
  error_message text,
  prompt_id text,
  storage_path text,
  video_url text,
  duration_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bake_sweep_jobs_sweep ON bake_sweep_jobs(sweep_id);
CREATE INDEX IF NOT EXISTS idx_bake_sweep_jobs_status_created ON bake_sweep_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bake_sweep_jobs_source_row ON bake_sweep_jobs(source_table, row_id);

ALTER TABLE bake_sweep_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_bake_sweep_jobs ON bake_sweep_jobs;
CREATE POLICY admin_bake_sweep_jobs ON bake_sweep_jobs FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- Harden comfyui_settings (was missing RLS per sprint-3 advisor warnings).
ALTER TABLE comfyui_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_comfyui_settings ON comfyui_settings;
CREATE POLICY admin_comfyui_settings ON comfyui_settings FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- Same for comfyui_jobs (also flagged by advisor).
ALTER TABLE comfyui_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_comfyui_jobs ON comfyui_jobs;
CREATE POLICY admin_comfyui_jobs ON comfyui_jobs FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
