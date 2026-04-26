CREATE TABLE user_office_ranks (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
    current_rank TEXT DEFAULT 'ASO' CHECK (current_rank IN ('ASO', 'Deputy Collector', 'Collector', 'Secretary', 'Cabinet Secretary')),
    promoted_at TIMESTAMPTZ DEFAULT now(),
    next_rank_requirement JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);
