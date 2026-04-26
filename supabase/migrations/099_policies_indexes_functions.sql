-- prepx Database Schema (MVP v1)
-- Supabase PostgreSQL + pgvector
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
-- 1. Users (managed by Supabase Auth, extended with profile data)
-- 2. Topics (Polity seed topics for MVP)
-- 3. Daily Plans (per user, per day)
-- 4. Quizzes (generated per topic)
-- 5. Quiz Attempts (user submissions)
-- 6. User Weak Areas (gap tracking)
-- 7. Activity Log (telemetry for OMTM)
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
-- Sprint 4: Day 14 Reveal cohorts
-- Sprint 5: Monetization
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
ALTER TABLE nudge_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own nudges" ON nudge_log FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX idx_nudge_log_user ON nudge_log(user_id);
CREATE INDEX idx_nudge_log_status ON nudge_log(status);
-- Sprint 7: Answer Writing Attempts
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
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON user_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON user_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own notifications" ON user_notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_notifications_user_read ON user_notifications(user_id, read);
-- Sprint 8: F2 — Collector Coins (In-App Economy)
ALTER TABLE user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own balance" ON user_balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own balance" ON user_balances FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users read own transactions" ON coin_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own transactions" ON coin_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE UNIQUE INDEX idx_coin_transactions_idempotent ON coin_transactions(user_id, idempotency_key);
CREATE INDEX idx_coin_transactions_user ON coin_transactions(user_id, created_at DESC);
-- Sprint 8: F1 — Rank Oracle (Predictive Rank Engine)
ALTER TABLE user_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own predictions" ON user_predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users upsert own predictions" ON user_predictions FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_user_predictions_user ON user_predictions(user_id, created_at DESC);
-- Sprint 8: F3 — Streak Battles
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
-- Sprint 9: Daily Dhwani (AI Current Affairs Podcast)
-- Sprint 9: Battle Royale (Live Quiz Tournament)
-- Sprint 9: Telegram Bot
-- Indexes for Sprint 9 tables
CREATE INDEX idx_daily_dhwani_date ON daily_dhwani(date);
CREATE INDEX idx_battle_events_status ON battle_royale_events(status);
CREATE INDEX idx_battle_participants_event ON battle_royale_participants(event_id);
CREATE INDEX idx_battle_royale_participants_user ON battle_royale_participants(user_id);
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
ALTER TABLE astra_scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Astra scripts public read" ON astra_scripts FOR SELECT USING (true);
CREATE POLICY "Admin insert astra scripts" ON astra_scripts FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin update astra scripts" ON astra_scripts FOR UPDATE USING (true);
CREATE INDEX idx_astra_scripts_topic ON astra_scripts(topic);
CREATE INDEX idx_astra_scripts_status ON astra_scripts(status);
-- Sprint 10: F2 — Essay Colosseum (Peer-Review + AI Evaluation Arena)
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
ALTER TABLE user_office_ranks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own rank" ON user_office_ranks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own rank" ON user_office_ranks FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_user_ranks ON user_office_ranks(user_id);
-- Sprint 10: F4 — Territory Conquest (India Squad Map)
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
ALTER TABLE white_label_tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants public read" ON white_label_tenants FOR SELECT USING (true);
CREATE POLICY "Admin manage tenants" ON white_label_tenants FOR ALL USING (true);
CREATE INDEX idx_tenants_slug ON white_label_tenants(slug);
-- Phase 1 Fix 1.10: RLS on public-content and user-data tables
-- Topics: all authenticated users read; admin write
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Topics read all auth" ON topics FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Topics admin write" ON topics FOR ALL USING (EXISTS (
  SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
));
-- Quizzes: all authenticated users read; admin write
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quizzes read all auth" ON quizzes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Quizzes admin write" ON quizzes FOR ALL USING (EXISTS (
  SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
));
-- Squads: all authenticated users read; admin write
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Squads read all auth" ON squads FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Squads admin write" ON squads FOR ALL USING (EXISTS (
  SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
));
-- Squad members: read own squad memberships + see squad mates; manage by admin
ALTER TABLE squad_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Squad members read own" ON squad_members FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM squad_members sm WHERE sm.squad_id = squad_members.squad_id AND sm.user_id = auth.uid()
  )
);
CREATE POLICY "Squad members admin write" ON squad_members FOR ALL USING (EXISTS (
  SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
));
-- User cohorts: read own only; admin can read all
ALTER TABLE user_cohorts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User cohorts read own" ON user_cohorts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "User cohorts admin all" ON user_cohorts FOR ALL USING (EXISTS (
  SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
));
