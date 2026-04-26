CREATE TABLE user_sessions (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
    session_state TEXT DEFAULT 'idle' CHECK (session_state IN ('idle', 'planning', 'ready', 'studying', 'quizzing', 'feedback', 'adapting', 'done')),
    current_topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    current_quiz_id UUID REFERENCES quizzes(id) ON DELETE SET NULL,
    daily_plan_id UUID REFERENCES daily_plans(id) ON DELETE SET NULL,
    last_activity_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
