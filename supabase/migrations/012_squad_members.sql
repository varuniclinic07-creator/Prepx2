CREATE TABLE squad_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    squad_id UUID REFERENCES squads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('leader', 'member')),
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(squad_id, user_id)
);
