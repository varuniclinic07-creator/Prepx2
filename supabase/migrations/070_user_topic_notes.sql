-- Sprint 6 S6-2: per-(user,topic) 3D notes surface.
--
-- Notes themselves are rendered in 3D (cards floating in R3F space). Each row
-- carries its own (x,y,z) so the user's spatial arrangement persists across
-- sessions. RLS is owner-only — auth.uid() must match user_id for any op.

CREATE TABLE IF NOT EXISTS user_topic_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  position_x numeric NOT NULL DEFAULT 0,
  position_y numeric NOT NULL DEFAULT 0,
  position_z numeric NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT 'primary'
    CHECK (color IN ('primary','cyan','saffron','success','warning','muted','magenta','gold')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_topic_notes_user_topic ON user_topic_notes(user_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_user_topic_notes_user_updated ON user_topic_notes(user_id, updated_at DESC);

ALTER TABLE user_topic_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_topic_notes_owner ON user_topic_notes;
CREATE POLICY user_topic_notes_owner ON user_topic_notes FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION touch_user_topic_notes() RETURNS trigger
  LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END
$$;
DROP TRIGGER IF EXISTS trg_user_topic_notes_touch ON user_topic_notes;
CREATE TRIGGER trg_user_topic_notes_touch BEFORE UPDATE ON user_topic_notes
  FOR EACH ROW EXECUTE FUNCTION touch_user_topic_notes();
