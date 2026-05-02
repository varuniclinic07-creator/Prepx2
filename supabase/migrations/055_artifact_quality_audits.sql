-- 055_artifact_quality_audits.sql
-- Sprint 2 / Epic 3.2: Content Refiner — second-pass quality gate.
--
-- Each generated artifact (lecture script, smart-book chapter, research
-- article, quiz question) is verified by content-verifier.ts after creation,
-- producing an audit row here. Admin reviews the report and decides:
-- approve (downstream publish), reject (artifact rejected), or regenerate
-- (re-spawn the appropriate generator agent).
--
-- Depends on:
--   002_users  (FK admin_user_id → users.id)
--   099_policies_indexes_functions OR 052_research_corpus (provides is_admin())

BEGIN;

-- 1. artifact_quality_audits table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS artifact_quality_audits (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_type             text NOT NULL
    CHECK (artifact_type IN (
      'lecture_script',
      'smart_book_chapter',
      'research_article',
      'quiz_question'
    )),
  artifact_id               uuid NOT NULL,
  status                    text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','passed','flagged','rejected','approved')),
  quality_score             numeric,
  readability_grade         numeric,
  citation_count            int,
  citation_urls             jsonb NOT NULL DEFAULT '[]'::jsonb,
  syllabus_alignment_score  numeric,
  flags                     jsonb NOT NULL DEFAULT '[]'::jsonb,
  remediations              jsonb NOT NULL DEFAULT '[]'::jsonb,
  admin_decision            text CHECK (admin_decision IN ('approve','reject','regenerate')),
  admin_user_id             uuid REFERENCES users(id) ON DELETE SET NULL,
  admin_notes               text,
  decided_at                timestamptz,
  retrigger_count           int NOT NULL DEFAULT 0,
  raw_report                jsonb,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT artifact_quality_audits_unique
    UNIQUE (artifact_type, artifact_id, retrigger_count)
);

CREATE INDEX IF NOT EXISTS idx_aqa_status_created
  ON artifact_quality_audits (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aqa_artifact
  ON artifact_quality_audits (artifact_type, artifact_id);

-- 2. updated_at trigger ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_artifact_quality_audits_updated_at()
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

DROP TRIGGER IF EXISTS trg_aqa_updated_at ON artifact_quality_audits;
CREATE TRIGGER trg_aqa_updated_at
BEFORE UPDATE ON artifact_quality_audits
FOR EACH ROW EXECUTE FUNCTION set_artifact_quality_audits_updated_at();

-- 3. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE artifact_quality_audits ENABLE ROW LEVEL SECURITY;

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
DROP POLICY IF EXISTS "aqa_admin_all" ON artifact_quality_audits;
CREATE POLICY "aqa_admin_all" ON artifact_quality_audits
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Authenticated: read-only for passed/approved audits.
DROP POLICY IF EXISTS "aqa_read_published" ON artifact_quality_audits;
CREATE POLICY "aqa_read_published" ON artifact_quality_audits
  FOR SELECT TO authenticated
  USING (status IN ('passed','approved'));

-- service_role bypasses RLS by default.

COMMIT;
