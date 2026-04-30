-- 045_add_syllabus_tag_and_uuid_helpers.sql
-- Purpose: align live schema with what app code already expects.
--
-- Drift discovered 2026-04-30 during seed-file fix:
--   - lib/scraper/ai-processor.ts:156, lib/content-agent.ts:60,
--     lib/supabase.ts:70-78, app/admin/content/page.tsx:45,65
--     all read/write topics.syllabus_tag, but no migration ever added it.
--   - seed.sql expects this column too.
--
-- This migration:
--   1. Adds uuid-ossp extension (for uuid_generate_v5 deterministic IDs in seeds).
--   2. Adds topics.syllabus_tag TEXT (nullable; existing rows get NULL).
--   3. Adds unique index on syllabus_tag for app's getTopicBySyllabusTag() lookup
--      (lib/supabase.ts:75) — partial index excludes NULLs so existing rows
--      without a tag don't collide.
--
-- Idempotent: safe to re-run.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE topics ADD COLUMN IF NOT EXISTS syllabus_tag TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS topics_syllabus_tag_unique
  ON topics (syllabus_tag)
  WHERE syllabus_tag IS NOT NULL;
