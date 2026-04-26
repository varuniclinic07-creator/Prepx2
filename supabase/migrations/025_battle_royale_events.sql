CREATE TABLE battle_royale_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed')),
    prize_pool INT DEFAULT 0,
    question_count INT DEFAULT 20,
    current_question INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
