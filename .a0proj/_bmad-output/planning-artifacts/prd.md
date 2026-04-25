---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
inputDocuments:
  - "/a0/usr/projects/prepx/.a0proj/_bmad-output/planning-artifacts/product-brief-prepx-2026-04-22.md"
  - "/a0/usr/uploads/complete book for making upsc cse app.md"
workflowType: prd
classification:
  projectType: web_app
  domain: education
  complexity: high
  projectContext: greenfield
author: User
date: 2026-04-22
videoFeatures: true
watchModeFeatures: 34
---

# Product Requirements Document — prepx

---

## 📋 Document Info

| Property | Value |
|----------|-------|
| **Product** | prepx — The UPSC Corpus OS |
| **Type** | AI-Native Learning Operating System |
| **Domain** | Education / Test Prep |
| **ICP** | The Frustrated Repeater (Age 23–28, 1–3 attempts) |
| **OMTM** | Daily Structured Study Sessions Completed |

---

## 1. Executive Summary

prepx is an AI-native Learning Operating System for UPSC CSE aspirants. At MVP, it is a **Daily Execution Engine for Aspirants** built around one closed loop:

**Plan → Study → Quiz → Feedback → Adapt**

If a feature does not improve Plan Completion, Feedback Loop Completion, or Structured Sessions — it does not ship in MVP.

**MVP Focus:** Polity, top 15–20 highest-yield topics, hybrid-curated structured content, deterministic Hermes flow, one constrained subject agent. Everything else is v2+.

**Post-MVP Vision:** 34 premium Watch Mode features including AI video lectures, 3D syllabus navigator, animated concept shorts, live interview studio, gamified metaverse, and full monetization with Free / Premium / Premium+ tiers.

---

## 2. Product Vision

**Mission:** Make coaching institutes, standard textbooks, and scattered resources obsolete for serious UPSC aspirants through an AI-native Learning OS that removes decision-making, enforces feedback loops, and builds habit.

**Success Targets:**
- 50,000 active users by Year 2
- NPS >75
- ₹2.5Cr ARR by Year 2
- 40% of users report they no longer need coaching or textbooks

---

## 3. Target Users

### Primary Users

🔥 **The Frustrated Repeater** *(ICP — 80% of decisions)*
- Age 23–28 | 1–3 attempts | Failed Prelims or Mains
- Pain: "I studied everything but still failed. I don't know what I'm doing wrong."
- Needs: Diagnosis → Strategy → Answer Improvement

⚙️ **The Time-Starved Professional**
- Age 25–32 | Working full-time
- Pain: "I have 2–4 hours. Tell me EXACTLY what to do."

🧭 **The Coaching Dropout / Self-Study Aspirant**
- Age 21–26 | Never joined / left coaching
- Pain: "I have 20+ sources but no system."

### Secondary Users
- Parents: Weekly progress reports, rank trends
- Evaluators: Mains essay + interview evaluation (v3)

---

## 4. Epics & User Stories

### Epic 1: Daily Execution Loop *(Core — MVP)*

#### Story 1.1: Diagnostic Onboarding
> **As a** new repeater user **I want** to take a 5-minute diagnostic test **So that** the app understands my weak areas

- [ ] Completes in <5 minutes
- [ ] Identifies weak topics across Polity syllabus
- [ ] Outputs baseline mock score
- [ ] Generates first personalized daily plan
- [ ] Target: >60% completion rate

#### Story 1.2: Daily Plan Generator
> **As a** repeater user **I want** to open the app and see exactly what to study today **So that** I don't waste 1–2 hours deciding

- [ ] Plan loads in <2 seconds
- [ ] Max 5 tasks (topic + CA bundle + quiz)
- [ ] Includes at least 1 feedback loop
- [ ] Auto-adjusts next day based on today's performance

#### Story 1.3: Structured Topic Content
> **As a** user studying Polity **I want** simplified 10th-class-standard notes **So that** I understand complex concepts without coaching

- [ ] Top 15–20 highest-yield Polity topics (MVP)
- [ ] 10th-class readability maintained
- [ ] Definitions, key concepts, PYQ links, common traps
- [ ] Source attribution on every fact

