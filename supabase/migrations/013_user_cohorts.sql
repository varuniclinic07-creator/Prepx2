CREATE TABLE user_cohorts (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
    cohort_start_date DATE DEFAULT CURRENT_DATE,
    day_14_revealed BOOLEAN DEFAULT false,
    baseline_readiness FLOAT DEFAULT 0,
    day_14_readiness FLOAT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);
