CREATE TABLE streak_battles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    initiator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    duration_days INT DEFAULT 7,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
    wager_coins INT DEFAULT 0,
    winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ
);