#### Story 1.4: Quiz + Instant Feedback
> **As a** user who just studied a topic **I want** to take MCQs and receive instant diagnosis **So that** I know my error type

- [ ] Feedback within 3 seconds: silly vs concept vs time
- [ ] Links to exact topic section for re-study
- [ ] Stores error pattern for weak area tracking

#### Story 1.5: Weak Area Auto-Injection
> **As a** user who missed a concept **I want** the system to silently include it in tomorrow's plan **So that** I don't need to track gaps

- [ ] No UI dashboard (invisible)
- [ ] Auto-injects revisits within 72 hours
- [ ] Priority: high-weight topics first

---

### Epic 2: Hermes Orchestrator *(MVP)*

#### Story 2.1: Deterministic Learning Flow
- [ ] Flow: Generate Plan → Serve Topic → Trigger Quiz → Return Feedback → Update Next Plan
- [ ] No complex multi-agent routing in MVP
- [ ] State maintained per user session

#### Story 2.2: Constrained Subject Agent (Polity Only)
- [ ] Topic-bound queries ONLY
- [ ] Syllabus-constrained responses
- [ ] Prevents hallucination by restricting to known corpus
- [ ] Response time: <3s

---

### Epic 3: Agentic Intelligence *(MVP-lite)*

#### Story 3.1: Agentic Web Search *(Admin-only MVP)*
- [ ] DuckDuckGo API for current affairs
- [ ] Manual trigger only in MVP
- [ ] Caches results for 24 hours

#### Story 3.2: Content Refiner *(System Pipeline)*
- [ ] Syllabus filter → simplifier → citer → verifier
- [ ] Output: structured topic note

#### Story 3.3: AutoDocThinker *(v2)*
- [ ] Multi-agent document RAG
- [ ] PDF, DOCX, TXT support (up to 100 pages)

#### Story 3.4: Agentic File Search *(v2)*
- [ ] Dynamic navigation without precomputed embeddings

---

### Epic 4: Admin Control Center *(Lite MVP)*

#### Story 4.1: Content Control Panel
- [ ] Upload PDF, DOCX, TXT
- [ ] Edit topic notes inline
- [ ] Tag to specific syllabus topic
- [ ] Version control

#### Story 4.2: AI Provider Configuration
- [ ] 2–3 providers in MVP (OpenAI + Groq + Anthropic)
- [ ] v2 target: 50+ providers

#### Story 4.3: Feature Controls
- [ ] Toggle any feature on/off
- [ ] Set visibility (all / paid / admin)

---

### Epic 5: User Experience *(MVP)*

#### Story 5.1: Friendly Feature Naming
- [ ] "RAG System" → "Smart Study Assistant"
- [ ] No technical jargon in UI

#### Story 5.2: Real-Time Feature Previews
- [ ] Live cards, "Updated 2 hours ago"
- [ ] Trending topics visible

#### Story 5.3: Current Affairs Bundles
- [ ] Pre-curated static bundles
- [ ] Linked to specific Polity topics

---

### Epic 6: Video Lecture Classroom *(v2)*

#### Story 6.1: AI Video Agent — Script Generation
- [ ] Dedicated AI Video Agent under Hermes
- [ ] Full lecture scripts (30–45 min), NOT brief writing
- [ ] Connected to Research Agent feed
- [ ] Paper → Subject → Topic → Sub-topic hierarchy
- [ ] Timestamped scripts with visual cue markers for LTX 2.0

#### Story 6.2: Daily Video Generation Pipeline (Cron 1 AM – 6 AM)
- [ ] Batch-generate lecture videos overnight via LTX 2.0 on GPU server
- [ ] Queue-based: script → render → post-process → cloud upload
- [ ] Parallel render: up to 3 subjects simultaneously
- [ ] Output: MP4 (H.264), 1080p, with subtitles/captions

#### Story 6.3: Lecture Video Player + In-Video Notes & Q&A
- [ ] HTML5 player with chapter markers
- [ ] Timestamped note-taking sidebar
- [ ] In-video Q&A: ask at timestamp → AI answers from transcript + corpus
- [ ] Searchable transcript
- [ ] Playback speed: 0.5x – 2.5x

