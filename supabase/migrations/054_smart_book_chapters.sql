-- 054_smart_book_chapters.sql
-- Sprint 2 / Epic 16.2: Smart Book Chapter Generation
-- Adds the `chapters` table — each topic accrues versioned, AI-generated
-- chapters (introduction → detailed → mnemonics → mocks → mains → summary)
-- with hard-gated source citations. Chapters become visible to learners
-- only when admin approves (status='published').
--
-- Depends on:
--   003_topics (FK chapters.topic_id → topics.id)
--   002_users  (FK chapters.approved_by → users.id)
--   099_policies_indexes_functions OR 052_research_corpus (provides is_admin())

BEGIN;

-- 1. chapters table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chapters (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id              uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  chapter_num           int  NOT NULL,
  version               int  NOT NULL DEFAULT 1,
  title                 text NOT NULL,
  introduction          text NOT NULL,
  detailed_content      text NOT NULL,
  mnemonics             jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{ text, type }]
  mock_questions        jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{ question, options[], correctIndex, explanation }]
  mains_questions       jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{ question, expectedPoints[] }]
  pyqs                  jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary               text NOT NULL,
  ca_links              jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{ articleId, headline, url }]
  flesch_kincaid_grade  numeric NOT NULL,
  source_citations      jsonb NOT NULL,                       -- [{ source, reference, url? }]
  status                text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','generated_pending_approval','approved','published','rejected')),
  generated_by_agent    text NOT NULL DEFAULT 'chapter-writer-v1',
  approved_by           uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_at           timestamptz,
  rejected_reason       text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chapters_topic_num_version_unique UNIQUE (topic_id, chapter_num, version)
);

CREATE INDEX IF NOT EXISTS idx_chapters_topic_status
  ON chapters (topic_id, status);
CREATE INDEX IF NOT EXISTS idx_chapters_status_created
  ON chapters (status, created_at DESC);

-- 2. updated_at trigger ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_chapters_updated_at()
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

DROP TRIGGER IF EXISTS trg_chapters_updated_at ON chapters;
CREATE TRIGGER trg_chapters_updated_at
BEFORE UPDATE ON chapters
FOR EACH ROW EXECUTE FUNCTION set_chapters_updated_at();

-- 3. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

-- Ensure is_admin() exists (defensive — already created by migration 052/099)
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

-- Admin: full control
DROP POLICY IF EXISTS "chapters_admin_all" ON chapters;
CREATE POLICY "chapters_admin_all" ON chapters
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Authenticated: read only published chapters
DROP POLICY IF EXISTS "chapters_read_published" ON chapters;
CREATE POLICY "chapters_read_published" ON chapters
  FOR SELECT TO authenticated
  USING (status = 'published');

-- service_role bypasses RLS by default; nothing else to grant.

COMMIT;
