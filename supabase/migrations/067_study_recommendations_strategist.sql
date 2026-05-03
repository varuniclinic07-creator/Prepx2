-- Sprint 5 part-2: power the AI Strategist (Chanakya) card with real per-user
-- diagnoses. The legacy study_recommendations row was a 1-line topic pointer;
-- we now store a full structured diagnose result so the dashboard card doesn't
-- have to re-call the LLM on every render.

ALTER TABLE study_recommendations ADD COLUMN IF NOT EXISTS headline TEXT;
ALTER TABLE study_recommendations ADD COLUMN IF NOT EXISTS diagnosis TEXT;
ALTER TABLE study_recommendations ADD COLUMN IF NOT EXISTS action_steps JSONB DEFAULT '[]'::jsonb;
ALTER TABLE study_recommendations ADD COLUMN IF NOT EXISTS focus_subjects TEXT[] DEFAULT '{}';
ALTER TABLE study_recommendations ADD COLUMN IF NOT EXISTS confidence FLOAT;
ALTER TABLE study_recommendations ADD COLUMN IF NOT EXISTS source_window_days INT DEFAULT 30;
ALTER TABLE study_recommendations ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE study_recommendations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Idempotent owner-only policies (the table already has RLS enabled).
DROP POLICY IF EXISTS "Users read own recommendations" ON study_recommendations;
CREATE POLICY "Users read own recommendations"
  ON study_recommendations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own recommendations" ON study_recommendations;
CREATE POLICY "Users insert own recommendations"
  ON study_recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own recommendations" ON study_recommendations;
CREATE POLICY "Users update own recommendations"
  ON study_recommendations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_study_recs_user_recent
  ON study_recommendations(user_id, created_at DESC);