#### Story 6.4: Cloud Storage with DRM
- [ ] Auto-upload to GDrive or cloud storage
- [ ] Signed URLs only (24h validity)
- [ ] No download button; right-click disabled
- [ ] Watermark: user email overlaid (optional)

#### Story 6.5: Research Agent — Dynamic Content Updates
- [ ] Monitors all Research Agent URLs (listed in Section 11)
- [ ] Detects new schemes, policy changes, amendments, CA trends
- [ ] Feeds updates to all agents and video pipeline
- [ ] Update frequency: daily at midnight
- [ ] Admin review queue for flagged updates

---

### Epic 7: 3D Visualization & Animated Concept Shorts *(v2 Premium)*

#### Story 7.1: 3D Scene Visualization (React Three Fiber)
- [ ] Browser-based 3D rendering
- [ ] AI-generated scene descriptions from topic text
- [ ] Interactive: rotate, zoom, explode-view
- [ ] Export: PNG/Screenshot only (protected)
- [ ] Premium+ feature only

#### Story 7.2: Animated Concept Shorts *(Admin-Controlled)*
- ⚠️ **Admin ONLY generates concept videos from text/images/OCR** — users cannot generate directly
- Premium+ users get **access to pre-generated concept shorts (5 per 24h)**
- **Overage: ₹10 per additional short**
- Input: text, image, scanned PDF (OCR)
- Duration: 2–5 minutes
- Count reset: daily at midnight

#### Story 7.3: OCR Input Processing
- [ ] Tesseract.js (client) or Google Vision API (server)
- [ ] JPG, PNG, TIFF, PDF (scanned)
- [ ] Max file size: 25MB per upload

---

### Epic 8: 3D Visualization & Mapping *(Watch Mode — Premium+)*

#### Story 8.1: Interactive 3D UPSC Syllabus Navigator
- [ ] 3D interactive tree: Prelims & Mains (GS1–4, Essay, CSAT)
- [ ] Click node → open lesson, video, notes, PYQs, quiz
- [ ] Zoomable nodes, syllabus filters, bookmarks, progress rings
- [ ] Heatmap of user's time-spent & performance per node
- [ ] Manim renders intro explainer videos per node; Manim visual diagrams in preview
- [ ] **Freemium:** basic navigator free; advanced "guided roadmap" paid

- [ ] **3D GS Map Atlas** — layered interactive maps for geography, resources, demographics

---

### Epic 9: Daily Current Affairs Video Content *(Premium+)*

#### Story 9.1: Dynamic Animated "Daily CA Video Newspaper"
- [ ] Daily 5–8 min video summarizing national/international CA
- [ ] Topic segmentation, visual maps, timelines, answer prompts
- [ ] Auto-generated 30–60s Shorts for socials
- [ ] **remotion** compiles segments; **Manim** creates animated diagrams (timelines, graphs)
- [ ] **Download option:** daily updated PDF + monthly compiled PDF
- [ ] **Monetization:** Daily CA subscription, micro-purchases for premium deep-dive videos

---

### Epic 10: On-Demand Video Generation *(Premium+)*

#### Story 10.1: Real-Time Doubt → Video Converter
- [ ] Convert any doubt into 60–180s explainer video
- [ ] Multiple styles (concise, detail, example), voice selection, speed control
- [ ] **Manim** for technical diagrams; **remotion** for assembly & TTS
- [ ] Monetization: per-video charge or monthly cap

#### Story 10.2: "UPSC Topic in 60 Seconds" Short AI Videos
- [ ] Auto-create 60-second explainers for socials and revision
- [ ] Auto-generated thumbnails, SEO-friendly titles, social scheduling
- [ ] Monetization: Marketing for paid subscriptions; packaged short bank as product

#### Story 10.3: Visual Memory Palace Videos
- [ ] Turn lists/facts into visual memory palace animation (rooms → facts)
- [ ] Custom palace per student, spaced repetition integration
- [ ] **Manim** for 2D/3D objects; **remotion** to compile
- [ ] Monetization: One-off purchase or premium feature

---

### Epic 11: Long-Form Cinematic Lectures *(Premium+)*

#### Story 11.1: 3-Hour Full-Length Documentary Style Lectures
- [ ] Long-form cinematic lecture generation (chaptered)
- [ ] Chapters, bookmarks, suggested readings, timestamps for revision
- [ ] **remotion** sequences chapters; **Manim** for complex sub-explanations and data visualizations
- [ ] Monetization: Premium course bundles, one-time purchases

