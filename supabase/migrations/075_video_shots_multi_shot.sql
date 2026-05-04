-- Sprint 7-C: multi-shot video pipeline.
-- One row per shot in a lecture (title / manim / comfy / narration). The
-- render worker decomposes a script's markers into shots, dispatches each to
-- the appropriate renderer, and merges the outputs.

CREATE TABLE IF NOT EXISTS video_shots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lecture_id UUID NOT NULL REFERENCES video_lectures(id) ON DELETE CASCADE,
  script_id UUID REFERENCES video_scripts(id) ON DELETE SET NULL,
  position INT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('title','manim','comfy','narration')),
  start_seconds INT NOT NULL CHECK (start_seconds >= 0),
  duration_seconds INT NOT NULL CHECK (duration_seconds > 0),
  visual_cue TEXT,
  narration_chunk TEXT,
  prompt TEXT,
  manifest JSONB DEFAULT '{}'::jsonb,
  media_path TEXT,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','rendering','succeeded','failed','skipped')),
  attempt INT DEFAULT 0,
  error_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (lecture_id, position)
);

CREATE INDEX IF NOT EXISTS idx_video_shots_lecture ON video_shots(lecture_id, position);
CREATE INDEX IF NOT EXISTS idx_video_shots_status ON video_shots(status);

ALTER TABLE video_shots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS video_shots_admin_all ON video_shots;
CREATE POLICY video_shots_admin_all ON video_shots
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- Reuse the existing touch_updated_at() trigger fn (defined in 099).
DROP TRIGGER IF EXISTS trg_video_shots_touch ON video_shots;
CREATE TRIGGER trg_video_shots_touch
  BEFORE UPDATE ON video_shots
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
