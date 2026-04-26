CREATE TABLE districts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    center_lat FLOAT DEFAULT 20.5937,
    center_lng FLOAT DEFAULT 78.9629,
    created_at TIMESTAMPTZ DEFAULT now()
);
