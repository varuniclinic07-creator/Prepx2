-- 059_animated_mindmaps.sql
-- Sprint 3 / S3-3: Animated Mindmaps per chapter
--
-- An LLM converts a smart_book_chapter (or topic) into a hierarchical node
-- tree {id, parent_id, label, summary, depth, position[3]}. Frontend renders
-- with R3F (clickable nodes, focus animations). Optional Manim/Remotion
-- pre-render produces a 30s preview reel for free users; full interactive
-- mindmap is premium.

BEGIN;

CREATE TABLE IF NOT EXISTS animated_mindmaps (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id        uuid REFERENCES topics(id) ON DELETE CASCADE,
  chapter_id      uuid REFERENCES chapters(id) ON DELETE CASCADE,
  title           text NOT NULL,
  layout          text NOT NULL DEFAULT 'radial'
    CHECK (layout IN ('radial','tree','force','timeline')),
  preview_seconds int  NOT NULL DEFAULT 30,
  preview_url     text,                    -- 30s MP4 (Manim-rendered)
  generated_by    text NOT NULL DEFAULT 'mindmap-builder-v1',
  status          text NOT NULL DEFAULT 'generating'
    CHECK (status IN ('generating','ready','failed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (topic_id IS NOT NULL OR chapter_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_animated_mindmaps_topic
  ON animated_mindmaps (topic_id) WHERE topic_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_animated_mindmaps_chapter
  ON animated_mindmaps (chapter_id) WHERE chapter_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS mindmap_nodes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mindmap_id      uuid NOT NULL REFERENCES animated_mindmaps(id) ON DELETE CASCADE,
  parent_id       uuid REFERENCES mindmap_nodes(id) ON DELETE CASCADE,
  label           text NOT NULL,
  summary         text,
  depth           int  NOT NULL CHECK (depth BETWEEN 0 AND 6),
  position        jsonb NOT NULL DEFAULT '[0,0,0]'::jsonb,  -- [x,y,z]
  color_hint      text,                                      -- 'primary'|'cyan'|'saffron'|...
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mindmap_nodes_mindmap ON mindmap_nodes (mindmap_id);
CREATE INDEX IF NOT EXISTS idx_mindmap_nodes_parent  ON mindmap_nodes (parent_id);

CREATE OR REPLACE FUNCTION set_animated_mindmaps_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_animated_mindmaps_updated_at ON animated_mindmaps;
CREATE TRIGGER trg_animated_mindmaps_updated_at
BEFORE UPDATE ON animated_mindmaps
FOR EACH ROW EXECUTE FUNCTION set_animated_mindmaps_updated_at();

-- RLS: published-readable, admin-write.
ALTER TABLE animated_mindmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE mindmap_nodes     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_animated_mindmaps_select ON animated_mindmaps;
CREATE POLICY p_animated_mindmaps_select ON animated_mindmaps
  FOR SELECT TO authenticated USING (status = 'ready' OR is_admin());

DROP POLICY IF EXISTS p_animated_mindmaps_admin ON animated_mindmaps;
CREATE POLICY p_animated_mindmaps_admin ON animated_mindmaps
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS p_mindmap_nodes_select ON mindmap_nodes;
CREATE POLICY p_mindmap_nodes_select ON mindmap_nodes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM animated_mindmaps m
    WHERE m.id = mindmap_nodes.mindmap_id
      AND (m.status = 'ready' OR is_admin())
  ));

DROP POLICY IF EXISTS p_mindmap_nodes_admin ON mindmap_nodes;
CREATE POLICY p_mindmap_nodes_admin ON mindmap_nodes
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

COMMIT;
