-- 052_research_corpus.sql
-- Batch 2 / B2-4: Research Crawler Live
-- Tables: research_articles, research_topic_links, research_priority_signals
-- Depends on: 001_extensions (pgvector), 003_topics, 002_users (admin role)
-- Pairs with: 048 (crawl_history, owned by B2-2 Hermes worker)

-- 1. research_articles ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS research_articles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id     text NOT NULL,
  source_name   text,
  source_url    text NOT NULL,
  content_hash  text NOT NULL,
  title         text,
  body          text,
  summary       text,
  language      text NOT NULL DEFAULT 'en',
  published_at  timestamptz,
  scraped_at    timestamptz NOT NULL DEFAULT now(),
  enriched_at   timestamptz,
  status        text NOT NULL DEFAULT 'raw' CHECK (status IN ('raw','enriched','linked','rejected')),
  reject_reason text,
  embedding     vector(1536),
  tags          text[] NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT research_articles_source_hash_unique UNIQUE (source_id, content_hash)
);

CREATE INDEX IF NOT EXISTS idx_research_articles_source_scraped
  ON research_articles (source_id, scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_research_articles_status
  ON research_articles (status);
CREATE INDEX IF NOT EXISTS idx_research_articles_tags
  ON research_articles USING GIN (tags);

-- pgvector index — only create when extension is present (it is, see 001_extensions).
-- ivfflat needs ANALYZE/pre-population to be useful but creating empty is harmless.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    -- Use a low list count; the table will be small for a long time.
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_research_articles_embedding
             ON research_articles USING ivfflat (embedding vector_cosine_ops)
             WITH (lists = 50)';
  END IF;
END $$;

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_research_articles_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_research_articles_updated_at ON research_articles;
CREATE TRIGGER trg_research_articles_updated_at
BEFORE UPDATE ON research_articles
FOR EACH ROW EXECUTE FUNCTION set_research_articles_updated_at();

-- 2. research_topic_links ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS research_topic_links (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES research_articles(id) ON DELETE CASCADE,
  topic_id   uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  score      numeric,
  link_type  text NOT NULL DEFAULT 'semantic' CHECK (link_type IN ('semantic','manual')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT research_topic_links_unique UNIQUE (article_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_research_topic_links_topic_score
  ON research_topic_links (topic_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_research_topic_links_article
  ON research_topic_links (article_id);

-- 3. research_priority_signals ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS research_priority_signals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id      uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  signal_score  numeric NOT NULL DEFAULT 0,
  signals       jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_research_priority_signals_score_time
  ON research_priority_signals (signal_score DESC, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_research_priority_signals_topic
  ON research_priority_signals (topic_id, computed_at DESC);

-- 4. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE research_articles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_topic_links       ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_priority_signals  ENABLE ROW LEVEL SECURITY;

-- helper: is_admin() should already exist from migration 099. Re-check:
-- CREATE OR REPLACE FUNCTION public.is_admin() ...
-- If not present in this branch, this DO block adds a minimal version.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'is_admin'
  ) THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
      LANGUAGE sql STABLE SECURITY DEFINER AS $body$
        SELECT COALESCE((SELECT role = 'admin' FROM users WHERE id = auth.uid()), false);
      $body$;
    $f$;
    REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
  END IF;
END $$;

-- research_articles: authenticated read enriched/linked, admin all
DROP POLICY IF EXISTS "research_articles_read_published" ON research_articles;
CREATE POLICY "research_articles_read_published" ON research_articles
  FOR SELECT TO authenticated
  USING (status IN ('enriched','linked'));

DROP POLICY IF EXISTS "research_articles_admin_all" ON research_articles;
CREATE POLICY "research_articles_admin_all" ON research_articles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- research_topic_links: authenticated read, admin all
DROP POLICY IF EXISTS "research_topic_links_read" ON research_topic_links;
CREATE POLICY "research_topic_links_read" ON research_topic_links
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "research_topic_links_admin_all" ON research_topic_links;
CREATE POLICY "research_topic_links_admin_all" ON research_topic_links
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- research_priority_signals: admin only
DROP POLICY IF EXISTS "research_priority_signals_admin_all" ON research_priority_signals;
CREATE POLICY "research_priority_signals_admin_all" ON research_priority_signals
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. Helper RPC for semantic article→topic match ───────────────────────────
CREATE OR REPLACE FUNCTION match_topics_for_article(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (id uuid, title text, similarity float)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT t.id, t.title, 1 - (t.embedding <=> query_embedding) AS similarity
  FROM topics t
  WHERE t.embedding IS NOT NULL
    AND 1 - (t.embedding <=> query_embedding) > match_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
$$;

REVOKE EXECUTE ON FUNCTION match_topics_for_article(vector, float, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION match_topics_for_article(vector, float, int) TO authenticated, service_role;

-- 6. Advisor hygiene ──────────────────────────────────────────────────────
ALTER FUNCTION public.set_research_articles_updated_at() SET search_path = public;
ALTER FUNCTION public.match_topics_for_article(vector, float, int) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.match_topics_for_article(vector, float, int) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.match_topics_for_article(vector, float, int) TO authenticated, service_role;
