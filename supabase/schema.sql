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

-- Sprint 8: F2 — Collector Coins (In-App Economy)
CREATE TABLE user_balances (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
    coins INT NOT NULL DEFAULT 0,
    lifetime_earned INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE coin_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount INT NOT NULL,
    reason TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own balance" ON user_balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own balance" ON user_balances FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users read own transactions" ON coin_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own transactions" ON coin_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX idx_coin_transactions_idempotent ON coin_transactions(user_id, idempotency_key);
CREATE INDEX idx_coin_transactions_user ON coin_transactions(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_read ON user_notifications(user_id, read);

-- Sprint 8: F1 — Rank Oracle (Predictive Rank Engine)
CREATE TABLE user_predictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    predicted_rank_min INT,
    predicted_rank_max INT,
    confidence_pct INT,
    deficit_gaps JSONB DEFAULT '[]'::jsonb,
    days_to_cutoff INT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own predictions" ON user_predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users upsert own predictions" ON user_predictions FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_user_predictions_user ON user_predictions(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_read ON user_notifications(user_id, read);

-- Sprint 8: F3 — Streak Battles
CREATE TABLE streak_battles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    initiator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    duration_days INT DEFAULT 7,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
    wager_coins INT DEFAULT 0,
    winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ
);

CREATE TABLE battle_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    battle_id UUID REFERENCES streak_battles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    current_streak INT DEFAULT 0,
    best_streak INT DEFAULT 0,
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(battle_id, user_id)
);

ALTER TABLE streak_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read battles" ON streak_battles FOR SELECT USING (auth.uid() = initiator_id);  -- simplified: participants will see battle via client query
CREATE POLICY "Users create own battles" ON streak_battles FOR INSERT WITH CHECK (auth.uid() = initiator_id);
CREATE POLICY "Users update own battles" ON streak_battles FOR UPDATE USING (auth.uid() = initiator_id);

CREATE POLICY "Users read own participation" ON battle_participants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own participation" ON battle_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own participation" ON battle_participants FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_streak_battles_status ON streak_battles(status);
CREATE INDEX idx_battle_participants_user ON battle_participants(user_id);
CREATE INDEX idx_battle_participants_battle ON battle_participants(battle_id);
CREATE INDEX idx_notifications_user_read ON user_notifications(user_id, read);
CREATE INDEX idx_notifications_user_read ON user_notifications(user_id, read);

-- Sprint 9: Daily Dhwani (AI Current Affairs Podcast)
CREATE TABLE daily_dhwani (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    gs_paper TEXT,
    stories JSONB DEFAULT '[]'::jsonb,
    script_text TEXT,
    audio_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Sprint 9: Battle Royale (Live Quiz Tournament)
CREATE TABLE battle_royale_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed')),
    prize_pool INT DEFAULT 0,
    question_count INT DEFAULT 20,
    current_question INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE battle_royale_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES battle_royale_events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT now(),
    eliminated_at TIMESTAMPTZ,
    last_answer_correct BOOLEAN,
    score INT DEFAULT 0,
    UNIQUE(event_id, user_id)
);

-- Sprint 9: Telegram Bot
CREATE TABLE user_telegrams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    chat_id TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for Sprint 9 tables
CREATE INDEX idx_daily_dhwani_date ON daily_dhwani(date);
CREATE INDEX idx_battle_events_status ON battle_royale_events(status);
CREATE INDEX idx_battle_participants_event ON battle_royale_participants(event_id);
CREATE INDEX idx_battle_participants_user ON battle_royale_participants(user_id);


-- RLS for Sprint 9 tables
ALTER TABLE daily_dhwani ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_royale_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_royale_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_telegrams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all read daily_dhwani" ON daily_dhwani FOR SELECT USING (true);
CREATE POLICY "Admin insert daily_dhwani" ON daily_dhwani FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin update daily_dhwani" ON daily_dhwani FOR UPDATE USING (true);

CREATE POLICY "Users read battle events" ON battle_royale_events FOR SELECT USING (true);
CREATE POLICY "Admin create battle events" ON battle_royale_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin update battle events" ON battle_royale_events FOR UPDATE USING (true);

CREATE POLICY "Users read own participation" ON battle_royale_participants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own participation" ON battle_royale_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own participation" ON battle_royale_participants FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users read own telegram" ON user_telegrams FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own telegram" ON user_telegrams FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Sprint 10: F1 — Astra Stream (AI Video Lecture Scripts)
CREATE TABLE astra_scripts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    topic TEXT NOT NULL,
    subject TEXT DEFAULT 'polity',
    script JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'rendered')),
    language TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE astra_scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Astra scripts public read" ON astra_scripts FOR SELECT USING (true);
CREATE POLICY "Admin insert astra scripts" ON astra_scripts FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin update astra scripts" ON astra_scripts FOR UPDATE USING (true);

CREATE INDEX idx_astra_scripts_topic ON astra_scripts(topic);
CREATE INDEX idx_astra_scripts_status ON astra_scripts(status);

-- Sprint 10: F2 — Essay Colosseum (Peer-Review + AI Evaluation Arena)
CREATE TABLE essay_colosseum_matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    topic TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    initiator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    opponent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    winner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ai_verdict JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE essay_colosseum_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID REFERENCES essay_colosseum_matches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    essay_text TEXT NOT NULL,
    word_count INT NOT NULL DEFAULT 0,
    scores JSONB DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(match_id, user_id)
);

