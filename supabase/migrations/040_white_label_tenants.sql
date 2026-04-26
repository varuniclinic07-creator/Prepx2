CREATE TABLE white_label_tenants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    primary_color TEXT DEFAULT '#10b981',
    logo_url TEXT,
    ai_coach_name TEXT DEFAULT 'PrepX Coach',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    setup_fee INT DEFAULT 200000,
    monthly_fee INT DEFAULT 50000,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
