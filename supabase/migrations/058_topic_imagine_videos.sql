-- 058_topic_imagine_videos.sql
-- Sprint 3 / S3-2: On-demand Topic-Imagination Videos
--
-- User types ANY topic (Big Bang, dinosaurs, BCE timeline, gupta empire,
-- formation of earth, cosmos…) and gets a 3D-VFX explainer in plain easy
-- language. Pipeline:
--   1. /api/imagine accepts {topicQuery, durationSeconds}
--   2. Spawns an imagine-job. Processor calls aiChat to produce a JSON
--      script: {voiceover_segments, scene_specs, syllabus_tag}
--   3. R3F scenes render client-side immediately from scene_specs.
--   4. Optional pre-render via ComfyUI/Remotion when render_status='queued'.
--
-- Same artifact-then-optional-render pattern as 057.

BEGIN;

CREATE TABLE IF NOT EXISTS imagine_videos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_query       text NOT NULL,
  syllabus_tag      text,                            -- AI-classified, e.g. 'history.ancient'
  duration_seconds  int  NOT NULL DEFAULT 60 CHECK (duration_seconds BETWEEN 15 AND 600),
  voiceover_segments jsonb NOT NULL DEFAULT '[]'::jsonb,
                                                     -- [{startMs, endMs, text, voice}]
  scene_specs       jsonb NOT NULL DEFAULT '[]'::jsonb,
                                                     -- ordered R3F scene specs, one per beat
  audio_url         text,                            -- TTS bake (optional)
  comfy_prompt_id   text,
  comfy_video_url   text,
  render_status     text NOT NULL DEFAULT 'r3f_only'
    CHECK (render_status IN ('r3f_only','queued','rendering','rendered','failed')),
  generated_by      text NOT NULL DEFAULT 'imagine-engine-v1',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_imagine_videos_user
  ON imagine_videos (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_imagine_videos_render_status
  ON imagine_videos (render_status);
CREATE INDEX IF NOT EXISTS idx_imagine_videos_syllabus
  ON imagine_videos (syllabus_tag) WHERE syllabus_tag IS NOT NULL;

CREATE OR REPLACE FUNCTION set_imagine_videos_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_imagine_videos_updated_at ON imagine_videos;
CREATE TRIGGER trg_imagine_videos_updated_at
BEFORE UPDATE ON imagine_videos
FOR EACH ROW EXECUTE FUNCTION set_imagine_videos_updated_at();

-- RLS: owner-only.
ALTER TABLE imagine_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_imagine_videos_owner ON imagine_videos;
CREATE POLICY p_imagine_videos_owner ON imagine_videos
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

COMMIT;
