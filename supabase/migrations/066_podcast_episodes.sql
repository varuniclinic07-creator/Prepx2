CREATE TABLE podcast_episodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  script_text TEXT NOT NULL,
  audio_url TEXT,
  duration_seconds INT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  gs_topics_covered TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE podcast_episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own episodes"
  ON podcast_episodes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own episodes"
  ON podcast_episodes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own episodes"
  ON podcast_episodes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_podcast_eps_user ON podcast_episodes(user_id, date DESC);

CREATE TABLE podcast_play_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES podcast_episodes(id) ON DELETE CASCADE,
  played_at TIMESTAMPTZ DEFAULT now(),
  played_seconds INT DEFAULT 0,
  completed BOOLEAN DEFAULT false
);

ALTER TABLE podcast_play_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own play history"
  ON podcast_play_history FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_play_hist_user ON podcast_play_history(user_id, played_at DESC);
