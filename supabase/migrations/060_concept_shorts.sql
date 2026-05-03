-- Migration 060: Concept Shorts — 120-second topic revision videos.
-- Each short: LLM generates condensed explanation + SceneSpec JSON →
-- R3F renders inline → render manifest for ComfyUI MP4 baking.
-- Sprint 4-1.

-- ── concept_shorts ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS concept_shorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,  -- null = catalog short
  concept_tag text NOT NULL,
  title text,
  style text DEFAULT 'concept_explainer'
    CHECK (style IN ('concept_explainer','pyq_breaker','mnemonic_visual','diagram_tour')),
  scene_spec jsonb,
  render_status text DEFAULT 'r3f_only'
    CHECK (render_status IN ('r3f_only','queued','rendering','rendered','failed')),
  comfy_prompt_id text,
  comfy_video_url text,
  approval_status text DEFAULT 'pending'
    CHECK (approval_status IN ('pending','approved','rejected')),
  duration_seconds int DEFAULT 120,
  voiceover_text text,
  generated_by text DEFAULT 'shorts-agent',
  render_meta jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_concept_shorts_topic ON concept_shorts(topic_id);
CREATE INDEX idx_concept_shorts_user ON concept_shorts(user_id);
CREATE INDEX idx_concept_shorts_render_status ON concept_shorts(render_status);
CREATE INDEX idx_concept_shorts_approval ON concept_shorts(approval_status);
CREATE INDEX idx_concept_shorts_created ON concept_shorts(created_at DESC);

-- ── concept_short_generations (5/24h rate limit) ────────────────────────────

CREATE TABLE IF NOT EXISTS concept_short_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  generated_at timestamptz DEFAULT now(),
  ip_address text
);

CREATE INDEX idx_csg_user ON concept_short_generations(user_id);
CREATE INDEX idx_csg_user_24h ON concept_short_generations(user_id, generated_at DESC);

-- ── updated_at trigger ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_concept_shorts_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = 'public';

DROP TRIGGER IF EXISTS trg_concept_shorts_updated_at ON concept_shorts;
CREATE TRIGGER trg_concept_shorts_updated_at
  BEFORE UPDATE ON concept_shorts
  FOR EACH ROW EXECUTE FUNCTION update_concept_shorts_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE concept_shorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_short_generations ENABLE ROW LEVEL SECURITY;

-- Catalog shorts (user_id IS NULL): visible to all authenticated users
CREATE POLICY "catalog_select" ON concept_shorts
  FOR SELECT USING (auth.role() = 'authenticated' AND user_id IS NULL);

-- Personal shorts: owner-only
CREATE POLICY "owner_select" ON concept_shorts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner_insert" ON concept_shorts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_update" ON concept_shorts
  FOR UPDATE USING (auth.uid() = user_id);

-- Admin: full access
CREATE POLICY "admin_all_shorts" ON concept_shorts
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Rate limit log: owner-only
CREATE POLICY "owner_csg" ON concept_short_generations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
