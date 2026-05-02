-- 057_mnemonic_artifacts.sql
-- Sprint 3 / S3-1: Mnemonic Engine v2 with mandatory 3D scene
--
-- Every mnemonic ships with FOUR components:
--   1. text          — acronym/story/rhyme/visual phrasing (4 styles, all generated)
--   2. explanation   — why the mnemonic works
--   3. scene_spec    — JSON describing a 3D scene that visualises the mnemonic
--                      (camera path, mesh primitives, label keyframes). The
--                      client renders this with R3F at runtime — no GPU needed
--                      for the scene itself; the spec IS the artifact.
--   4. comfy_render  — optional pre-rendered MP4 of the same scene baked by
--                      the user's ComfyUI pod (16GB VRAM). When status =
--                      'rendered' the UI uses the MP4; otherwise it uses R3F.
--
-- This is intentional: the feature is shippable end-to-end with R3F today,
-- and the ComfyUI pre-render is a quality upgrade that backfills async.

BEGIN;

-- 1. mnemonic_artifacts ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mnemonic_artifacts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id        uuid REFERENCES topics(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES users(id) ON DELETE CASCADE,
  -- one of the two MUST be set; the other distinguishes catalog vs personal
  topic_query     text NOT NULL,                   -- denormalised for catalog rows
  style           text NOT NULL CHECK (style IN ('acronym','story','rhyme','visual')),
  text            text NOT NULL,                   -- the mnemonic itself
  explanation     text NOT NULL,
  scene_spec      jsonb NOT NULL,                  -- R3F scene-graph JSON (see lib/3d/scene-spec.ts)
  comfy_prompt_id text,                            -- ComfyUI prompt_id when render queued
  comfy_video_url text,                            -- public storage URL when render done
  render_status   text NOT NULL DEFAULT 'r3f_only'
    CHECK (render_status IN ('r3f_only','queued','rendering','rendered','failed')),
  generated_by    text NOT NULL DEFAULT 'mnemonic-engine-v2',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (topic_id IS NOT NULL OR user_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_mnemonic_artifacts_topic
  ON mnemonic_artifacts (topic_id) WHERE topic_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mnemonic_artifacts_user
  ON mnemonic_artifacts (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mnemonic_artifacts_render_status
  ON mnemonic_artifacts (render_status);

CREATE OR REPLACE FUNCTION set_mnemonic_artifacts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_mnemonic_artifacts_updated_at ON mnemonic_artifacts;
CREATE TRIGGER trg_mnemonic_artifacts_updated_at
BEFORE UPDATE ON mnemonic_artifacts
FOR EACH ROW EXECUTE FUNCTION set_mnemonic_artifacts_updated_at();

-- 2. mnemonic_ratings ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mnemonic_ratings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mnemonic_id     uuid NOT NULL REFERENCES mnemonic_artifacts(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating          int  NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mnemonic_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_mnemonic_ratings_mnemonic
  ON mnemonic_ratings (mnemonic_id);

-- 3. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE mnemonic_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mnemonic_ratings   ENABLE ROW LEVEL SECURITY;

-- Catalog rows (user_id IS NULL) readable by any authenticated user.
-- Personal rows (user_id IS NOT NULL) readable only by owner.
DROP POLICY IF EXISTS p_mnemonic_artifacts_select ON mnemonic_artifacts;
CREATE POLICY p_mnemonic_artifacts_select ON mnemonic_artifacts
  FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS p_mnemonic_artifacts_insert ON mnemonic_artifacts;
CREATE POLICY p_mnemonic_artifacts_insert ON mnemonic_artifacts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS p_mnemonic_artifacts_admin ON mnemonic_artifacts;
CREATE POLICY p_mnemonic_artifacts_admin ON mnemonic_artifacts
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS p_mnemonic_ratings_select ON mnemonic_ratings;
CREATE POLICY p_mnemonic_ratings_select ON mnemonic_ratings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_mnemonic_ratings_owner ON mnemonic_ratings;
CREATE POLICY p_mnemonic_ratings_owner ON mnemonic_ratings
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

COMMIT;
