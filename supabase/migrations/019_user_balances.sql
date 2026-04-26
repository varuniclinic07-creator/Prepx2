CREATE TABLE user_balances (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
    coins INT NOT NULL DEFAULT 0,
    lifetime_earned INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
