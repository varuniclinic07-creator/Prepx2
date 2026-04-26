CREATE TABLE isa_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id UUID REFERENCES isa_contracts(id) ON DELETE CASCADE,
    milestone TEXT NOT NULL CHECK (milestone IN ('prelims', 'mains', 'final')),
    amount INT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
    razorpay_order_id TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
