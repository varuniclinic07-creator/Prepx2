CREATE TABLE daily_dhwani (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    gs_paper TEXT,
    stories JSONB DEFAULT '[]'::jsonb,
    script_text TEXT,
    audio_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