ALTER TABLE essay_colosseum_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE essay_colosseum_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read matches" ON essay_colosseum_matches FOR SELECT USING (auth.uid() = initiator_id OR auth.uid() = opponent_id);
CREATE POLICY "Users create matches" ON essay_colosseum_matches FOR INSERT WITH CHECK (auth.uid() = initiator_id);
CREATE POLICY "Users update own matches" ON essay_colosseum_matches FOR UPDATE USING (auth.uid() = initiator_id OR auth.uid() = opponent_id);

CREATE POLICY "Users read submissions" ON essay_colosseum_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own submissions" ON essay_colosseum_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_essay_matches_status ON essay_colosseum_matches(status);
CREATE INDEX idx_essay_matches_initiator ON essay_colosseum_matches(initiator_id);
CREATE INDEX idx_essay_submissions_match ON essay_colosseum_submissions(match_id);
CREATE INDEX idx_essay_submissions_user ON essay_colosseum_submissions(user_id);

-- Sprint 10: F3 — Officer Rank Progression System
CREATE TABLE user_office_ranks (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
    current_rank TEXT DEFAULT 'ASO' CHECK (current_rank IN ('ASO', 'Deputy Collector', 'Collector', 'Secretary', 'Cabinet Secretary')),
    promoted_at TIMESTAMPTZ DEFAULT now(),
    next_rank_requirement JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_office_ranks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own rank" ON user_office_ranks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own rank" ON user_office_ranks FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_user_ranks ON user_office_ranks(user_id);

-- Sprint 10: F4 — Territory Conquest (India Squad Map)
CREATE TABLE districts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    geojson TEXT,
    center_lat FLOAT DEFAULT 20.5937,
    center_lng FLOAT DEFAULT 78.9629,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE district_topics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    district_id UUID REFERENCES districts(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    UNIQUE(district_id, topic_id)
);

CREATE TABLE territory_ownership (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    district_id UUID REFERENCES districts(id) ON DELETE CASCADE,
    squad_id UUID REFERENCES squads(id) ON DELETE CASCADE,
    captured_at TIMESTAMPTZ DEFAULT now(),
    capture_count INT DEFAULT 1,
    UNIQUE(district_id, squad_id)
);

CREATE TABLE territory_wars (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    state_target TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('scheduled', 'active', 'completed')),
    winner_squad_id UUID REFERENCES squads(id) ON DELETE SET NULL,
    scheduled_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE district_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE territory_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE territory_wars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Districts public read" ON districts FOR SELECT USING (true);
CREATE POLICY "District topics public read" ON district_topics FOR SELECT USING (true);
CREATE POLICY "Users read territory ownership" ON territory_ownership FOR SELECT USING (true);
CREATE POLICY "Admin insert ownership" ON territory_ownership FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin update ownership" ON territory_ownership FOR UPDATE USING (true);
CREATE POLICY "Users read wars" ON territory_wars FOR SELECT USING (true);

CREATE INDEX idx_districts_state ON districts(state);
CREATE INDEX idx_territory_district ON territory_ownership(district_id);
CREATE INDEX idx_territory_squad ON territory_ownership(squad_id);
CREATE INDEX idx_territory_wars_state ON territory_wars(state_target);

-- ═══════════════════════════════════════════════════════════════
-- SPRINT 11 TABLES
-- ═══════════════════════════════════════════════════════════════

-- S11F1: Pay-If-You-Clear ISA
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

ALTER TABLE isa_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE isa_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own contracts" ON isa_contracts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own contracts" ON isa_contracts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own contracts" ON isa_contracts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users read own payments" ON isa_payments FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM isa_contracts WHERE id = contract_id)
);

CREATE POLICY "Admin insert payments" ON isa_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin update payments" ON isa_payments FOR UPDATE USING (true);

CREATE INDEX idx_isa_contracts_user ON isa_contracts(user_id);
CREATE INDEX idx_isa_contracts_status ON isa_contracts(status);
CREATE INDEX idx_isa_payments_contract ON isa_payments(contract_id);

-- S11F2: AI Tutor Marketplace
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

CREATE TABLE tutor_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tutor_id UUID REFERENCES ai_tutors(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
    started_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, tutor_id)
);

ALTER TABLE ai_tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tutors public read" ON ai_tutors FOR SELECT USING (true);
CREATE POLICY "Creators insert own" ON ai_tutors FOR INSERT WITH CHECK (auth.uid() = creator_user_id);
CREATE POLICY "Creators update own" ON ai_tutors FOR UPDATE USING (auth.uid() = creator_user_id);

CREATE POLICY "Users read own subs" ON tutor_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own subs" ON tutor_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own subs" ON tutor_subscriptions FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_ai_tutors_creator ON ai_tutors(creator_user_id);
CREATE INDEX idx_ai_tutors_approved ON ai_tutors(approved);
CREATE INDEX idx_tutor_subs_user ON tutor_subscriptions(user_id);
CREATE INDEX idx_tutor_subs_tutor ON tutor_subscriptions(tutor_id);

-- S11F3: White-Label Platform
CREATE TABLE white_label_tenants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    primary_color TEXT DEFAULT '#10b981',
    logo_url TEXT,
    ai_coach_name TEXT DEFAULT 'PrepX Coach',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    setup_fee INT DEFAULT 200000,
    monthly_fee INT DEFAULT 50000,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE white_label_tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants public read" ON white_label_tenants FOR SELECT USING (true);
CREATE POLICY "Admin manage tenants" ON white_label_tenants FOR ALL USING (true);

CREATE INDEX idx_tenants_slug ON white_label_tenants(slug);