#### Story 11.2: 360° Immersive Geography / History Visualisation Videos
- [ ] 360°/panoramic video experiences (river basins, battle movements)
- [ ] Interactive hotspots in video, embedded quizzes
- [ ] **remotion** for stitching; **Manim** to overlay animated data/paths

---

### Epic 12: Assessment & Practice Video Features *(Premium+)*

#### Story 12.1: AI Essay Trainer with Live Video Feedback
- [ ] Student writes essay → AI grades + generates video walkthrough of improvements
- [ ] Rubric-based scoring + model answer video + structure visualization
- [ ] **Manim** for argument structure; **remotion** compiles feedback video
- [ ] Monetization: Essay review credits, subscription

#### Story 12.2: Daily Answer Writing + AI Scoring + Video Feedback
- [ ] Timed writing mode, compare with topper answers, revision integration
- [ ] **Manim** for diagrams; **remotion** for feedback video

#### Story 12.3: Fully Automated PYQ → Video Explanation Engine
- [ ] Ingest past-year question PDFs/images → generate model answers + animated explanations
- [ ] Auto-grouping by topic, difficulty tags
- [ ] **Manim** for diagrams; **remotion** for final video
- [ ] Monetization: PYQ packs, pay-per-video

#### Story 12.4: GS4 Ethics Simulator
- [ ] Multi-stage ethical dilemmas with user decisions, scoring, personality analysis
- [ ] Multi-path scenarios, behavior analytics
- [ ] **Manim** for moral framework diagrams; **remotion** to render outcomes

#### Story 12.5: Ethical Case Study Roleplay Videos
- [ ] Choose-your-path ethical dilemmas; video shows consequences
- [ ] Grading by ethical frameworks (utilitarian, deontological)
- [ ] **remotion** for branch video assembly; **Manim** for concept diagrams

---

### Epic 13: AI Tools & Generators *(Premium+)*

#### Story 13.1: Manim Problem Solver
- [ ] Step-by-step animated solution for quant & graph problems
- [ ] Show algebraic steps, drawn graphs, dynamic highlighting
- [ ] Heavy **Manim** use; **remotion** for TTS + packaging
- [ ] Monetization: Per-solve credits or subscription

#### Story 13.2: Static & Animated Notes Generator
- [ ] Auto-generate notes, PDFs, animated diagrams for any topic
- [ ] Multiple brevity levels (100/250/500 words), bullet points, memory tips
- [ ] **Manim** for diagrams; **remotion** only for short video summaries

#### Story 13.3: Animated Case Law, Committee & Amendment Explainer
- [ ] Visual maps of legal cases, amendments, committee timelines
- [ ] Timeline slider, interactive nodes linking to full text/videos
- [ ] **Manim** for legal relationship diagrams; **remotion** compiles narrated video

#### Story 13.4: Book-to-Notes Converter
- [ ] Upload any NCERT/standard book chapter → multi-level notes + MCQs + Manim diagram + 1-min summary video
- [ ] Auto-mapping of chapters to syllabus nodes & citations
- [ ] **Manim** for diagrams; **remotion** for 60s short

#### Story 13.5: AI Topic-to-Question Generator
- [ ] Given a topic → auto-generate MCQs, prelim questions, mains prompts, case studies, model answers
- [ ] Difficulty tags, distractor generation for MCQs

---

### Epic 14: Advanced User Features & Gamification *(Premium+)*

#### Story 14.1: AI Voice Teacher
- [ ] Customizable TTS voices and teaching styles
- [ ] Speed/clarity/charisma sliders, accent selection
- [ ] **remotion** syncs TTS to visuals
- [ ] Monetization: Premium voice pack

#### Story 14.2: Gamified UPSC Metaverse
- [ ] 3D rooms for subjects, earn XP, badges, leaderboards, social learning rooms
- [ ] Collaborative study sessions
- [ ] **remotion** for reward videos; **Manim** for in-room challenges
- [ ] Monetization: Cosmetic purchases, premium avatars

