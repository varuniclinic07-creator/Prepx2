CREATE TABLE ai_tutors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    creator_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    persona_prompt TEXT,
    subject TEXT DEFAULT 'polity',
    price INT DEFAULT 499,
    rating FLOAT DEFAULT 5.0,
    subscriber_count INT DEFAULT 0,
    approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
