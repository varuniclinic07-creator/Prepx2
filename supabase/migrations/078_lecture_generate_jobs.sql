-- Sprint 9-A: async lecture generation.
-- One row per `POST /api/lectures/generate` call. The lecture-generate worker
-- streams stage progress into `status` + `stage_log`, uploads finished assets
-- under /{userId}/{lectureId}/* in the lectures-mvp bucket, and persists the
-- frontend manifest + system metadata for the GET endpoint.
--
-- Stages mirror lib/queue/types.ts LectureStage exactly.

CREATE TABLE IF NOT EXISTS lecture_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID,                                   -- agent_tasks.id (FK loose on purpose: dispatch may insert later)
  lecture_id TEXT NOT NULL UNIQUE,                -- lec_{topicSlug}_{shortHash}_{epochMs}
  topic TEXT NOT NULL,
  cache_hash TEXT,                                -- sha256(topic+duration+style+difficulty+language) — for /cache/{hash}/* reuse
  params JSONB NOT NULL DEFAULT '{}'::jsonb,      -- {topic, durationSeconds, style, difficulty, language, outputFormat}
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN (
      'queued','pedagogy','shot-planning','ltx-render','manim-render',
      'narration','subtitles','composition','notes','quiz','finalizing',
      'completed','failed'
    )),
  progress_percent INT NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  storage_prefix TEXT,                            -- {userId}/{lectureId}
  manifest JSONB,                                 -- frontend-friendly registry (signed URLs)
  metadata JSONB,                                 -- deep system telemetry (stage timings, GPU, cache hits)
  stage_log JSONB NOT NULL DEFAULT '[]'::jsonb,   -- append-only [{stage,ts,ms,status,note}]
  error_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lecture_jobs_user      ON lecture_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lecture_jobs_status    ON lecture_jobs(status);
CREATE INDEX IF NOT EXISTS idx_lecture_jobs_cache     ON lecture_jobs(cache_hash) WHERE cache_hash IS NOT NULL;

ALTER TABLE lecture_jobs ENABLE ROW LEVEL SECURITY;

-- Owner reads own rows.
DROP POLICY IF EXISTS lecture_jobs_owner_read ON lecture_jobs;
CREATE POLICY lecture_jobs_owner_read ON lecture_jobs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins read/write everything.
DROP POLICY IF EXISTS lecture_jobs_admin_all ON lecture_jobs;
CREATE POLICY lecture_jobs_admin_all ON lecture_jobs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- Reuse the existing touch_updated_at() trigger fn (defined in 099).
DROP TRIGGER IF EXISTS trg_lecture_jobs_touch ON lecture_jobs;
CREATE TRIGGER trg_lecture_jobs_touch
  BEFORE UPDATE ON lecture_jobs
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Private storage bucket for lecture-mvp artifacts. Layout:
--   {userId}/{lectureId}/lecture.mp4
--   {userId}/{lectureId}/notes.json
--   {userId}/{lectureId}/notes.pdf
--   {userId}/{lectureId}/quiz.json
--   {userId}/{lectureId}/timeline.json
--   {userId}/{lectureId}/metadata.json
--   {userId}/{lectureId}/manifest.json
-- Plus content-addressed cache:
--   cache/{cacheHash}/...
INSERT INTO storage.buckets (id, name, public)
VALUES ('lectures-mvp', 'lectures-mvp', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: bucket is private, signed URLs are minted by the service role. The
-- per-user folder rule below allows authenticated users to list/read their
-- own prefix directly via the JS client if needed.
DROP POLICY IF EXISTS lectures_mvp_owner_read ON storage.objects;
CREATE POLICY lectures_mvp_owner_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'lectures-mvp' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS lectures_mvp_admin_all ON storage.objects;
CREATE POLICY lectures_mvp_admin_all ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'lectures-mvp' AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
  WITH CHECK (bucket_id = 'lectures-mvp' AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