#### Story 14.3: Smart Revision Booster
- [ ] Auto-selects weakest 5 topics → sends revision package: short video, 5 flashcards, 10-min quiz
- [ ] Spaced repetition algorithm + push reminders

#### Story 14.4: "UPSC in 5-Hours Per Day" Planner
- [ ] Pre-built customizable daily plan for time-constrained users
- [ ] Drag-to-reschedule, auto-adjust for missed sessions

#### Story 14.5: AI Mentor — Personalized Teaching Assistant
- [ ] Conversational tutor with chosen voice/style, retains user context
- [ ] Daily check-ins, micro-assignments, motivational videos
- [ ] **remotion** for mentor pep talk videos

#### Story 14.6: UPSC Mindmap Builder
- [ ] Auto-build mindmaps from topic text or book chapters
- [ ] Drag & drop editing, export PNG/PDF, collaborative sharing
- [ ] **remotion** for animated map walkthrough videos

#### Story 14.7: Ultra-Detailed Syllabus Tracking Dashboard
- [ ] Master dashboard: completed topics, strength/weakness, predicted prelims score
- [ ] Competency index, custom milestones

#### Story 14.8: Smart Bookmark Engine
- [ ] Save any concept with auto-linked notes, PYQs, visual explanations
- [ ] Auto-tagging, cross-links, revision reminders

#### Story 14.9: "Concept Confidence Meter"
- [ ] Visual confidence meter per topic (red/yellow/green)
- [ ] Confidence delta alerts, suggested micro-actions

#### Story 14.10: Test Series Auto-Grader + Performance Graphs
- [ ] Full test auto-grading with growth charts
- [ ] Leaderboard, strengths heatmap

#### Story 14.11: "What's Happening in the World?" Weekly Documentary
- [ ] Weekly 15–30 min documentary-style analysis (economy, polity, IR, environment)
- [ ] Expert interviews, maps & graphs

#### Story 14.12: Topic Difficulty Predictor
- [ ] AI predicts upcoming topic difficulty & weight based on historical trends
- [ ] Confidence scores, recommended study weight

---

### Epic 15: Live Interview Prep Studio *(Premium+ — Highest Value)*

#### Story 15.1: Real-Time Interactive Mock Interview with Video Debrief
- [ ] Live AI interviewer with TTS; multi-interviewer panels
- [ ] Real-time **Manim** visual aids during answer (quick diagrams appear)
- [ ] Record + instant **remotion** debrief video (3–5 min): score, strengths, weaknesses, animated corrections
- [ ] Body Language Hints (optional video analysis)
- [ ] Panel Mode & Peer Reviews: mentors/peers join sim panel
- [ ] Adaptive question difficulty progression
- [ ] Monetization: **Per-mock fee or X mocks/month subscription** + paid mentor review add-on
- [ ] Privacy: explicit consent for recordings and analysis; secure storage; delete-on-demand

---

## 5. Out of Scope (MVP)

| Feature | Why Cut | Phase |
|---------|---------|-------|
| Full 9 Subject Agents | Only Polity in MVP | v2 |
| Dynamic/auto-updating Corpus | Heavy infra, static notes v1 | v2 |
| Interview Prep / Mock AI Interview | <5% users | v3 |
| AR/VR Experiences | Zero core metric impact | Future |
| Creator Economy Marketplace | Needs scale + community | Future |
| Real-time DuckDuckGo scraping | Adds noise, manual trigger only | v2 |
| Open-ended Chat Agent | Hallucination risk, "ChatGPT clone" trap | Never |
| Heavy Admin Analytics UI | Use Mixpanel/PostHog | Never |

---

## 6. Monetization & Access Rules

### Subscription Tiers

| Tier | Price | Features |
|------|-------|----------|
| **Free** | ₹0 | 24h Premium+ trial → downgrades to Free. Access: current affairs, gamification (badges/XP), 3D navigator (view only), referral system, **partial notes with "aimasteryedu.in" FULL-PAGE watermark** |
| **Premium** | ₹299/mo | Full notes (**watermark bottom-only + copyright ⚠️**), daily plans, quizzes, weak area tracking, all 9 subject agents (v2). **NO concept videos or watch mode** |
| **Premium+** | **₹1,199/mo / ₹2,399/3mo / ₹4,599/12mo** | Everything in Premium + **full Watch Mode** (34 features: AI lectures, 3D maps, CA video newspaper, concept shorts, interview studio, ethics simulators, etc.) + **5 concept shorts per 24h** + animated mindmaps (premium only) + sample previews for free users |

