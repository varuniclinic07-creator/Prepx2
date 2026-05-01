-- 051: Storage bucket + RLS for the rendered video pipeline.
-- Bucket is private (signed-URL only). Service-role inserts; authenticated SELECT
-- is denied at the storage.objects level — clients MUST go through signed URLs
-- minted server-side via the service-role key.

BEGIN;

INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', false)
ON CONFLICT (id) DO NOTHING;

-- Service-role and admin can insert/update/delete inside the videos bucket.
-- Anything else is blocked by default (signed URLs bypass these policies).

DROP POLICY IF EXISTS "videos admin all" ON storage.objects;
CREATE POLICY "videos admin all" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'videos' AND is_admin())
    WITH CHECK (bucket_id = 'videos' AND is_admin());

-- Authenticated users do NOT get a generic SELECT on storage.objects for the
-- videos bucket. Reads happen via signed URL only.

COMMIT;
