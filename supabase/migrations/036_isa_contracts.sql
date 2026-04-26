CREATE TABLE isa_contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'voided')),
    enrollment_date TIMESTAMPTZ DEFAULT now(),
    prelims_cleared BOOLEAN DEFAULT false,
    mains_cleared BOOLEAN DEFAULT false,
    final_selected BOOLEAN DEFAULT false,
    total_due INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
