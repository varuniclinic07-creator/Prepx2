-- Sprint 9-E Phase A+C — Adaptive Learning Memory.
--
-- Two tables:
--   user_learning_events  — append-only event stream (replay_clicked,
--                            concept_queried, quiz_failed, …). Fine-grained,
--                            keyed on (lecture_id_uuid, concept_id_text)
--                            so the heuristic engine can join against
--                            lecture_jobs.metadata.concept_index entries.
--   user_concept_memory   — derived per-user-per-lecture-concept snapshot
--                            (replay_count, query_count, quiz_fail_count,
--                            mastery_score 0..1, status). Refreshed by
--                            classifyStruggle() on every event write.
--
-- Both are scoped to (user_id, lecture_job_id) — concept_id is a TEXT slug
-- because lecture_jobs.metadata.concept_index[*].id is a slug ('resistance'),
-- not a UUID. Avoids forced FK to a non-existent concepts table.

-- ─── Events: append-only stream ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_learning_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lecture_job_id UUID NOT NULL REFERENCES lecture_jobs(id) ON DELETE CASCADE,
  -- Slug from lecture_jobs.metadata.concept_index[*].id; NULL when the event
  -- is lecture-scoped (e.g. recap_requested) instead of concept-scoped.
  concept_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'replay_clicked',
    'concept_queried',
    'quiz_failed',
    'quiz_passed',
    'note_opened',
    'recap_requested'
  )),
  -- Free-form structured payload — intent, confidence, segment range,
  -- quiz id, etc. Keep flat: top-level scalars only, no nesting.
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uleve_user_lecture
  ON user_learning_events(user_id, lecture_job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uleve_user_concept
  ON user_learning_events(user_id, lecture_job_id, concept_id)
  WHERE concept_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_uleve_event_type
  ON user_learning_events(event_type);

ALTER TABLE user_learning_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS uleve_self_read ON user_learning_events;
CREATE POLICY uleve_self_read ON user_learning_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS uleve_self_insert ON user_learning_events;
CREATE POLICY uleve_self_insert ON user_learning_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ─── Memory: derived per-(user, lecture, concept) snapshot ─────────────

CREATE TABLE IF NOT EXISTS user_concept_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lecture_job_id UUID NOT NULL REFERENCES lecture_jobs(id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL,                       -- slug from concept_index
  concept_name TEXT NOT NULL,                     -- denormalized for display
  -- Counters aggregated from user_learning_events. Updated by
  -- refreshConceptMemory() in lib/learning/memory.ts after every event write.
  replay_count INT NOT NULL DEFAULT 0 CHECK (replay_count >= 0),
  query_count INT NOT NULL DEFAULT 0 CHECK (query_count >= 0),
  quiz_fail_count INT NOT NULL DEFAULT 0 CHECK (quiz_fail_count >= 0),
  quiz_pass_count INT NOT NULL DEFAULT 0 CHECK (quiz_pass_count >= 0),
  -- Deterministic 0..1 mastery score derived from the counters.
  -- Initial heuristic (Phase B):
  --   mastery = clamp01(0.5
  --                     + 0.25 * sign(quiz_pass - quiz_fail)
  --                     - 0.10 * (replay_count > 2)
  --                     - 0.10 * (query_count  > 2))
  mastery_score NUMERIC(3,2) NOT NULL DEFAULT 0.50
    CHECK (mastery_score >= 0 AND mastery_score <= 1),
  -- Coarse status flag, derived alongside mastery_score.
  --   'fresh'      — never touched
  --   'engaged'    — at least one interaction, no struggle signal
  --   'struggling' — replay > 2 OR query > 2 OR quiz_fail >= 1
  --   'mastered'   — quiz_pass >= 1 AND quiz_fail = 0 AND replay <= 1
  status TEXT NOT NULL DEFAULT 'fresh'
    CHECK (status IN ('fresh','engaged','struggling','mastered')),
  last_event_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, lecture_job_id, concept_id)
);

CREATE INDEX IF NOT EXISTS idx_ucm_user_lecture
  ON user_concept_memory(user_id, lecture_job_id);
CREATE INDEX IF NOT EXISTS idx_ucm_status
  ON user_concept_memory(user_id, status)
  WHERE status IN ('struggling','mastered');

ALTER TABLE user_concept_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ucm_self_read ON user_concept_memory;
CREATE POLICY ucm_self_read ON user_concept_memory
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Writes go through the service role only (lib/learning/memory.ts uses
-- the admin client). Service role bypasses RLS entirely; we deliberately
-- do NOT grant authenticated INSERT/UPDATE so the heuristic stays the
-- single source of truth and clients cannot fabricate mastery.

DROP TRIGGER IF EXISTS trg_ucm_touch ON user_concept_memory;
CREATE TRIGGER trg_ucm_touch
  BEFORE UPDATE ON user_concept_memory
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
