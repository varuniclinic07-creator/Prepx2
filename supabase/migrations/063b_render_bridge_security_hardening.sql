-- 063b: Tighten Sprint 4 surfaces flagged by the advisor.
-- 1. Recreate bakeable_rows as a SECURITY INVOKER view so it respects the
--    caller's RLS instead of the view-creator's superuser privileges.
-- 2. Revoke anon EXECUTE on the 3 new SECURITY DEFINER RPCs from migration 062.
--    (authenticated still has EXECUTE — these are called by signed-in users
--     for the syllabus navigator + conquest map.)

DROP VIEW IF EXISTS public.bakeable_rows;

CREATE VIEW public.bakeable_rows
WITH (security_invoker = true)
AS
  SELECT 'mnemonic_artifacts' AS source_table, id, render_status, scene_spec
  FROM mnemonic_artifacts WHERE render_status = 'r3f_only'
  UNION ALL
  SELECT 'imagine_videos', id, render_status, scene_specs AS scene_spec
  FROM imagine_videos WHERE render_status = 'r3f_only'
  UNION ALL
  SELECT 'interview_debriefs', id, render_status, scene_spec
  FROM interview_debriefs WHERE render_status = 'r3f_only'
  UNION ALL
  SELECT 'animated_mindmaps', id, render_status, scene_spec
  FROM animated_mindmaps WHERE render_status = 'r3f_only'
  UNION ALL
  SELECT 'concept_shorts', id, render_status, scene_spec
  FROM concept_shorts WHERE render_status = 'r3f_only'
  UNION ALL
  SELECT 'ca_video_newspapers', id, render_status, scene_specs AS scene_spec
  FROM ca_video_newspapers WHERE render_status = 'r3f_only';

-- Anon must not call the conquest / progress RPCs.
REVOKE EXECUTE ON FUNCTION public.increment_capture(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_subject_progress(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_district_conquest_state() FROM anon;

-- Re-affirm authenticated EXECUTE (idempotent) so signed-in users keep working.
GRANT EXECUTE ON FUNCTION public.increment_capture(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_subject_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_district_conquest_state() TO authenticated;