### Free User Downgrade (Post 24h Trial)
- After 24 hours Premium+ trial: **automatically downgrades to Free**
- Free users get:
  - ✅ Current affairs (daily updated)
  - ✅ 3D syllabus navigator (view mode, no download)
  - ✅ Gamification: badges, XP, streaks
  - ✅ Referral system with **unique promo codes** (valid 3 months)
  - ❌ Partial notes only (not complete notes on any topic)
- **Watermark on ALL free user content**: "aimasteryedu.in" spread across ALL pages
- **Premium watermark**: small bottom-only with copyright ⚠️ mark

### Micro-Transactions

| Item | Price | Condition |
|------|-------|-----------|
| **Concept Shorts (overage)** | ₹10 per short | After 5 free shorts/24h (Premium+ only) |
| **Custom Mock Interview** | ₹99 per session | Premium+ add-on |
| **Essay Evaluation** | ₹49 per essay | Premium+ add-on |
| **PYQ Video Pack** | ₹199 per subject pack | One-time purchase |

### Referral System
- Every user gets a **unique promo code**
- Discount applies to concept shorts or any single watch-mode feature generation
- **Promo code valid for 3 months** from generation
- New signups via referral get 24h Premium+ trial

### Concept Shorts Access Control *(Critical)*
- **Admin ONLY** can generate concept videos from topics/text/images/OCR
- **Users CANNOT generate concept videos directly** (admin-controlled pipeline)
- Premium+ users get access to **pre-generated concept shorts** (5 per 24h)
- Overage: ₹10 per additional short

---

## 7. Research Agent — URL Sources *(Monitored Daily)*

| # | URL | Content Type | Frequency |
|---|-----|------------|-----------|
| 1 | https://visionias.in/resources/ | Study resources, current affairs | Daily |
| 2 | https://www.insightsonindia.com/ | Current affairs, editorial analysis | Daily |
| 3 | https://iasbaba.com/ | IAS preparation, current affairs | Daily |
| 4a | https://www.drishtiias.com/prelims/ | Prelims-focused content | Daily |
| 4b | https://www.drishtiias.com/mains/ | Mains-focused content | Daily |
| 5a | https://iasscore.in/current-affairs | Current affairs compilation | Daily |
| 5b | https://iasscore.in/current-affairs/mains/topics/contemporary-issues | Contemporary issues | Daily |
| 6 | https://pib.gov.in | Press Information Bureau releases | Hourly |
| 7 | https://www.nextias.com/yojana-down-to-earth/yojana | Yojana magazine | Monthly |
| 8 | https://www.nextias.com/yojana-down-to-earth/kurukshetra | Kurukshetra magazine | Monthly |
| 9 | https://www.drishtiias.com/summary-of-important-reports | 2nd ARC Reports summary | On update |

**Requirement:** All sources/URLs used must be visibly cited on every content piece (notes, videos, quizzes, mindmaps). Source URLs stored in `content_metadata.source_url`.

---

## 8. Content Quality & Language Enforcement *(System Rules)*

- [ ] **All content** must be comprehensive and in **10th-class simplified standard language**
- [ ] Every note, video script, quiz explanation, mindmap label must pass readability check (Flesch-Kincaid Grade Level ≤ 10)
- [ ] Animated mindmaps & diagrams generated by **Manim/Remotion** — **Premium+ users only**
- [ ] **Free users:** sample preview of animated mindmaps (compelling them to subscribe)
- [ ] Source attribution visible on every content piece
- [ ] Syllabus alignment enforced by Content Refiner
- [ ] Factual accuracy verified against Research Agent sources

---

## 9. Non-Functional Requirements

### Watermark & IP Protection
- Free tier: **full-page spread watermark** "aimasteryedu.in" on all notes, PDFs, screenshots
- Premium tier: **bottom-only watermark** with copyright ⚠️
- Video content: **light user email overlay** (optional, configurable by admin)
- Right-click disabled on video elements
- No direct download button on any video or PDF
- Signed URLs expire every 24 hours
- Content export blocked for free users

