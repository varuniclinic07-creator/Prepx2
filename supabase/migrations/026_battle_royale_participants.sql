CREATE TABLE battle_royale_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES battle_royale_events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT now(),
    eliminated_at TIMESTAMPTZ,
    last_answer_correct BOOLEAN,
    score INT DEFAULT 0,
    UNIQUE(event_id, user_id)
);
