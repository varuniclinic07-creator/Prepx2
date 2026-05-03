CREATE TABLE answer_evaluations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES mains_attempts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  overall_score FLOAT NOT NULL,
  structure_score FLOAT NOT NULL,
  content_score FLOAT NOT NULL,
  analysis_score FLOAT NOT NULL,
  presentation_score FLOAT NOT NULL,
  structure_feedback TEXT,
  content_feedback TEXT,
  analysis_feedback TEXT,
  presentation_feedback TEXT,
  summary TEXT,
  next_steps TEXT[],
  word_count INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE answer_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own evaluations"
  ON answer_evaluations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own evaluations"
  ON answer_evaluations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_answer_evals_user ON answer_evaluations(user_id, created_at DESC);
CREATE INDEX idx_answer_evals_attempt ON answer_evaluations(attempt_id);
