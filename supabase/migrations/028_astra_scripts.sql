CREATE TABLE astra_scripts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    topic TEXT NOT NULL,
    subject TEXT DEFAULT 'polity',
    script JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'rendered')),
    language TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT now()
);
