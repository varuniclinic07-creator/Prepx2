# PrepX Workspace Index

**PrepX** — UPSC CSE exam preparation SaaS platform with real-time competitive features, AI-powered tutoring, content generation, and multi-tenant support. Built on Next.js 15, Supabase, and multi-tier AI provider routing.

---

## Top-Level Configuration & Build Files

### Configuration

- **[next.config.ts](./next.config.ts)** - Next.js standalone output, strict mode, remote images
- **[tsconfig.json](./tsconfig.json)** - TypeScript strict mode with @/* path alias
- **[package.json](./package.json)** - Next.js 15, React 18, Supabase, Playwright, Vitest
- **[tailwind.config.ts](./tailwind.config.ts)** - Tailwind CSS content from app/ and components/
- **[postcss.config.js](./postcss.config.js)** - PostCSS with Tailwind and Autoprefixer
- **[vitest.config.ts](./vitest.config.ts)** - Vitest with React plugin, jsdom environment
- **[vitest.setup.ts](./vitest.setup.ts)** - Testing library jest-dom assertion imports
- **[vercel.json](./vercel.json)** - Vercel deployment with Supabase env vars

### Docker & Deployment

- **[Dockerfile](./Dockerfile)** - 3-stage multi-stage build on Node 20-alpine
- **[docker-compose.yml](./docker-compose.yml)** - Dev stack: app, PostgreSQL 16, pgAdmin, Redis 7, ComfyUI
- **[docker-compose.vps.yml](./docker-compose.vps.yml)** - Production stack: Traefik, Supabase, MinIO, Prometheus, Grafana, n8n
- **[deploy.sh](./deploy.sh)** - VPS deployment with Kong gateway and env validation

### Security & Documentation

- **[BACKEND_SECURITY_AUDIT.md](./BACKEND_SECURITY_AUDIT.md)** - Security audit of 32 API routes with P0/P1 findings
- **[middleware.ts](./middleware.ts)** - Rate limiting, admin protection, Supabase session management
- **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Complete deployment guide with AI provider setup

### Development Tools

- **[generate_all_subjects.py](./generate_all_subjects.py)** - Seed data generator for 21 UPSC subjects
- **[next-env.d.ts](./next-env.d.ts)** - Next.js auto-generated type definitions

---

## app/ — Next.js 15 App Router

### Layout & Error Handling

- **[app/layout.tsx](./app/layout.tsx)** - Root layout with navbar, auth, theme
- **[app/error.tsx](./app/error.tsx)** - Client-side error boundary
- **[app/global-error.tsx](./app/global-error.tsx)** - Global error boundary
- **[app/not-found.tsx](./app/not-found.tsx)** - 404 page
- **[app/loading.tsx](./app/loading.tsx)** - Root loading skeleton

### Core Pages

- **[app/page.tsx](./app/page.tsx)** - Dashboard with daily plan, stats, streak tracking
- **[app/login/page.tsx](./app/login/page.tsx)** - Login page
- **[app/signup/page.tsx](./app/signup/page.tsx)** - Signup page
- **[app/logout/route.ts](./app/logout/route.ts)** - Logout endpoint
- **[app/onboarding/page.tsx](./app/onboarding/page.tsx)** - Baseline assessment after signup
- **[app/profile/page.tsx](./app/profile/page.tsx)** - User profile and settings
- **[app/pricing/page.tsx](./app/pricing/page.tsx)** - Subscription plans with Razorpay integration

### Learning & Quiz

- **[app/quiz/[id]/page.tsx](./app/quiz/[id]/page.tsx)** - Quiz attempt with questions and feedback
- **[app/quiz/[id]/loading.tsx](./app/quiz/[id]/loading.tsx)** - Quiz loading state
- **[app/topic/[id]/page.tsx](./app/topic/[id]/page.tsx)** - Topic content viewer (definitions, concepts, PYQs)
- **[app/topic/[id]/loading.tsx](./app/topic/[id]/loading.tsx)** - Topic loading state
- **[app/rank/page.tsx](./app/rank/page.tsx)** - UPSC rank predictor
- **[app/rank/RefreshButton.tsx](./app/rank/RefreshButton.tsx)** - Rank prediction refresh trigger
- **[app/ranks/page.tsx](./app/ranks/page.tsx)** - Leaderboard ranking
- **[app/predictions/page.tsx](./app/predictions/page.tsx)** - Score prediction interface
- **[app/sources/page.tsx](./app/sources/page.tsx)** - Content sources and references
- **[app/mnemonics/page.tsx](./app/mnemonics/page.tsx)** - Mnemonic generator for quick recall

### Gamification & Community

- **[app/battles/page.tsx](./app/battles/page.tsx)** - 1v1 streak battles with wagers
- **[app/battle-royale/page.tsx](./app/battle-royale/page.tsx)** - Multi-player elimination battle royale
- **[app/squads/page.tsx](./app/squads/page.tsx)** - Squads and collaborative learning
- **[app/territory/page.tsx](./app/territory/page.tsx)** - Territory conquest map-based game
- **[app/essay-colosseum/page.tsx](./app/essay-colosseum/page.tsx)** - Essay submission and peer comparison arena
- **[app/race/page.tsx](./app/race/page.tsx)** - Quick speed quiz mode
- **[app/shop/page.tsx](./app/shop/page.tsx)** - Coin shop and rewards

### AI Features

- **[app/astra/page.tsx](./app/astra/page.tsx)** - Astra video script generation from topics
- **[app/dhwani/page.tsx](./app/dhwani/page.tsx)** - Dhwani audio content player with transcription
- **[app/dhwani/AudioPlayer.tsx](./app/dhwani/AudioPlayer.tsx)** - Audio playback UI component
- **[app/dhwani/DownloadDhwani.tsx](./app/dhwani/DownloadDhwani.tsx)** - Download audio feature
- **[app/interview/page.tsx](./app/interview/page.tsx)** - Mock interview with AI evaluation
- **[app/voice/page.tsx](./app/voice/page.tsx)** - Voice-based note taking and transcription
- **[app/tutors/page.tsx](./app/tutors/page.tsx)** - AI tutor marketplace and hiring
- **[app/tutors/create/page.tsx](./app/tutors/create/page.tsx)** - Create custom AI tutor
- **[app/tutors/[id]/page.tsx](./app/tutors/[id]/page.tsx)** - Individual tutor interaction
- **[app/isa/page.tsx](./app/isa/page.tsx)** - Income Share Agreement financing

### Spatial & Visualization

- **[app/spatial/page.tsx](./app/spatial/page.tsx)** - 3D spatial topic browser (Three.js)
- **[app/reveal/page.tsx](./app/reveal/page.tsx)** - Answer reveal and explanation interface

### Admin Pages

- **[app/admin/page.tsx](./app/admin/page.tsx)** - Admin dashboard
- **[app/admin/layout.tsx](./app/admin/layout.tsx)** - Admin layout with role protection
- **[app/admin/content/page.tsx](./app/admin/content/page.tsx)** - Content management (topics, quizzes)
- **[app/admin/subjects/page.tsx](./app/admin/subjects/page.tsx)** - Subject and curriculum management
- **[app/admin/quizzes/page.tsx](./app/admin/quizzes/page.tsx)** - Quiz creation and editing
- **[app/admin/ai-providers/page.tsx](./app/admin/ai-providers/page.tsx)** - AI provider configuration and testing
- **[app/admin/guides/page.tsx](./app/admin/guides/page.tsx)** - Knowledge base and guide management
- **[app/admin/hermes/page.tsx](./app/admin/hermes/page.tsx)** - State machine and agent workflow editor
- **[app/admin/nudges/page.tsx](./app/admin/nudges/page.tsx)** - Notification and nudge campaign manager
- **[app/admin/pricing/page.tsx](./app/admin/pricing/page.tsx)** - Subscription plan management
- **[app/admin/scraper/page.tsx](./app/admin/scraper/page.tsx)** - Web content scraper monitoring
- **[app/admin/tutors/page.tsx](./app/admin/tutors/page.tsx)** - AI tutor administration
- **[app/admin/isa/page.tsx](./app/admin/isa/page.tsx)** - ISA contract and payment admin
- **[app/admin/bot/page.tsx](./app/admin/bot/page.tsx)** - Telegram bot integration settings
- **[app/admin/white-label/page.tsx](./app/admin/white-label/page.tsx)** - White-label tenant management
- **[app/admin/white-label/[slug]/page.tsx](./app/admin/white-label/[slug]/page.tsx)** - Individual tenant configuration

---

## app/api/ — Backend API Routes

### Core

- **[app/api/health/route.ts](./app/api/health/route.ts)** - Health check for orchestrators
- **[app/api/auth/callback/route.ts](./app/api/auth/callback/route.ts)** - OAuth callback handler (Supabase)

### Quiz & Learning

- **[app/api/quiz/[id]/route.ts](./app/api/quiz/[id]/route.ts)** - Quiz fetching and submission
- **[app/api/daily-plan/generate/route.ts](./app/api/daily-plan/generate/route.ts)** - AI-powered daily study plan generation
- **[app/api/daily-plan/add-topic/route.ts](./app/api/daily-plan/add-topic/route.ts)** - Add topic to daily plan
- **[app/api/predictions/route.ts](./app/api/predictions/route.ts)** - Score prediction fetch and store

### LLM & Content Generation

- **[app/api/astra/generate/route.ts](./app/api/astra/generate/route.ts)** - Video script generation via LLM
- **[app/api/dhwani/generate/route.ts](./app/api/dhwani/generate/route.ts)** - Audio script generation (admin-only)
- **[app/api/dhwani/audio/route.ts](./app/api/dhwani/audio/route.ts)** - Audio file serving
- **[app/api/mnemonics/generate/route.ts](./app/api/mnemonics/generate/route.ts)** - Mnemonic generation for topics
- **[app/api/interview/evaluate/route.ts](./app/api/interview/evaluate/route.ts)** - Mock interview evaluation
- **[app/api/interview/questions/route.ts](./app/api/interview/questions/route.ts)** - Interview question generation
- **[app/api/mains/evaluate/route.ts](./app/api/mains/evaluate/route.ts)** - Mains essay evaluation
- **[app/api/test-ai/route.ts](./app/api/test-ai/route.ts)** - AI provider testing endpoint

### Gamification

- **[app/api/battles/create/route.ts](./app/api/battles/create/route.ts)** - Create 1v1 battle
- **[app/api/battles/accept/route.ts](./app/api/battles/accept/route.ts)** - Accept battle challenge
- **[app/api/battle-royale/route.ts](./app/api/battle-royale/route.ts)** - Battle royale event management
- **[app/api/rank/predict/route.ts](./app/api/rank/predict/route.ts)** - Predict user rank
- **[app/api/squads/leaderboard/route.ts](./app/api/squads/leaderboard/route.ts)** - Squad leaderboard
- **[app/api/squads/activity/route.ts](./app/api/squads/activity/route.ts)** - Squad activity feed
- **[app/api/territory/list/route.ts](./app/api/territory/list/route.ts)** - List districts and territorial control
- **[app/api/territory/capture/route.ts](./app/api/territory/capture/route.ts)** - Capture district territory
- **[app/api/territory/auto-transition/route.ts](./app/api/territory/auto-transition/route.ts)** - Auto-calculate territory transitions
- **[app/api/essay-colosseum/create/route.ts](./app/api/essay-colosseum/create/route.ts)** - Create essay match
- **[app/api/essay-colosseum/accept/route.ts](./app/api/essay-colosseum/accept/route.ts)** - Accept essay match
- **[app/api/essay-colosseum/submit/route.ts](./app/api/essay-colosseum/submit/route.ts)** - Submit essay entry
- **[app/api/essay-colosseum/list/route.ts](./app/api/essay-colosseum/list/route.ts)** - List essay matches

### Spatial & Visualization

- **[app/api/spatial/topics/route.ts](./app/api/spatial/topics/route.ts)** - Topic content for 3D spatial browser

### Payments & Subscriptions

- **[app/api/payments/razorpay/route.ts](./app/api/payments/razorpay/route.ts)** - Razorpay order creation
- **[app/api/payments/verify/route.ts](./app/api/payments/verify/route.ts)** - Verify Razorpay payment
- **[app/api/webhooks/razorpay/route.ts](./app/api/webhooks/razorpay/route.ts)** - Razorpay webhook handler (HMAC verified)
- **[app/api/webhooks/stripe/route.ts](./app/api/webhooks/stripe/route.ts)** - Stripe webhook handler
- **[app/api/isa/enroll/route.ts](./app/api/isa/enroll/route.ts)** - Enroll in ISA contract
- **[app/api/isa/list/route.ts](./app/api/isa/list/route.ts)** - List ISA contracts
- **[app/api/isa/payment/route.ts](./app/api/isa/payment/route.ts)** - ISA milestone payment
- **[app/api/isa/payments/route.ts](./app/api/isa/payments/route.ts)** - ISA payment list
- **[app/api/tutors/hire/route.ts](./app/api/tutors/hire/route.ts)** - Hire AI tutor with payment

### Admin APIs

- **[app/api/admin/topics/route.ts](./app/api/admin/topics/route.ts)** - Create/manage topics (batch)
- **[app/api/admin/topics/[id]/route.ts](./app/api/admin/topics/[id]/route.ts)** - Update individual topic
- **[app/api/admin/quizzes/route.ts](./app/api/admin/quizzes/route.ts)** - Batch quiz management
- **[app/api/admin/quizzes/[id]/route.ts](./app/api/admin/quizzes/[id]/route.ts)** - Update individual quiz
- **[app/api/admin/nudges/[id]/route.ts](./app/api/admin/nudges/[id]/route.ts)** - Update nudge campaigns
- **[app/api/admin/isa/[id]/route.ts](./app/api/admin/isa/[id]/route.ts)** - Manage ISA contracts
- **[app/api/admin/tutors/[id]/route.ts](./app/api/admin/tutors/[id]/route.ts)** - Manage AI tutors
- **[app/api/admin/tenants/[id]/route.ts](./app/api/admin/tenants/[id]/route.ts)** - Manage multi-tenant orgs

### White-Label & Integrations

- **[app/api/white-label/tenants/route.ts](./app/api/white-label/tenants/route.ts)** - Create white-label tenant
- **[app/api/white-label/tenants/[slug]/route.ts](./app/api/white-label/tenants/[slug]/route.ts)** - Get tenant configuration
- **[app/api/bot/telegram/route.ts](./app/api/bot/telegram/route.ts)** - Telegram bot webhook
- **[app/api/scrape/run/route.ts](./app/api/scrape/run/route.ts)** - Trigger content scraper
- **[app/api/comfyui/generate/route.ts](./app/api/comfyui/generate/route.ts)** - ComfyUI video frame generation
- **[app/api/comfyui/status/route.ts](./app/api/comfyui/status/route.ts)** - ComfyUI status check
- **[app/api/comfyui/settings/route.ts](./app/api/comfyui/settings/route.ts)** - ComfyUI model settings

---

## components/ — React UI Components

- **[components/QuizComponent.tsx](./components/QuizComponent.tsx)** - Quiz UI with answer selection, scoring, coin awards
- **[components/TopicViewer.tsx](./components/TopicViewer.tsx)** - Topic content renderer (definitions, concepts, PYQs)
- **[components/DailyPlan.tsx](./components/DailyPlan.tsx)** - Daily study plan task list and progress
- **[components/AnswerComposer.tsx](./components/AnswerComposer.tsx)** - Text editor for essay and written responses
- **[components/SpatialCanvas.tsx](./components/SpatialCanvas.tsx)** - Three.js 3D topic visualization canvas
- **[components/nav/NotificationBell.tsx](./components/nav/NotificationBell.tsx)** - Notification bell with unread count dropdown

### Skeletons

- **[components/skeletons/QuizComponentSkeleton.tsx](./components/skeletons/QuizComponentSkeleton.tsx)** - Loading skeleton for quiz
- **[components/skeletons/TopicViewerSkeleton.tsx](./components/skeletons/TopicViewerSkeleton.tsx)** - Loading skeleton for topic
- **[components/skeletons/DailyPlanSkeleton.tsx](./components/skeletons/DailyPlanSkeleton.tsx)** - Loading skeleton for daily plan

---

## lib/ — Utility, Service & Business Logic

### AI & LLM Routing

- **[lib/ai-router.ts](./lib/ai-router.ts)** - Multi-tier AI provider router (9router, Ollama, Groq, Kilo, NVIDIA)
- **[lib/astra-engine.ts](./lib/astra-engine.ts)** - Video script generation from topics using LLM
- **[lib/dhwani-engine.ts](./lib/dhwani-engine.ts)** - Audio content generation and TTS integration
- **[lib/mnemonic-engine.ts](./lib/mnemonic-engine.ts)** - Mnemonic creation for memory retention
- **[lib/mains-evaluator.ts](./lib/mains-evaluator.ts)** - Essay evaluation and feedback generation
- **[lib/content-agent.ts](./lib/content-agent.ts)** - Topic content aggregation and enrichment

### Agents & State Management (Hermes)

- **[lib/agents/hermes.ts](./lib/agents/hermes.ts)** - State machine for user journey transitions
- **[lib/agents/guide-agents.ts](./lib/agents/guide-agents.ts)** - Contextual guide suggestions and nudges
- **[lib/agents/subject-teacher.ts](./lib/agents/subject-teacher.ts)** - Subject-specific tutoring agent
- **[lib/agents/subjects.ts](./lib/agents/subjects.ts)** - Subject data and curriculum structure

### Gamification & Ranking

- **[lib/battle-royale.ts](./lib/battle-royale.ts)** - Battle royale event creation and elimination
- **[lib/coins.ts](./lib/coins.ts)** - Coin economy (award, spend, transaction log)
- **[lib/rank-oracle.ts](./lib/rank-oracle.ts)** - UPSC rank prediction from score trajectory
- **[lib/rank-progression.ts](./lib/rank-progression.ts)** - Rank advancement and milestone calculations
- **[lib/territory-conquest.ts](./lib/territory-conquest.ts)** - District ownership and territorial war logic

### Content & Quiz

- **[lib/plan-generator.ts](./lib/plan-generator.ts)** - Adaptive daily plan based on weak areas
- **[lib/prediction-engine.ts](./lib/prediction-engine.ts)** - Score and performance forecasting
- **[lib/quiz-generator.ts](./lib/quiz-generator.ts)** - Quiz creation with MCQ generation
- **[lib/voice-session.ts](./lib/voice-session.ts)** - Voice recording and transcription management

### Database & Storage

- **[lib/supabase.ts](./lib/supabase.ts)** - Supabase client initialization (shared)
- **[lib/supabase-browser.ts](./lib/supabase-browser.ts)** - Browser-side Supabase client
- **[lib/supabase-server.ts](./lib/supabase-server.ts)** - Server-side Supabase client (RSC, API routes)
- **[lib/realtime.ts](./lib/realtime.ts)** - Real-time subscriptions for battles and squads

### Integration & External Services

- **[lib/comfyui-client.ts](./lib/comfyui-client.ts)** - ComfyUI API client for video frame generation
- **[lib/telegram-bot.ts](./lib/telegram-bot.ts)** - Telegram bot message handling and routing
- **[lib/tenant.ts](./lib/tenant.ts)** - Multi-tenant resolution from hostname

### Content Scraping Pipeline

- **[lib/scraper/engine.ts](./lib/scraper/engine.ts)** - Web scraper core logic with Crawl4AI
- **[lib/scraper/config.ts](./lib/scraper/config.ts)** - Scraper configuration and allowed sources
- **[lib/scraper/pipeline.ts](./lib/scraper/pipeline.ts)** - Content pipeline: extract, process, validate, store
- **[lib/scraper/ai-processor.ts](./lib/scraper/ai-processor.ts)** - LLM processing of scraped content

---

## types/ — TypeScript Definitions

- **[types/index.ts](./types/index.ts)** - Core types: Subject (21), UserRole, SubscriptionStatus, TopicContent, Question, Quiz, QuizAttempt, DailyPlan, UserProfile, RoyaleEvent

---

## supabase/ — Database Schema & Migrations

### Migrations (41 files, dependency order)

#### Core Foundation (001-007)

- **[supabase/migrations/001_extensions.sql](./supabase/migrations/001_extensions.sql)** - Enable pgvector for embeddings
- **[supabase/migrations/002_users.sql](./supabase/migrations/002_users.sql)** - Users with subscription, role, streak
- **[supabase/migrations/003_topics.sql](./supabase/migrations/003_topics.sql)** - Topics with subject, content JSONB
- **[supabase/migrations/004_daily_plans.sql](./supabase/migrations/004_daily_plans.sql)** - Daily study plans with task array
- **[supabase/migrations/005_quizzes.sql](./supabase/migrations/005_quizzes.sql)** - Quizzes with question array
- **[supabase/migrations/006_quiz_attempts.sql](./supabase/migrations/006_quiz_attempts.sql)** - Quiz submission tracking
- **[supabase/migrations/007_user_weak_areas.sql](./supabase/migrations/007_user_weak_areas.sql)** - Weak area categorization

#### Activity & Sessions (008-010)

- **[supabase/migrations/008_activity_log.sql](./supabase/migrations/008_activity_log.sql)** - User activity audit trail
- **[supabase/migrations/009_user_sessions.sql](./supabase/migrations/009_user_sessions.sql)** - Session tracking for engagement
- **[supabase/migrations/010_agent_tasks.sql](./supabase/migrations/010_agent_tasks.sql)** - Hermes agent task queue

#### Community & Groups (011-013)

- **[supabase/migrations/011_squads.sql](./supabase/migrations/011_squads.sql)** - Squad/group creation and metadata
- **[supabase/migrations/012_squad_members.sql](./supabase/migrations/012_squad_members.sql)** - Squad membership with join dates
- **[supabase/migrations/013_user_cohorts.sql](./supabase/migrations/013_user_cohorts.sql)** - Cohort-based learning groups

#### Subscriptions & Features (014-016)

- **[supabase/migrations/014_subscriptions.sql](./supabase/migrations/014_subscriptions.sql)** - Subscription plans and tiers
- **[supabase/migrations/015_feature_flags.sql](./supabase/migrations/015_feature_flags.sql)** - Feature toggles for A/B testing
- **[supabase/migrations/016_nudge_log.sql](./supabase/migrations/016_nudge_log.sql)** - Nudge/notification campaign tracking

#### Assessments & Economy (017-021)

- **[supabase/migrations/017_mains_attempts.sql](./supabase/migrations/017_mains_attempts.sql)** - Mains essay exam attempts
- **[supabase/migrations/018_user_notifications.sql](./supabase/migrations/018_user_notifications.sql)** - Notification queue and delivery
- **[supabase/migrations/019_user_balances.sql](./supabase/migrations/019_user_balances.sql)** - User coin and credit balances
- **[supabase/migrations/020_coin_transactions.sql](./supabase/migrations/020_coin_transactions.sql)** - Coin economy audit log
- **[supabase/migrations/021_user_predictions.sql](./supabase/migrations/021_user_predictions.sql)** - Rank prediction history

#### Battles & Gamification (022-026)

- **[supabase/migrations/022_streak_battles.sql](./supabase/migrations/022_streak_battles.sql)** - 1v1 streak battle setup
- **[supabase/migrations/023_battle_participants.sql](./supabase/migrations/023_battle_participants.sql)** - Battle participant scores
- **[supabase/migrations/024_daily_dhwani.sql](./supabase/migrations/024_daily_dhwani.sql)** - Daily audio episode scheduling
- **[supabase/migrations/025_battle_royale_events.sql](./supabase/migrations/025_battle_royale_events.sql)** - Battle royale event creation
- **[supabase/migrations/026_battle_royale_participants.sql](./supabase/migrations/026_battle_royale_participants.sql)** - BR participant tracking

#### External Integrations (027-028)

- **[supabase/migrations/027_user_telegrams.sql](./supabase/migrations/027_user_telegrams.sql)** - Telegram user linking
- **[supabase/migrations/028_astra_scripts.sql](./supabase/migrations/028_astra_scripts.sql)** - Generated video scripts

#### Essay & Territory (029-035)

- **[supabase/migrations/029_essay_colosseum_matches.sql](./supabase/migrations/029_essay_colosseum_matches.sql)** - Essay competition matches
- **[supabase/migrations/030_essay_colosseum_submissions.sql](./supabase/migrations/030_essay_colosseum_submissions.sql)** - Essay submissions with scores
- **[supabase/migrations/031_user_office_ranks.sql](./supabase/migrations/031_user_office_ranks.sql)** - UPSC rank predictions
- **[supabase/migrations/032_districts.sql](./supabase/migrations/032_districts.sql)** - Territory map districts
- **[supabase/migrations/033_district_topics.sql](./supabase/migrations/033_district_topics.sql)** - District-topic associations
- **[supabase/migrations/034_territory_ownership.sql](./supabase/migrations/034_territory_ownership.sql)** - Squad district ownership
- **[supabase/migrations/035_territory_wars.sql](./supabase/migrations/035_territory_wars.sql)** - War declarations and outcomes

#### Financing & Tutors (036-039)

- **[supabase/migrations/036_isa_contracts.sql](./supabase/migrations/036_isa_contracts.sql)** - Income Share Agreement contracts
- **[supabase/migrations/037_isa_payments.sql](./supabase/migrations/037_isa_payments.sql)** - ISA milestone payment tracking
- **[supabase/migrations/038_ai_tutors.sql](./supabase/migrations/038_ai_tutors.sql)** - AI tutor profiles and config
- **[supabase/migrations/039_tutor_subscriptions.sql](./supabase/migrations/039_tutor_subscriptions.sql)** - Tutor subscription management

#### White-Label & Media (040-041)

- **[supabase/migrations/040_white_label_tenants.sql](./supabase/migrations/040_white_label_tenants.sql)** - Multi-tenant organization configs
- **[supabase/migrations/041_comfyui_settings.sql](./supabase/migrations/041_comfyui_settings.sql)** - ComfyUI model and workflow settings

#### Policies & Indexes

- **[supabase/migrations/099_policies_indexes_functions.sql](./supabase/migrations/099_policies_indexes_functions.sql)** - RLS policies, indexes, PostgreSQL functions

### Seed Data

- **[supabase/seed.sql](./supabase/seed.sql)** - Initial test data for topics and subjects
- **[supabase/seed-quizzes.sql](./supabase/seed-quizzes.sql)** - Quiz-specific seed data
- **[supabase/schema.full.sql](./supabase/schema.full.sql)** - Complete schema dump for reference

---

## scripts/ — Utility Scripts

- **[scripts/extract_pdf.py](./scripts/extract_pdf.py)** - PDF content extraction for scraping pipeline
- **[scripts/verify_content.py](./scripts/verify_content.py)** - Content validation and readability checks

---

## e2e/ — End-to-End Playwright Tests

- **[e2e/playwright.config.ts](./e2e/playwright.config.ts)** - Playwright config (base URL, timeouts, artifacts)

### Authentication & Onboarding

- **[e2e/aspirant-login-dashboard.spec.ts](./e2e/aspirant-login-dashboard.spec.ts)** - Login flow, dashboard redirect
- **[e2e/admin-login-content-crud.spec.ts](./e2e/admin-login-content-crud.spec.ts)** - Admin login and content management

### Core Features

- **[e2e/daily-plan-generation.spec.ts](./e2e/daily-plan-generation.spec.ts)** - Daily plan API and UI rendering
- **[e2e/quiz-submission.spec.ts](./e2e/quiz-submission.spec.ts)** - Quiz attempt and scoring
- **[e2e/mnemonic-generation.spec.ts](./e2e/mnemonic-generation.spec.ts)** - Mnemonic API and display
- **[e2e/notification-bell.spec.ts](./e2e/notification-bell.spec.ts)** - Notification UI and interactions

### Gamification

- **[e2e/battle-creation-acceptance.spec.ts](./e2e/battle-creation-acceptance.spec.ts)** - 1v1 battle flows
- **[e2e/essay-colosseum-submit.spec.ts](./e2e/essay-colosseum-submit.spec.ts)** - Essay competition submission
- **[e2e/rank-prediction.spec.ts](./e2e/rank-prediction.spec.ts)** - Rank prediction refresh and display

### AI Features

- **[e2e/voice-transcript.spec.ts](./e2e/voice-transcript.spec.ts)** - Voice recording and transcription
- **[e2e/aspirant-journey.spec.ts](./e2e/aspirant-journey.spec.ts)** - Full user journey (signup to rank)

### Admin & Integrations

- **[e2e/admin-scraper.spec.ts](./e2e/admin-scraper.spec.ts)** - Content scraper admin interface
- **[e2e/tutor-creation.spec.ts](./e2e/tutor-creation.spec.ts)** - AI tutor creation and hiring
- **[e2e/isa-enrollment.spec.ts](./e2e/isa-enrollment.spec.ts)** - ISA contract enrollment flow
- **[e2e/white-label-tenant-creation.spec.ts](./e2e/white-label-tenant-creation.spec.ts)** - White-label tenant setup

### Payments

- **[e2e/razorpay-payment-flow.spec.ts](./e2e/razorpay-payment-flow.spec.ts)** - Razorpay payment processing
- **[e2e/stripe-webhook-skip.spec.ts](./e2e/stripe-webhook-skip.spec.ts)** - Stripe webhook mocking

---

## __tests__/ — Unit & Component Tests

### Components

- **[__tests__/components/QuizComponent.test.tsx](./__tests__/components/QuizComponent.test.tsx)** - QuizComponent rendering and interaction

### Business Logic

- **[__tests__/lib/ai-router.test.ts](./\__tests__/lib/ai-router.test.ts)** - AI provider routing and fallback
- **[__tests__/lib/coins.test.ts](./\__tests__/lib/coins.test.ts)** - Coin award and transaction logic
- **[__tests__/lib/mains-evaluator.test.ts](./\__tests__/lib/mains-evaluator.test.ts)** - Essay evaluation mocking
- **[__tests__/lib/prediction-engine.test.ts](./\__tests__/lib/prediction-engine.test.ts)** - Score prediction calculations
- **[__tests__/lib/rank-progression.test.ts](./\__tests__/lib/rank-progression.test.ts)** - Rank tier advancement

### Infrastructure

- **[__tests__/lib/supabase.test.ts](./\__tests__/lib/supabase.test.ts)** - Supabase client and queries
- **[__tests__/lib/tenant.test.ts](./\__tests__/lib/tenant.test.ts)** - Multi-tenant resolution logic
- **[__tests__/lib/scraper.test.ts](./\__tests__/lib/scraper.test.ts)** - Content scraper pipeline
- **[__tests__/lib/subscription.test.ts](./\__tests__/lib/subscription.test.ts)** - Subscription tier logic

---

## vps/ — VPS Production Infrastructure

- **[vps/monitoring/prometheus.yml](./vps/monitoring/prometheus.yml)** - Prometheus scrape config for metrics

---

## _bmad/ — BMad Product Design Framework

- **[_bmad/config.toml](./\_bmad/config.toml)** - Master configuration with modules and output settings
- **[_bmad/core/config.yaml](./\_bmad/core/config.yaml)** - Core module (shared utilities)
- **[_bmad/bmm/config.yaml](./\_bmad/bmm/config.yaml)** - Business Model & Messaging module
- **[_bmad/bmb/config.yaml](./\_bmad/bmb/config.yaml)** - BMad Builder (skill/workflow generation)
- **[_bmad/cis/config.yaml](./\_bmad/cis/config.yaml)** - Creative Innovation Systems module
- **[_bmad/gds/config.yaml](./\_bmad/gds/config.yaml)** - Game Design Systems module
- **[_bmad/_config/manifest.yaml](./\_bmad/_config/manifest.yaml)** - Module manifest and registry
- **[_bmad/_config/skill-manifest.csv](./\_bmad/_config/skill-manifest.csv)** - Available skills catalog
- **[_bmad/_config/bmad-help.csv](./\_bmad/_config/bmad-help.csv)** - Help documentation index

---

## Summary

| Category | Count |
|----------|-------|
| **App Pages** | ~35 user-facing routes |
| **API Endpoints** | 48+ backend routes |
| **Components** | 9 reusable UI components |
| **Lib Modules** | 31 utility/service modules |
| **DB Migrations** | 41 sequential SQL files |
| **E2E Tests** | 18 Playwright specs |
| **Unit Tests** | 10 Vitest test files |
| **Scripts** | 2 Python utilities |

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 15, React 18, Tailwind CSS, Three.js, Framer Motion |
| **Backend** | Node.js, TypeScript, Supabase (PostgreSQL + Auth), Redis |
| **AI** | 9router, Ollama, Groq (7 keys), Kilo (4 keys), NVIDIA |
| **Payments** | Razorpay, Stripe |
| **Media** | ComfyUI, Remotion, Manim, FFmpeg |
| **Infrastructure** | Docker, Traefik, Prometheus, Jaeger, Grafana, Kong, Coolify |
| **Testing** | Playwright (e2e), Vitest (unit), Testing Library |
