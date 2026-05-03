-- Sprint 5 part-2: durable podcast storage. The Sprint 5 endpoint shipped
-- audio as a base64 data URL; we now persist the rendered MP3 to a private
-- 'podcasts' Storage bucket and refresh signed URLs on read (mirrors the
-- video_lectures pattern).

ALTER TABLE podcast_episodes ADD COLUMN IF NOT EXISTS audio_path TEXT;
ALTER TABLE podcast_episodes ADD COLUMN IF NOT EXISTS signed_url_expires_at TIMESTAMPTZ;

INSERT INTO storage.buckets (id, name, public)
VALUES ('podcasts', 'podcasts', false)
ON CONFLICT (id) DO NOTHING;

-- Owner-only storage policies for the new bucket. Path layout: <user_id>/<date>.mp3
DROP POLICY IF EXISTS "Users read own podcast objects" ON storage.objects;
CREATE POLICY "Users read own podcast objects"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'podcasts' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users write own podcast objects" ON storage.objects;
CREATE POLICY "Users write own podcast objects"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'podcasts' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own podcast objects" ON storage.objects;
CREATE POLICY "Users update own podcast objects"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'podcasts' AND (storage.foldername(name))[1] = auth.uid()::text);
