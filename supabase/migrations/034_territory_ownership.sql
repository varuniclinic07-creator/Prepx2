CREATE TABLE territory_ownership (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    district_id UUID REFERENCES districts(id) ON DELETE CASCADE,
    squad_id UUID REFERENCES squads(id) ON DELETE CASCADE,
    captured_at TIMESTAMPTZ DEFAULT now(),
    capture_count INT DEFAULT 1,
    UNIQUE(district_id, squad_id)
);
