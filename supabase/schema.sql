-- prepx Database Schema (MVP v1)
-- Supabase PostgreSQL + pgvector

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Users (managed by Supabase Auth, extended with profile data)
CREATE TABLE users (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'premium', 'premium_plus')),
    role TEXT DEFAULT 'aspirant' CHECK (role IN ('aspirant', 'admin', 'moderator')),
    preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'hi')),
    baseline_score INT,
    weak_areas JSONB DEFAULT '[]'::jsonb,
    streak_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Topics (Polity seed topics for MVP)
CREATE TABLE topics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    subject TEXT DEFAULT 'polity',
    content JSONB NOT NULL,
    readability_score FLOAT,
    embedding VECTOR(1536),
    source_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    version INT DEFAULT 1
);

-- 3. Daily Plans (per user, per day)
CREATE TABLE daily_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_date DATE NOT NULL,
    tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    UNIQUE(user_id, plan_date)
);

-- 4. Quizzes (generated per topic)
CREATE TABLE quizzes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    error_type_labels JSONB DEFAULT '[]'::jsonb,
    generated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Quiz Attempts (user submissions)
CREATE TABLE quiz_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    score INT NOT NULL DEFAULT 0,
    max_score INT NOT NULL DEFAULT 0,
    response JSONB NOT NULL DEFAULT '{}'::jsonb,
    answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    error_breakdown JSONB DEFAULT '{}'::jsonb,
    diagnosis TEXT,
    completed_at TIMESTAMPTZ DEFAULT now()
);

-- 6. User Weak Areas (gap tracking)
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

-- 7. Activity Log (telemetry for OMTM)
CREATE TABLE activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_weak_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Users can only read their own data
CREATE POLICY "Users read own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users read own plans" ON daily_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own plans" ON daily_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own plans" ON daily_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users read own attempts" ON quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own attempts" ON quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own weak areas" ON user_weak_areas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read own activity" ON activity_log FOR SELECT USING (auth.uid() = user_id);

-- Topics and quizzes are public read (read-only corpus)
CREATE POLICY "Topics public read" ON topics FOR SELECT USING (true);
CREATE POLICY "Quizzes public read" ON quizzes FOR SELECT USING (true);

-- Indexes for performance
CREATE INDEX idx_daily_plans_user_date ON daily_plans(user_id, plan_date);
CREATE INDEX idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX idx_weak_areas_user ON user_weak_areas(user_id);
CREATE INDEX idx_topics_embedding ON topics USING ivfflat (embedding vector_cosine_ops);

-- 8. User Sessions (Hermes State Machine)
CREATE TABLE user_sessions (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
    session_state TEXT DEFAULT 'idle' CHECK (session_state IN ('idle', 'planning', 'ready', 'studying', 'quizzing', 'feedback', 'adapting', 'done')),
    current_topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    current_quiz_id UUID REFERENCES quizzes(id) ON DELETE SET NULL,
    daily_plan_id UUID REFERENCES daily_plans(id) ON DELETE SET NULL,
    last_activity_at TIMESTAMPTZ DEFAULT now(),
    readiness_score FLOAT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE agent_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    agent_type TEXT NOT NULL,
    status TEXT DEFAULT 'queued',
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- RLS for new tables
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own sessions" ON user_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own sessions" ON user_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own tasks" ON agent_tasks FOR ALL USING (auth.uid() = user_id);

-- Indexes for new tables
CREATE INDEX idx_user_sessions_state ON user_sessions(session_state);
CREATE INDEX idx_user_sessions_activity ON user_sessions(last_activity_at);
CREATE INDEX idx_agent_tasks_type ON agent_tasks(agent_type);

-- Sprint 4: Study Squads
CREATE TABLE squads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    subject TEXT DEFAULT 'polity',
    invite_code TEXT NOT NULL UNIQUE,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE squad_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    squad_id UUID REFERENCES squads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('leader', 'member')),
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(squad_id, user_id)
);

-- Sprint 4: Day 14 Reveal cohorts
CREATE TABLE user_cohorts (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
    cohort_start_date DATE DEFAULT CURRENT_DATE,
    day_14_revealed BOOLEAN DEFAULT false,
    baseline_readiness FLOAT DEFAULT 0,
    day_14_readiness FLOAT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Sprint 5: Monetization
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

CREATE TABLE feature_flags (
    flag_name TEXT PRIMARY KEY,
    enabled_for TEXT DEFAULT 'free' CHECK (enabled_for IN ('free', 'premium', 'premium_plus')),
    rollout_percentage INT DEFAULT 100 CHECK (rollout_percentage BETWEEN 0 AND 100)
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own subscription" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own subscription" ON subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Feature flags public read" ON feature_flags FOR SELECT USING (true);

CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_plan ON subscriptions(plan);

-- Seed default feature flags
INSERT INTO feature_flags (flag_name, enabled_for) VALUES
('pdf_export', 'premium_plus'),
('advanced_analytics', 'premium'),
('government_sources', 'premium_plus'),
('predictive_questions', 'premium'),
('study_squads', 'free'),
('daily_plan', 'free'),
('basic_quiz', 'free');

-- Sprint 6: Nudge System
CREATE TABLE nudge_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    nudge_type TEXT NOT NULL CHECK (nudge_type IN ('day_7_reminder', 'day_13_urgency', 'reveal_ready')),
    channel TEXT DEFAULT 'email' CHECK (channel IN ('email', 'whatsapp', 'push')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    scheduled_at TIMESTAMPTZ DEFAULT now(),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE nudge_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own nudges" ON nudge_log FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX idx_nudge_log_user ON nudge_log(user_id);
CREATE INDEX idx_nudge_log_status ON nudge_log(status);

-- Sprint 7: Answer Writing Attempts
CREATE TABLE mains_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    answer_text TEXT NOT NULL,
    scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    word_count INT NOT NULL DEFAULT 0,
    duration_seconds INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE mains_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own attempts" ON mains_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own attempts" ON mains_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_mains_attempts_user ON mains_attempts(user_id, created_at DESC);

-- Hindi translation support for bilingual content
ALTER TABLE topics ADD COLUMN IF NOT EXISTS content_hi JSONB;
CREATE INDEX idx_topics_content_hi ON topics USING gin (content_hi);

-- Vector search function for semantic topic matching
CREATE OR REPLACE FUNCTION match_topics(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE(
  id uuid,
  title text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    topics.id,
    topics.title,
    1 - (topics.embedding <=> query_embedding) AS similarity
  FROM topics
  WHERE 1 - (topics.embedding <=> query_embedding) > match_threshold
  ORDER BY topics.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Sprint 7 Corrective: User Notifications (Nudge Delivery)
CREATE TABLE user_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications" ON user_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON user_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own notifications" ON user_notifications FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_notifications_user_read ON user_notifications(user_id, read);
