CREATE TABLE feature_flags (
    flag_name TEXT PRIMARY KEY,
    enabled_for TEXT DEFAULT 'free' CHECK (enabled_for IN ('free', 'premium', 'premium_plus')),
    rollout_percentage INT DEFAULT 100 CHECK (rollout_percentage BETWEEN 0 AND 100)
);
