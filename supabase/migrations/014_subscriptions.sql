CREATE TABLE subscriptions (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'canceled', 'past_due', 'inactive')),
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'premium', 'premium_plus')),
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