### Video-Specific NFRs
- Video generation SLA: complete by 6:00 AM daily
- Video stream latency: <2s start time (CDN-backed)
- Concurrent video streams: 500+ (v2 target)
- Video storage: compressed MP4 (H.264), ~500MB per 45-min lecture
- GPU server uptime: >99% during generation window (1–6 AM)
- Concept short generation: <10 minutes per 2–5 min video
- LTX 2.0 micro-render for live interview visuals: <6 seconds

### Performance
- Plan generation: <2s
- Quiz feedback: <3s
- Text agent response: <3s
- Content load: <1.5s

### Security
- API keys: encrypted at rest
- User data: exportable (ownership principle)
- RLS on all user tables

---

## 10. PRD → Architecture Bridge

1. **Stack:** Next.js 15 + Supabase (PostgreSQL + pgvector + Auth + Realtime) + LangGraph/LangChain
2. **AI Provider:** OpenAI + Groq + Anthropic (v1); 50+ managed (v2)
3. **Video Generation:** LTX 2.0 on dedicated GPU server (A100 40GB or L40S), Celery + Redis queue, nightly cron 1–6 AM
4. **3D Rendering:** React Three Fiber + Three.js (browser-based, premium)
5. **OCR:** Tesseract.js (client) / Google Vision API (server)
6. **Content Storage:** Supabase Storage (PDFs) + GDrive/S3 (videos)
7. **Deployment:** Vercel (frontend) + Supabase + Railway (Python agents) + GPU Server
8. **CDN:** Cloudflare or AWS CloudFront for Indian users
9. **Monitoring:** PostHog (events, funnels, retention)

---

## 11. UI/UX Principles

1. **Decision Removal:** The app tells the user WHAT to study today. Not ask.
2. **Friendly Naming:** Every technical term mapped to human language.
3. **prepairo.ai Inspiration:** Live cards, real-time feeds, current stats.
4. **Zero Jargon:** No "RAG", "vector search", "embeddings" in user copy.
5. **Feedback First:** Every study session must end with feedback. No dead ends.
6. **Watermark as Conversion Tool:** Free tier watermark is intentionally visible to drive subscriptions.
7. **Premium Preview:** Free users see sample previews of premium content (mindmaps, shorts, 3D) but cannot fully access.

---

*PRD v2.0 Complete. 15 Epics. 50+ Stories. 34 Watch Mode Features. 3-Tier Monetization. Ready for implementation.*

## 16. Content Writing Specialist Agent — Smart Books & Notes Pipeline *(v2)*

### Philosophy
> The Content Writing Specialist Agent doesn't write **summaries**. It writes **smart books** — comprehensive in length, uncompromising in detail, yet ruthlessly simplified in language. Every output must be so good that no standard textbook can beat it.

### Chain of Responsibility
```
Research Agent discovers content (from all 9 URL sources)
         ↓
Subject Teacher Agents (9) filter/select content per subject
         ↓
Content Writing Specialist Agent synthesizes + writes
         ↓
Output: Smart Book / Notes per Subject / Chapter / Topic
```

### Story 16.1: Research Content Feed Pipeline
> **As the** Content Writing Specialist Agent **I want** a continuous feed of relevant content from the Research Agent **So that** I always have fresh material to write from

- [ ] Research Agent provides structured data: topic, source URL, content type (static/dynamic), relevance score
- [ ] Subject Teacher Agents receive feed → validate against syllabus → approve/reject
- [ ] Filtered content queued for Content Writing Agent
- [ ] Admin can manually add/remove content from the queue
- [ ] Daily queue processed during 1 AM – 6 AM window

### Story 16.2: Smart Book — Chapter & Topic Generation
> **As the** system **I want** the Content Writing Agent to auto-generate comprehensive notes for each topic/chapter **So that** users have textbook-grade content in simple language

