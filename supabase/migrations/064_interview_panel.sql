-- 064_interview_panel.sql
-- Sprint 3 / S3-8: Live Interview Panel — three AI judges + 3D-VFX debrief
--
-- Three independent LLM personas (Chairperson / Subject Expert / Behavioural
-- Psychologist) each ask one question per turn, the user answers, all three
-- score the answer + give written feedback, and a final 3D-VFX debrief
-- reel is rendered (R3F first, ComfyUI re-render optional).
--
-- Migrations 060-063 are RESERVED for Sprint 4 features (Concept Shorts,
-- 3D Syllabus Navigator, CA Video Newspaper, 3D Notes Surface).

BEGIN;

CREATE TABLE IF NOT EXISTS interview_sessions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_focus       text,                       -- e.g. 'Polity', 'Optional - Sociology'
  status            text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress','debrief_pending','debriefed','abandoned')),
  total_score       int  NOT NULL DEFAULT 0,    -- sum of judge scores (0-30)
  started_at        timestamptz NOT NULL DEFAULT now(),
  ended_at          timestamptz,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_user
  ON interview_sessions (user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS interview_turns (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        uuid NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  turn_index        int  NOT NULL,
  judge             text NOT NULL CHECK (judge IN ('chairperson','expert','behavioural')),
  question          text NOT NULL,
  user_answer       text,
  score             int CHECK (score BETWEEN 0 AND 10),
  feedback          text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, turn_index, judge)
);

CREATE INDEX IF NOT EXISTS idx_interview_turns_session
  ON interview_turns (session_id, turn_index);

CREATE TABLE IF NOT EXISTS interview_debriefs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        uuid NOT NULL UNIQUE REFERENCES interview_sessions(id) ON DELETE CASCADE,
  summary           text NOT NULL,
  strengths         text[] NOT NULL DEFAULT '{}',
  weaknesses        text[] NOT NULL DEFAULT '{}',
  scene_spec        jsonb NOT NULL,             -- 3D-VFX debrief scene (R3F)
  comfy_prompt_id   text,
  comfy_video_url   text,
  render_status     text NOT NULL DEFAULT 'r3f_only'
    CHECK (render_status IN ('r3f_only','queued','rendering','rendered','failed')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_interview_sessions_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_interview_sessions_updated_at ON interview_sessions;
CREATE TRIGGER trg_interview_sessions_updated_at
BEFORE UPDATE ON interview_sessions
FOR EACH ROW EXECUTE FUNCTION set_interview_sessions_updated_at();

-- RLS
ALTER TABLE interview_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_turns     ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_debriefs  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_interview_sessions_owner ON interview_sessions;
CREATE POLICY p_interview_sessions_owner ON interview_sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS p_interview_turns_owner ON interview_turns;
CREATE POLICY p_interview_turns_owner ON interview_turns
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM interview_sessions s
    WHERE s.id = interview_turns.session_id
      AND (s.user_id = auth.uid() OR is_admin())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM interview_sessions s
    WHERE s.id = interview_turns.session_id
      AND (s.user_id = auth.uid() OR is_admin())
  ));

DROP POLICY IF EXISTS p_interview_debriefs_owner ON interview_debriefs;
CREATE POLICY p_interview_debriefs_owner ON interview_debriefs
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM interview_sessions s
    WHERE s.id = interview_debriefs.session_id
      AND (s.user_id = auth.uid() OR is_admin())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM interview_sessions s
    WHERE s.id = interview_debriefs.session_id
      AND (s.user_id = auth.uid() OR is_admin())
  ));

COMMIT;
