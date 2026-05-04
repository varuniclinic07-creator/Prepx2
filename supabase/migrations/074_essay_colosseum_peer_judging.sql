-- Sprint 7-B: Essay Colosseum peer-judging + IDOR fix
-- 1. Add invited_user_id to matches (decouple invite-target from accepted-opponent)
-- 2. Add 'pending'/'accepted' as valid statuses
-- 3. Create essay_peer_judgments table
-- 4. Create leaderboard view
-- 5. Add RLS so invited users can SELECT pending matches and submissions on closed matches are publicly visible

ALTER TABLE essay_colosseum_matches
  ADD COLUMN IF NOT EXISTS invited_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

UPDATE essay_colosseum_matches
  SET invited_user_id = opponent_id
  WHERE invited_user_id IS NULL AND opponent_id IS NOT NULL;

ALTER TABLE essay_colosseum_matches DROP CONSTRAINT IF EXISTS essay_colosseum_matches_status_check;
ALTER TABLE essay_colosseum_matches
  ADD CONSTRAINT essay_colosseum_matches_status_check
  CHECK (status IN ('open', 'pending', 'accepted', 'closed'));

CREATE INDEX IF NOT EXISTS idx_essay_matches_invited ON essay_colosseum_matches(invited_user_id);

-- Replace SELECT policy on matches so invited users can see their incoming pending invites,
-- and so anyone authenticated can see closed matches (transparent leaderboard prerequisite).
DROP POLICY IF EXISTS "Users read matches" ON essay_colosseum_matches;
CREATE POLICY "Users read matches" ON essay_colosseum_matches
  FOR SELECT USING (
    auth.uid() = initiator_id
    OR auth.uid() = opponent_id
    OR auth.uid() = invited_user_id
    OR status = 'closed'
  );

-- Allow invited users to update (to accept) — UPDATE policy from 099 only allowed initiator/opponent.
DROP POLICY IF EXISTS "Users update own matches" ON essay_colosseum_matches;
CREATE POLICY "Users update own matches" ON essay_colosseum_matches
  FOR UPDATE USING (
    auth.uid() = initiator_id
    OR auth.uid() = opponent_id
    OR auth.uid() = invited_user_id
  );

-- Allow read of submissions on closed matches (so leaderboard + peer-judging can show them).
DROP POLICY IF EXISTS "Users read submissions" ON essay_colosseum_submissions;
CREATE POLICY "Users read submissions" ON essay_colosseum_submissions
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM essay_colosseum_matches m
      WHERE m.id = essay_colosseum_submissions.match_id AND m.status = 'closed'
    )
  );

-- Peer judgments table
CREATE TABLE IF NOT EXISTS essay_peer_judgments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID REFERENCES essay_colosseum_submissions(id) ON DELETE CASCADE NOT NULL,
  match_id UUID REFERENCES essay_colosseum_matches(id) ON DELETE CASCADE NOT NULL,
  judge_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  score_structure SMALLINT CHECK (score_structure BETWEEN 1 AND 10),
  score_argument SMALLINT CHECK (score_argument BETWEEN 1 AND 10),
  score_clarity SMALLINT CHECK (score_clarity BETWEEN 1 AND 10),
  score_overall SMALLINT CHECK (score_overall BETWEEN 1 AND 10) NOT NULL,
  feedback TEXT CHECK (length(feedback) <= 2000),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(submission_id, judge_id)
);

CREATE INDEX IF NOT EXISTS idx_peer_judgments_submission ON essay_peer_judgments(submission_id);
CREATE INDEX IF NOT EXISTS idx_peer_judgments_match ON essay_peer_judgments(match_id);
CREATE INDEX IF NOT EXISTS idx_peer_judgments_judge ON essay_peer_judgments(judge_id);

ALTER TABLE essay_peer_judgments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read peer judgments for closed matches" ON essay_peer_judgments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM essay_colosseum_matches m
      WHERE m.id = essay_peer_judgments.match_id AND m.status = 'closed'
    )
  );

CREATE POLICY "Insert own peer judgment" ON essay_peer_judgments
  FOR INSERT WITH CHECK (
    auth.uid() = judge_id
    AND EXISTS (
      SELECT 1 FROM essay_colosseum_matches m
      WHERE m.id = essay_peer_judgments.match_id
        AND m.status = 'closed'
        AND m.initiator_id <> auth.uid()
        AND COALESCE(m.opponent_id, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid()
    )
  );

-- Leaderboard view
CREATE OR REPLACE VIEW essay_colosseum_leaderboard AS
SELECT
  u.id AS user_id,
  u.email,
  COUNT(DISTINCT m.id) FILTER (WHERE m.winner_user_id = u.id) AS wins,
  COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'closed' AND (m.initiator_id = u.id OR m.opponent_id = u.id)) AS matches_played,
  COALESCE(AVG(pj.score_overall), 0)::numeric(4,2) AS avg_peer_score,
  COUNT(pj.id) AS peer_judgments_received,
  MAX(m.completed_at) AS last_match_at
FROM users u
LEFT JOIN essay_colosseum_matches m ON (m.initiator_id = u.id OR m.opponent_id = u.id) AND m.status = 'closed'
LEFT JOIN essay_colosseum_submissions s ON s.user_id = u.id
LEFT JOIN essay_peer_judgments pj ON pj.submission_id = s.id
GROUP BY u.id, u.email;

GRANT SELECT ON essay_colosseum_leaderboard TO authenticated, anon;
