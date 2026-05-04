-- Sprint 6 S6-3: persistent teacher consultations (Prelims/Mains/Interview Guide).
-- One active consultation per (user, guide_type); turns persist forever.

CREATE TABLE IF NOT EXISTS teacher_consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guide_type text NOT NULL CHECK (guide_type IN ('prelims','mains','interview')),
  scope_filter text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Only one active consultation per (user, guide_type). Archived rows do NOT
-- block a new active one — partial unique index.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_consultation_per_guide
  ON teacher_consultations(user_id, guide_type)
  WHERE status = 'active';

ALTER TABLE teacher_consultations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS teacher_consultations_owner ON teacher_consultations;
CREATE POLICY teacher_consultations_owner ON teacher_consultations FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS teacher_consultation_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES teacher_consultations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','guide')),
  message text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultation_turns_time
  ON teacher_consultation_turns(consultation_id, created_at ASC);

ALTER TABLE teacher_consultation_turns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS teacher_consultation_turns_owner ON teacher_consultation_turns;
CREATE POLICY teacher_consultation_turns_owner ON teacher_consultation_turns FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teacher_consultations c
      WHERE c.id = teacher_consultation_turns.consultation_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teacher_consultations c
      WHERE c.id = teacher_consultation_turns.consultation_id
        AND c.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION touch_teacher_consultation() RETURNS trigger
  LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END
$$;
DROP TRIGGER IF EXISTS trg_teacher_consultations_touch ON teacher_consultations;
CREATE TRIGGER trg_teacher_consultations_touch BEFORE UPDATE ON teacher_consultations
  FOR EACH ROW EXECUTE FUNCTION touch_teacher_consultation();

-- Bump parent updated_at when a turn is added (so /coach lists sort by activity).
CREATE OR REPLACE FUNCTION bump_teacher_consultation_on_turn() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE teacher_consultations SET updated_at = now() WHERE id = NEW.consultation_id;
  RETURN NEW;
END
$$;
DROP TRIGGER IF EXISTS trg_consultation_turns_bump ON teacher_consultation_turns;
CREATE TRIGGER trg_consultation_turns_bump AFTER INSERT ON teacher_consultation_turns
  FOR EACH ROW EXECUTE FUNCTION bump_teacher_consultation_on_turn();
