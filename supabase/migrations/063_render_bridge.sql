-- Migration 063: Render Bridge — bake sweep log + mindmap render_status upgrade.
-- Sprint 4-4: tracks every nightly bake sweep run, and brings animated_mindmaps
-- into the same SceneSpec + render_status pattern as the other premium features.

-- ── bake_sweep_log ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bake_sweep_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sweep_started_at timestamptz NOT NULL DEFAULT now(),
  sweep_ended_at timestamptz,
  total_rows int DEFAULT 0,
  baked_count int DEFAULT 0,
  failed_count int DEFAULT 0,
  per_table jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bake_sweep_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_bake_sweep_log"
  ON bake_sweep_log FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── animated_mindmaps upgrade ───────────────────────────────────────────────
-- Brings mindmaps into parity with mnemonic/imagine/interview so the bake
-- bridge can process them uniformly.

ALTER TABLE animated_mindmaps
  ADD COLUMN IF NOT EXISTS scene_spec jsonb;

ALTER TABLE animated_mindmaps
  ADD COLUMN IF NOT EXISTS render_status text DEFAULT 'r3f_only';

ALTER TABLE animated_mindmaps
  ADD COLUMN IF NOT EXISTS comfy_prompt_id text;

ALTER TABLE animated_mindmaps
  ADD COLUMN IF NOT EXISTS comfy_video_url text;

-- Add CHECK constraint only if the column was just created (idempotent guard).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'animated_mindmaps_render_status_check'
      AND table_name = 'animated_mindmaps'
  ) THEN
    ALTER TABLE animated_mindmaps
      ADD CONSTRAINT animated_mindmaps_render_status_check
      CHECK (render_status IN ('r3f_only','queued','rendering','rendered','failed'));
  END IF;
END $$;

-- ── bakeable_rows view (for admin observability) ───────────────────────────

CREATE OR REPLACE VIEW bakeable_rows AS
  SELECT 'mnemonic_artifacts' AS source_table, id, render_status, scene_spec
  FROM mnemonic_artifacts WHERE render_status = 'r3f_only'
  UNION ALL
  SELECT 'imagine_videos', id, render_status, scene_specs AS scene_spec
  FROM imagine_videos WHERE render_status = 'r3f_only'
  UNION ALL
  SELECT 'interview_debriefs', id, render_status, scene_spec
  FROM interview_debriefs WHERE render_status = 'r3f_only'
  UNION ALL
  SELECT 'animated_mindmaps', id, render_status, scene_spec
  FROM animated_mindmaps WHERE render_status = 'r3f_only'
  UNION ALL
  SELECT 'concept_shorts', id, render_status, scene_spec
  FROM concept_shorts WHERE render_status = 'r3f_only'
  UNION ALL
  SELECT 'ca_video_newspapers', id, render_status, scene_specs AS scene_spec
  FROM ca_video_newspapers WHERE render_status = 'r3f_only';
