-- 050: Video pipeline tables (Epic 6 — Astra Stream)
-- Adds: video_scripts, video_lectures, video_notes, video_qa, system_alerts,
-- and the notifications table seam. Pin search_path on any helpers.

BEGIN;

-- Notifications (one row per per-user push). Idempotent if already exists.
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    payload JSONB DEFAULT '{}'::jsonb,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Notifications self read" ON notifications;
CREATE POLICY "Notifications self read" ON notifications FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Notifications admin write" ON notifications;
CREATE POLICY "Notifications admin write" ON notifications FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- System alerts (admin-only)
CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    severity TEXT NOT NULL CHECK (severity IN ('info','warn','error','critical')),
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "system_alerts admin all" ON system_alerts;
CREATE POLICY "system_alerts admin all" ON system_alerts FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE INDEX IF NOT EXISTS idx_system_alerts_created ON system_alerts(created_at DESC);

-- video_scripts: full 30-45 min lecture script + visual cue markers
CREATE TABLE IF NOT EXISTS video_scripts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    subject TEXT,
    paper TEXT,                                -- 'Prelims', 'GS1', 'GS2', 'GS3', 'GS4', 'Essay', 'Optional'
    title TEXT NOT NULL,
    script_text TEXT NOT NULL,
    script_markers JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{time_seconds, visual_cue, narration_chunk, duration_seconds}]
    chapters JSONB NOT NULL DEFAULT '[]'::jsonb,        -- [{time_seconds, label}]
    duration_target_seconds INT DEFAULT 1800,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','rendering','rendered','published','failed')),
    generated_by_agent TEXT DEFAULT 'AIVideoAgent',
    source_citations JSONB DEFAULT '[]'::jsonb,
    flesch_kincaid_grade NUMERIC,
    language TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL
);
ALTER TABLE video_scripts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "video_scripts public read" ON video_scripts;
CREATE POLICY "video_scripts public read" ON video_scripts
    FOR SELECT USING (status = 'published' OR status = 'rendered' OR is_admin());
DROP POLICY IF EXISTS "video_scripts admin write" ON video_scripts;
CREATE POLICY "video_scripts admin write" ON video_scripts
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE INDEX IF NOT EXISTS idx_video_scripts_status ON video_scripts(status);
CREATE INDEX IF NOT EXISTS idx_video_scripts_topic ON video_scripts(topic_id);

-- video_lectures: rendered MP4 metadata + signed URL
CREATE TABLE IF NOT EXISTS video_lectures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    script_id UUID REFERENCES video_scripts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    duration_seconds INT,
    storage_path TEXT,                         -- inside the 'videos' bucket
    signed_url TEXT,
    signed_url_expires_at TIMESTAMPTZ,
    captions_url TEXT,
    chapters JSONB DEFAULT '[]'::jsonb,
    waveform_url TEXT,
    thumbnail_url TEXT,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','rendering','encoding','published','failed')),
    comfy_prompt_id TEXT,
    render_meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    published_at TIMESTAMPTZ
);
ALTER TABLE video_lectures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "video_lectures public read" ON video_lectures;
CREATE POLICY "video_lectures public read" ON video_lectures
    FOR SELECT USING (status = 'published' OR is_admin());
DROP POLICY IF EXISTS "video_lectures admin write" ON video_lectures;
CREATE POLICY "video_lectures admin write" ON video_lectures
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE INDEX IF NOT EXISTS idx_video_lectures_status_published ON video_lectures(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_lectures_script ON video_lectures(script_id);

-- video_notes: in-video timestamped notes (user-self)
CREATE TABLE IF NOT EXISTS video_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lecture_id UUID NOT NULL REFERENCES video_lectures(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    time_seconds INT NOT NULL CHECK (time_seconds >= 0),
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE video_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "video_notes self read" ON video_notes;
CREATE POLICY "video_notes self read" ON video_notes FOR SELECT USING (user_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS "video_notes self insert" ON video_notes;
CREATE POLICY "video_notes self insert" ON video_notes FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "video_notes self update" ON video_notes;
CREATE POLICY "video_notes self update" ON video_notes FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "video_notes self delete" ON video_notes;
CREATE POLICY "video_notes self delete" ON video_notes FOR DELETE USING (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_video_notes_lecture_user ON video_notes(lecture_id, user_id);
CREATE INDEX IF NOT EXISTS idx_video_notes_user_created ON video_notes(user_id, created_at DESC);

-- video_qa: in-video question/answer (user-self)
CREATE TABLE IF NOT EXISTS video_qa (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lecture_id UUID NOT NULL REFERENCES video_lectures(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    time_seconds INT,
    question TEXT NOT NULL,
    answer TEXT,
    source_chunks JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE video_qa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "video_qa self read" ON video_qa;
CREATE POLICY "video_qa self read" ON video_qa FOR SELECT USING (user_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS "video_qa self insert" ON video_qa;
CREATE POLICY "video_qa self insert" ON video_qa FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_video_qa_lecture_user ON video_qa(lecture_id, user_id);

-- video_render_jobs: DB-side audit mirror of the BullMQ render queue
CREATE TABLE IF NOT EXISTS video_render_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    script_id UUID REFERENCES video_scripts(id) ON DELETE SET NULL,
    lecture_id UUID REFERENCES video_lectures(id) ON DELETE SET NULL,
    queue_job_id TEXT,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed','cancelled')),
    attempt INT DEFAULT 0,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    error_text TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE video_render_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "video_render_jobs admin all" ON video_render_jobs;
CREATE POLICY "video_render_jobs admin all" ON video_render_jobs FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE INDEX IF NOT EXISTS idx_video_render_jobs_status ON video_render_jobs(status, created_at DESC);

-- Touch trigger for updated_at on video_scripts/video_lectures/video_notes
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_video_scripts_touch ON video_scripts;
CREATE TRIGGER trg_video_scripts_touch BEFORE UPDATE ON video_scripts
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS trg_video_lectures_touch ON video_lectures;
CREATE TRIGGER trg_video_lectures_touch BEFORE UPDATE ON video_lectures
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS trg_video_notes_touch ON video_notes;
CREATE TRIGGER trg_video_notes_touch BEFORE UPDATE ON video_notes
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

COMMIT;
