CREATE TABLE territory_wars (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    state_target TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('scheduled', 'active', 'completed')),
    winner_squad_id UUID REFERENCES squads(id) ON DELETE SET NULL,
    scheduled_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
