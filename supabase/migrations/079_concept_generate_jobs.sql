-- Sprint 9-B: Product B — "Explain This" / AI Doubt Solver.
-- One row per `POST /api/concepts/generate` call. The concept-generate worker:
--   1. Fetches the uploaded source (PDF / DOCX / image / PPT / raw text) from
--      `concepts-mvp/{userId}/sources/{conceptId}.{ext}`.
--   2. Parses → extracts concepts → identifies confusion → simplifies into a
--      teacher-style script + scene plan (60-120 s).
--   3. Hands the plan to the canonical lecture pipeline (orchestrator) and
--      stores the resulting MP4 + notes + recap + 5-Q quiz under
--      `concepts-mvp/{userId}/{conceptId}/*`.
--
-- A concept_job may spawn (link to) a lecture_job for the actual baking — that
-- linkage is recorded via `lecture_job_id` so the GET endpoint can surface
-- both stage logs.

CREATE TABLE IF NOT EXISTS concept_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID,                                     -- agent_tasks.id (loose FK)
  lecture_job_id UUID REFERENCES lecture_jobs(id) ON DELETE SET NULL,
  concept_id TEXT NOT NULL UNIQUE,                  -- cpt_{slug}_{shortHash}_{epochMs}

  -- Source upload metadata
  document_name TEXT,                               -- original filename ("ohms-law.pdf")
  document_type TEXT NOT NULL                       -- discriminator
    CHECK (document_type IN ('pdf','docx','pptx','image','text')),
  source_storage_path TEXT,                         -- concepts-mvp/{userId}/sources/{conceptId}.{ext}
  source_text_excerpt TEXT,                         -- first ~2k chars of parsed text (for the GET response)

  -- Extraction output
  detected_topic TEXT,                              -- canonical title chosen by extractor
  detected_concepts JSONB,                          -- [{name, definition, formula?, difficulty}]
  cache_hash TEXT,                                  -- sha256(sourceTextNormalized + style + language)
  params JSONB NOT NULL DEFAULT '{}'::jsonb,        -- {style, difficulty, language, outputFormat}

  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN (
      'queued','parsing','extracting','simplifying','planning',
      'lecture-generating','finalizing','completed','failed'
    )),
  progress_percent INT NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),

  storage_prefix TEXT,                              -- {userId}/{conceptId}
  manifest JSONB,                                   -- frontend-friendly signed-URL bundle
  metadata JSONB,                                   -- deep telemetry (formulas, explanation graph, source map, learning_objectives)
  stage_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_concept_jobs_user      ON concept_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_concept_jobs_status    ON concept_jobs(status);
CREATE INDEX IF NOT EXISTS idx_concept_jobs_cache     ON concept_jobs(cache_hash) WHERE cache_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_concept_jobs_lecture   ON concept_jobs(lecture_job_id) WHERE lecture_job_id IS NOT NULL;

ALTER TABLE concept_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS concept_jobs_owner_read ON concept_jobs;
CREATE POLICY concept_jobs_owner_read ON concept_jobs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS concept_jobs_admin_all ON concept_jobs;
CREATE POLICY concept_jobs_admin_all ON concept_jobs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

DROP TRIGGER IF EXISTS trg_concept_jobs_touch ON concept_jobs;
CREATE TRIGGER trg_concept_jobs_touch
  BEFORE UPDATE ON concept_jobs
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Private storage bucket for concept-mvp artifacts. Layout:
--   {userId}/sources/{conceptId}.pdf|docx|pptx|png|jpg|txt
--   {userId}/{conceptId}/explainer.mp4
--   {userId}/{conceptId}/notes.json
--   {userId}/{conceptId}/notes.pdf
--   {userId}/{conceptId}/quiz.json
--   {userId}/{conceptId}/recap.json
--   {userId}/{conceptId}/timeline.json
--   {userId}/{conceptId}/metadata.json
--   {userId}/{conceptId}/manifest.json
-- Plus content-addressed cache:
--   cache/{cacheHash}/...
INSERT INTO storage.buckets (id, name, public)
VALUES ('concepts-mvp', 'concepts-mvp', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS concepts_mvp_owner_read ON storage.objects;
CREATE POLICY concepts_mvp_owner_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'concepts-mvp' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS concepts_mvp_owner_write ON storage.objects;
CREATE POLICY concepts_mvp_owner_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'concepts-mvp' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS concepts_mvp_admin_all ON storage.objects;
CREATE POLICY concepts_mvp_admin_all ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'concepts-mvp' AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
  WITH CHECK (bucket_id = 'concepts-mvp' AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