- [ ] **Length:** Comprehensive — must cover every sub-topic per UPSC syllabus (not shortened, compete with coaching notes length)
- [ ] **Language:** 10th-class simplified standard (Flesch-Kincaid ≤ 10, verified by Content Refiner)
- [ ] **Structure per Topic/Chapter:**
  1. Introduction/Overview — 200–400 words
  2. Detailed Content — definitions, key concepts, historical context, current relevance
  3. Diagrams — static + animated mindmaps (Manim generated, Premium+ only)
  4. Mnemonics — 2–5 per chapter (auto-generated by mnemonic agent)
  5. PYQ References — all relevant previous year questions linked
  6. Mock Questions — 5 MCQs + 3 Mains-type questions at chapter end
  7. Summary — 150-word executive recap for revision
  8. Current Affairs Link — auto-linked to latest CA from Research Agent feed

### Story 16.3: Animated Mindmaps & Diagrams per Chapter
> **As a** Premium+ user **I want** every chapter to have an animated mindmap **So that** I can visually grasp the entire chapter in 60 seconds

- [ ] Every chapter auto-generates: animated mindmap (Manim) + animated diagram (where applicable)
- [ ] Mindmap includes: central topic → branches → sub-topics → connections
- [ ] Interactive: clickable nodes in 3D viewer (React Three Fiber)
- [ ] Exportable as PNG/PDF (Premium)
- [ ] **Free users:** animated mindmap sample preview (30 seconds) — compelling them to subscribe

### Story 16.4: Concept Shorts per Chapter *(Admin-Controlled)*
> **As a** Premium+ user **I want** 2–5 min animated shorts for every important concept in a chapter **So that** I can quickly revise

- [ ] Admin Content Writing Agent identifies "important concepts" per chapter via syllabus weightage + PYQ frequency
- [ ] Generates: 2–5 min concept shorts (Manim/Remotion/LTX 2.0)
- [ ] Every short: title card, explanation, example, summary
- [ ] Queue: generated alongside nightly video lecture pipeline
- [ ] **Admin ONLY generates shorts** — users access pre-generated content
- [ ] Premium+: access to all shorts per chapter; Free: 1–2 sample previews

### Story 16.5: Mnemonic Generation Engine
> **As a** user **I want** mnemonics for complex lists/facts per chapter **So that** I can memorize easily

- [ ] Auto-generates 2–5 mnemonics per chapter
- [ ] Types: acronym, story-method, rhyme, visual association
- [ ] User can rate mnemonics (thumbs up/down)
- [ ] Top-rated mnemonics surfaced first
- [ ] **Premium+:** full mnemonic library; **Free:** 1 mnemonic per chapter

### Story 16.6: Smart Book — Subject-Level Compilation
> **As a** user **I want** every subject (Polity, History, etc.) to have a complete book **So that** I don't need to buy coaching notes

- [ ] Content Writing Agent assembles topics into coherent chapters → into full books
- [ ] Book structure: Preface → Syllabus Map → Chapters → Appendix (CA links, PYQ index)
- [ ] Book is **living**: updates monthly as Research Agent feeds new CA/static content
- [ ] Version control: user sees "Updated [Date]" on every chapter
- [ ] Exportable as: PDF (Premium) or in-app reader (all)
- [ ] **Watermark on PDF:** bottom-only for Premium; full-spread for Free samples

### Story 16.7: Content Writing Agent — Self-Improvement Loop
> **As the** system **I want** the Content Writing Agent to improve its writing over time **So that** content quality continuously increases

- [ ] Feedback loop: user engagement (time spent, quiz scores, weak areas) feeds back to agent
- [ ] Agent adjusts: complexity level, examples used, PYQ relevance, mnemonics effectiveness
- [ ] Quarterly "content quality review" — agent regenerates low-performing chapters
- [ ] Human admin spot-checks monthly: random chapter audit
- [ ] Agent comparison: benchmark against standard textbooks via external evaluation

### Story 16.8: Quiz & Test Auto-Generation per Chapter
> **As a** user reading a chapter **I want** quizzes at the end of every topic and chapter **So that** I can test my understanding

- [ ] Topic-level: 5 MCQs (auto-generated from Content Writing Agent output)
- [ ] Chapter-level: 10 MCQs + 2 Mains-type questions
- [ ] Difficulty adaptive: easy → medium → hard based on user performance
- [ ] Error tracking: wrong answers feed Weak Area Auto-Injection (Epic 1.5)
- [ ] **Premium+:** instant AI-generated feedback video for wrong answers (Manim + remotion)

