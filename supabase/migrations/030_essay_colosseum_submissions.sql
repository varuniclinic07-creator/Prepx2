CREATE TABLE essay_colosseum_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID REFERENCES essay_colosseum_matches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    essay_text TEXT NOT NULL,
    word_count INT NOT NULL DEFAULT 0,
    scores JSONB DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(match_id, user_id)
);
