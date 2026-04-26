CREATE TABLE user_weak_areas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    gap_type TEXT CHECK (gap_type IN ('silly', 'concept', 'time')),
    severity INT CHECK (severity BETWEEN 1 AND 5),
    detected_at TIMESTAMPTZ DEFAULT now(),
    auto_injected_at TIMESTAMPTZ,
    UNIQUE(user_id, topic_id, gap_type)
);
