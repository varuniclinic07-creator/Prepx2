-- 056_ca_daily_bundles.sql
-- Sprint 2 / Epic 5.3: Current Affairs Bundles
--
-- Daily clustering of research_articles into a single bundle published to
-- aspirants. The bundle-grouper agent (lib/agents/bundle-grouper.ts) reads
-- the last 36h of linked/enriched articles, calls the LLM to cluster them
-- into 3-5 themes, and writes one ca_daily_bundles row + N
-- ca_bundle_articles rows. Reads are tracked per-user in ca_bundle_reads.
--
-- Depends on:
--   002_users               (FK user_id → users.id)
--   052_research_corpus     (FK article_id → research_articles.id)
--   055_artifact_quality_audits OR 099 (provides public.is_admin())

BEGIN;

-- 1. ca_daily_bundles ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ca_daily_bundles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_date         date NOT NULL UNIQUE,
  theme               text NOT NULL,
  subtitle            text,
  syllabus_tags       text[] NOT NULL DEFAULT '{}',
  summary             text NOT NULL,
  status              text NOT NULL DEFAULT 'generating'
    CHECK (status IN ('generating','published','archived')),
  generated_by_agent  text NOT NULL DEFAULT 'bundle-grouper-v1',
  article_count       int NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ca_daily_bundles_date_desc
  ON ca_daily_bundles (bundle_date DESC);
CREATE INDEX IF NOT EXISTS idx_ca_daily_bundles_status
  ON ca_daily_bundles (status);

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_ca_daily_bundles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ca_daily_bundles_updated_at ON ca_daily_bundles;
CREATE TRIGGER trg_ca_daily_bundles_updated_at
BEFORE UPDATE ON ca_daily_bundles
FOR EACH ROW EXECUTE FUNCTION set_ca_daily_bundles_updated_at();

-- 2. ca_bundle_articles ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ca_bundle_articles (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id      uuid NOT NULL REFERENCES ca_daily_bundles(id) ON DELETE CASCADE,
  article_id     uuid NOT NULL REFERENCES research_articles(id) ON DELETE CASCADE,
  relevance      text NOT NULL DEFAULT 'both'
    CHECK (relevance IN ('prelims','mains','both')),
  key_points     jsonb NOT NULL DEFAULT '[]'::jsonb,
  position       int NOT NULL DEFAULT 0,
  cluster_label  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ca_bundle_articles_unique UNIQUE (bundle_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_ca_bundle_articles_bundle_position
  ON ca_bundle_articles (bundle_id, position);
CREATE INDEX IF NOT EXISTS idx_ca_bundle_articles_article
  ON ca_bundle_articles (article_id);

-- 3. ca_bundle_reads ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ca_bundle_reads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bundle_id   uuid NOT NULL REFERENCES ca_daily_bundles(id) ON DELETE CASCADE,
  article_id  uuid REFERENCES research_articles(id) ON DELETE CASCADE,
  read_at     timestamptz NOT NULL DEFAULT now()
);

-- UNIQUE (user_id, bundle_id, article_id) — but article_id may be NULL.
-- Postgres treats NULLs as distinct in regular UNIQUE constraints, so we
-- emulate "one whole-bundle read row per user" with two partial indexes.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ca_bundle_reads_per_article
  ON ca_bundle_reads (user_id, bundle_id, article_id)
  WHERE article_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_ca_bundle_reads_whole_bundle
  ON ca_bundle_reads (user_id, bundle_id)
  WHERE article_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_ca_bundle_reads_user_recent
  ON ca_bundle_reads (user_id, read_at DESC);

-- 4. Ensure is_admin() helper exists (mirrors 055 — defensive duplicate).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'is_admin'
  ) THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
      LANGUAGE sql STABLE SECURITY DEFINER
      SET search_path = public
      AS $body$
        SELECT COALESCE((SELECT role = 'admin' FROM users WHERE id = auth.uid()), false);
      $body$;
    $f$;
    REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
    GRANT  EXECUTE ON FUNCTION public.is_admin() TO authenticated;
  END IF;
END $$;

-- 5. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE ca_daily_bundles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ca_bundle_articles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ca_bundle_reads     ENABLE ROW LEVEL SECURITY;

-- ca_daily_bundles
DROP POLICY IF EXISTS "ca_bundles_admin_all" ON ca_daily_bundles;
CREATE POLICY "ca_bundles_admin_all" ON ca_daily_bundles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "ca_bundles_read_published" ON ca_daily_bundles;
CREATE POLICY "ca_bundles_read_published" ON ca_daily_bundles
  FOR SELECT TO authenticated
  USING (status = 'published');

-- ca_bundle_articles — visible iff parent bundle is published
DROP POLICY IF EXISTS "ca_bundle_articles_admin_all" ON ca_bundle_articles;
CREATE POLICY "ca_bundle_articles_admin_all" ON ca_bundle_articles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "ca_bundle_articles_read_published" ON ca_bundle_articles;
CREATE POLICY "ca_bundle_articles_read_published" ON ca_bundle_articles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ca_daily_bundles b
      WHERE b.id = ca_bundle_articles.bundle_id
        AND b.status = 'published'
    )
  );

-- ca_bundle_reads — owner-only; admin all
DROP POLICY IF EXISTS "ca_bundle_reads_admin_all" ON ca_bundle_reads;
CREATE POLICY "ca_bundle_reads_admin_all" ON ca_bundle_reads
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "ca_bundle_reads_owner_select" ON ca_bundle_reads;
CREATE POLICY "ca_bundle_reads_owner_select" ON ca_bundle_reads
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "ca_bundle_reads_owner_insert" ON ca_bundle_reads;
CREATE POLICY "ca_bundle_reads_owner_insert" ON ca_bundle_reads
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "ca_bundle_reads_owner_delete" ON ca_bundle_reads;
CREATE POLICY "ca_bundle_reads_owner_delete" ON ca_bundle_reads
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- service_role bypasses RLS by default.

COMMIT;
