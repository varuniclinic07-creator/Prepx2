---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - /a0/usr/projects/prepx/.a0proj/_bmad-output/planning-artifacts/prd.md
  - /a0/usr/projects/prepx/.a0proj/_bmad-output/planning-artifacts/architecture.md
workflowType: epics
project_name: prepx
user_name: User
date: 2026-04-22
total_epics: 16
total_stories: 58
---

# prepx — Epic Breakdown

## Requirements Inventory

### Functional Requirements (from PRD)

| # | Requirement | Priority |
|---|-------------|----------|
| FR1 | User takes 5-min diagnostic → system identifies weak areas + baseline score | MVP |
| FR2 | System generates personalized daily plan with max 5 tasks | MVP |
| FR3 | System serves structured topic content (10th-class simplified) with source citation | MVP |
| FR4 | System generates quizzes per topic + instant error-type diagnosis | MVP |
| FR5 | System auto-injects weak areas into tomorrow's plan (invisible to user) | MVP |
| FR6 | Hermes orchestrates deterministic learning loop: Plan → Study → Quiz → Feedback → Adapt | MVP |
| FR7 | Constrained subject agent (Polity-only) answers topic-bound queries | MVP |
| FR8 | Content Writing Agent generates comprehensive smart books per subject | v2 |
| FR9 | Content Writing Agent generates animated mindmaps per chapter (Manim) | v2 |
| FR10 | Content Writing Agent generates mnemonics per chapter | v2 |
| FR11 | Content Writing Agent generates chapter-end quizzes (topic + chapter level) | v2 |
| FR12 | Research Agent monitors 9 UPSC sources for dynamic/static updates | v2 |
| FR13 | AI Video Agent generates full lecture scripts (30–45 min) structured per syllabus | v2 |
| FR14 | Nightly cron (1–6 AM) batch-generates lecture videos via LTX 2.0 on GPU server | v2 |
| FR15 | Video player supports in-video notes, timestamped Q&A, searchable transcript | v2 |
| FR16 | Cloud storage with signed URLs + DRM (no download, no right-click) | v2 |
| FR17 | 3D syllabus navigator (R3F) with zoomable nodes, progress rings, heatmap | v2 |
| FR18 | Daily CA video newspaper (5–8 min) with download PDF option | v2 |
| FR19 | Doubt → video converter (60–180s explainer) | v2 |
| FR20 | 60-second topic shorts for social/revision | v2 |
| FR21 | Visual memory palace videos | v2 |
| FR22 | 3-hour documentary style lectures (chaptered) | v2 |
| FR23 | 360° immersive geography/history visualization videos | v2 |
| FR24 | AI essay trainer with live video feedback | v2 |
| FR25 | Daily answer writing + AI scoring + video feedback | v2 |
| FR26 | PYQ → animated video explanation engine | v2 |
| FR27 | GS4 ethics simulator + roleplay videos | v2 |
| FR28 | Manim problem solver for quant/graph problems | v2 |
| FR29 | Static & animated notes generator (brevity levels: 100/250/500 words) | v2 |
| FR30 | Animated case law / committee / amendment explainer | v2 |
| FR31 | Book-to-notes converter (NCERT/standard books → notes + MCQs + diagram + 60s video) | v2 |
| FR32 | AI topic-to-question generator (MCQs, prelims, mains prompts, case studies) | v2 |
| FR33 | AI voice teacher (customizable TTS, accent, style) | v2 |
| FR34 | Gamified UPSC metaverse (3D rooms, XP, badges, leaderboards) | v2 |
| FR35 | Smart revision booster (weakest 5 topics → bundle) | v2 |
| FR36 | "UPSC in 5 hours/day" planner with drag-reschedule | v2 |
| FR37 | AI mentor (conversational tutor, daily check-ins, motivational videos) | v2 |
| FR38 | UPSC mindmap builder (auto-build from topic text, export PNG/PDF) | v2 |
| FR39 | Syllabus tracking dashboard (competency index, predicted prelims score) | v2 |
| FR40 | Smart bookmark engine (auto-linked notes, PYQs, visual explanations) | v2 |
| FR41 | Concept confidence meter (red/yellow/green per topic) | v2 |
| FR42 | Test series auto-grader + performance graphs | v2 |
| FR43 | "What's Happening in the World?" weekly documentary | v2 |
| FR44 | Topic difficulty predictor (AI predicts upcoming difficulty/weight) | v2 |
| FR45 | Live interview prep studio (real-time AI panel, instant remotion debrief) | v2 |
| FR46 | RAG-based perfect UPSC search engine with citations | v2 |
| FR47 | Monetization system (subscriptions, per-video purchases, coupons, affiliate) | v2 |
| FR48 | Three-tier subscription with watermark strategy | MVP |
| FR49 | Referral system with unique promo codes (3 months) | MVP |
| FR50 | Concept shorts: 5 free per 24h (Premium+), ₹10 per overage | MVP |
| FR51 | Admin-only concept video generation (users access pre-generated) | v2 |
| FR52 | Bulk Upload AI Agent (auto-extract, OCR, classify, integrate) | v2 |
| FR53 | Animated mindmaps: Premium+ only; Free users get 30s sample preview | v2 |
| FR54 | 10th-class simplified language enforcement system-wide | MVP |
| FR55 | Source URL attribution on EVERY content piece | MVP |
| FR56 | Free: full-spread watermark; Premium: bottom-only watermark | MVP |
| FR57 | Content Writing Agent self-improvement loop (quarterly quality review) | v2 |

### Non-Functional Requirements

| # | Requirement |
|---|-------------|
| NFR1 | Plan generation: <2s |
| NFR2 | Quiz feedback: <3s |
| NFR3 | Text agent response: <3s |
| NFR4 | Content load: <1.5s |
| NFR5 | Video generation SLA: complete by 6:00 AM daily |
| NFR6 | Video stream latency: <2s (CDN-backed) |
| NFR7 | Concurrent video streams: 500+ |
| NFR8 | GPU server uptime: >99% during generation window |
| NFR9 | Concept short generation: <10 min per 2–5 min video |
| NFR10 | LTX 2.0 micro-render for live interview: <6s |
| NFR11 | API keys: encrypted at rest |
| NFR12 | Row-level security on all user tables |
| NFR13 | Signed URLs expire every 24 hours |
| NFR14 | Content export blocked for free users |
| NFR15 | Right-click disabled on video elements |
| NFR16 | Flesch-Kincaid Grade Level ≤ 10 on all content |
| NFR17 | Readability verification on every generated piece |

### Additional Requirements (Architecture)

- Deterministic flow v1 (state machine); v2 moves to LangGraph Python
- LTX 2.0 on dedicated GPU server (A100 40GB or L40S)
- Celery + Redis queue for nightly pipeline
- React Three Fiber for 3D browser rendering
- Tesseract.js (client) / Google Vision API (server) for OCR
- GDrive/S3-compatible cloud storage with CDN for India
- PostHog for event tracking and funnels

---

## Epic List

| # | Epic Name | Stories | Priority | Phase |
|---|-----------|---------|----------|-------|
| 1 | Daily Execution Loop | 5 | Critical | MVP |
| 2 | Hermes Orchestrator | 2 | Critical | MVP |
| 3 | Agentic Intelligence | 4 | High | MVP-lite |
| 4 | Admin Control Center | 3 | High | MVP |
| 5 | User Experience & Naming | 3 | High | MVP |
| 6 | Video Lecture Classroom | 5 | High | v2 |
| 7 | 3D Visualization & Concept Shorts | 3 | High | v2 |
| 8 | 3D Visualization & Mapping | 2 | Medium | v2 |
| 9 | Daily Current Affairs Video Content | 1 | Medium | v2 |
| 10 | On-Demand Video Generation | 3 | Medium | v2 |
| 11 | Long-Form Cinematic Lectures | 2 | Medium | v2 |
| 12 | Assessment & Practice Video Features | 5 | Medium | v2 |
| 13 | AI Tools & Generators | 5 | Medium | v2 |
| 14 | Advanced User Features & Gamification | 13 | Low-Medium | v2 |
| 15 | Live Interview Prep Studio | 1 | High | v2 |
| 16 | Content Writing Specialist Agent | 8 | Critical | v2 |
| — | **TOTAL** | **65 Stories** | — | — |

---

## Epic 1: Daily Execution Loop

**Goal:** Build the core learning loop that reduces decision-making, enforces feedback, and creates habit for the Frustrated Repeater.

### Story 1.1: Diagnostic Onboarding
> **As a** new user, **I want** a 5-minute diagnostic test, **so that** the app identifies my weak areas and baseline score.

**Given** the user is a new sign-up **When** they complete the 5-min diagnostic **Then** weak areas and baseline score are identified **And** a personalized first daily plan is generated.

**Acceptance Criteria:**
- [ ] Completes in <5 minutes
- [ ] Identifies weak topics across Polity syllabus
- [ ] Outputs baseline mock score
- [ ] Target: >60% of signups complete it

### Story 1.2: Daily Plan Generator
> **As a** repeater user, **I want** to open the app and see exactly what to study today, **so that** I don't waste 1–2 hours deciding.

**Given** a user opens the app **When** the plan loads **Then** max 5 tasks are shown with topic + CA bundle + quiz **And** the plan auto-adjusts next day based on performance.

- [ ] Plan loads in <2s
- [ ] Zero user decision required

### Story 1.3: Structured Topic Content
> **As a** user studying Polity, **I want** simplified 10th-class-standard notes, **so that** I understand complex concepts without coaching.

- [ ] Top 15–20 highest-yield Polity topics (MVP)
- [ ] Definitions, key concepts, PYQ links, common traps
- [ ] Source citation on every fact

### Story 1.4: Quiz + Instant Feedback
> **As a** user who studied a topic, **I want** MCQs and instant diagnosis, **so that** I know my error type.

- [ ] Feedback within 3s (silly/ concept / time)
- [ ] Links to topic section for re-study
- [ ] Target: >60% feedback loop completion

### Story 1.5: Weak Area Auto-Injection
> **As a** user who missed a concept, **I want** the system to silently include it in tomorrow's plan, **so that** I don't track gaps.

- [ ] Invisible to user (no dashboard)
- [ ] Auto-injects within 72h
- [ ] Priority: high-weight topics first

---

## Epic 2: Hermes Orchestrator

**Goal:** Lightweight orchestrator that ensures every user completes a closed learning loop.

### Story 2.1: Deterministic Learning Flow
- [ ] Flow: Plan → Topic → Quiz → Feedback → Adapt
- [ ] No multi-agent routing in MVP (state machine)
- [ ] Recovery: skip quiz → reschedule; abandon mid-session → bookmark

### Story 2.2: Constrained Subject Agent (Polity)
- [ ] Topic-bound queries only
- [ ] Syllabus-constrained responses
- [ ] Response time: <3s
- [ ] Prevents hallucination via corpus restriction

---

## Epic 3: Agentic Intelligence

### Story 3.1: Agentic Web Search *(Admin-only)*
- [ ] DuckDuckGo API; manual trigger; 24h cache

### Story 3.2: Content Refiner *(Pipeline)*
- [ ] Syllabus filter → simplifier → citer → verifier

### Story 3.3: AutoDocThinker *(v2)*
- [ ] Multi-agent RAG; PDF/DOCX/TXT up to 100 pages

### Story 3.4: Agentic File Search *(v2)*
- [ ] Dynamic navigation; no precomputed embeddings

---

## Epic 4: Admin Control Center

### Story 4.1: Content Control Panel
- [ ] Upload PDF/DOCX/TXT; inline edit; syllabus tag; version control

### Story 4.2: AI Provider Configuration
- [ ] 2–3 providers MVP; v2 target 50+

### Story 4.3: Feature Controls
- [ ] Toggle features on/off; visibility (all/paid/admin)

---

## Epic 5: User Experience & Naming

### Story 5.1: Friendly Feature Naming
- [ ] No technical jargon; "RAG System" → "Smart Study Assistant"

### Story 5.2: Real-Time Feature Previews
- [ ] Live cards, "Updated 2h ago", trending topics

### Story 5.3: Current Affairs Bundles
- [ ] Static bundles linked to Polity topics; admin-curated

---

## Epic 6: Video Lecture Classroom

**Goal:** Daily AI-generated video lectures with in-video interaction and DRM protection.

### Story 6.1: AI Video Agent — Script Generation
- [ ] Full 30–45 min scripts, syllabus-oriented, NOT brief
- [ ] Research Agent feed integration
- [ ] Paper → Subject → Topic → Sub-topic hierarchy
- [ ] Timestamped scripts with visual markers for LTX 2.0

### Story 6.2: Daily Video Generation Pipeline (Cron 1–6 AM)
- [ ] Queue: script → LTX 2.0 render → post-process → cloud
- [ ] Parallel render: up to 3 subjects simultaneously
- [ ] Output: MP4 H.264 1080p + subtitles

### Story 6.3: Video Player + In-Video Notes & Q&A
- [ ] HTML5 chapter markers; timestamped note sidebar
- [ ] Q&A at timestamp → AI answers from transcript + corpus
- [ ] Searchable transcript; playback speed 0.5–2.5x

### Story 6.4: Cloud Storage with DRM
- [ ] Signed URLs (24h expiry); no download button
- [ ] Right-click disabled; watermark overlay optional

### Story 6.5: Research Agent — Dynamic Updates
- [ ] Monitors 9 URLs (VisionIAS, InsightsOnIndia, IASBaba, DrishtiIAS, IASCore, PIB, Yojana, Kurukshetra, 2nd ARC)
- [ ] Feeds all agents; admin review queue for flagged updates

---

## Epic 7: 3D Visualization & Concept Shorts

### Story 7.1: 3D Scene Visualization *(Premium+)*
- [ ] R3F interactive; rotate/zoom/explode; PNG-only export

### Story 7.2: Animated Concept Shorts *(Admin-Only)*
- [ ] Admin generates; users access pre-generated (5/24h Premium+)
- [ ] ₹10 per overage; input: text/image/OCR PDF
- [ ] Duration: 2–5 min; count reset: midnight

### Story 7.3: OCR Input Processing
- [ ] Tesseract.js / Google Vision; JPG/PNG/TIFF/PDF; max 25MB

---

## Epics 8–15: Watch Mode Features (34 Total)

### Epic 8: 3D Visualization & Mapping
- Story 8.1: 3D Syllabus Navigator *(Freemium: basic free; advanced paid)*
- Story 8.2: 3D GS Map Atlas

### Epic 9: Daily CA Video Content
- Story 9.1: CA "Video Newspaper" (5–8 min daily + download PDF)

### Epic 10: On-Demand Video Generation
- Story 10.1: Doubt → Video Converter (60–180s)
- Story 10.2: "Topic in 60 Seconds" Shorts
- Story 10.3: Visual Memory Palace Videos

### Epic 11: Long-Form Lectures
- Story 11.1: 3-Hour Documentary Lectures (chaptered)
- Story 11.2: 360° Immersive Geo/History Videos

### Epic 12: Assessment Video Features
- Story 12.1: AI Essay Trainer + Video Feedback
- Story 12.2: Daily Answer Writing + AI Scoring + Video
- Story 12.3: PYQ → Animated Video Explanation Engine
- Story 12.4: GS4 Ethics Simulator
- Story 12.5: Ethical Case Study Roleplay Videos

### Epic 13: AI Tools & Generators
- Story 13.1: Manim Problem Solver
- Story 13.2: Static & Animated Notes Generator
- Story 13.3: Case Law / Committee Explainer
- Story 13.4: Book-to-Notes Converter
- Story 13.5: Topic-to-Question Generator

### Epic 14: Advanced Features & Gamification (13 Stories)
- Voice Teacher, Metaverse, Smart Revision, 5-Hour Planner, AI Mentor, Mindmap Builder, Dashboard, Bookmarks, Confidence Meter, Test Auto-Grader, Weekly Documentary, Difficulty Predictor

### Epic 15: Live Interview Prep Studio
- Story 15.1: Real-Time AI Mock Interview + Instant Video Debrief *(Highest Value Premium+ Feature)*

---

## Epic 16: Content Writing Specialist Agent

**Goal:** Auto-generate comprehensive smart books for every UPSC subject that compete with coaching institute notes — with animated mindmaps, mnemonics, and chapter-end quizzes.

### Story 16.1: Research Content Feed Pipeline
- [ ] Research Agent → Subject Teacher Agents (filter) → Content Writing Agent queue
- [ ] Admin manual add/remove; daily queue processed 1–6 AM

### Story 16.2: Smart Book Chapter Generation
- [ ] Comprehensive length (not shortened); Flesch-Kincaid ≤ 10
- [ ] Per chapter: Introduction/Overview → Detailed Content → Mindmaps → Mnemonics → PYQs → Mock Questions → Summary → CA Link

### Story 16.3: Animated Mindmaps per Chapter
- [ ] Every chapter: animated mindmap (Manim) + diagram
- [ ] Interactive: clickable nodes in 3D viewer
- [ ] Free: 30s sample preview; Premium+: full access

### Story 16.4: Concept Shorts per Chapter *(Admin-Only)*
- [ ] Admin Content Writing Agent identifies important concepts (syllabus weight + PYQ frequency)
- [ ] Generates 2–5 min shorts (Manim/Remotion/LTX 2.0) with title card, explanation, example, summary
- [ ] Users access pre-generated; cannot generate directly

### Story 16.5: Mnemonic Generation Engine
- [ ] 2–5 mnemonics per chapter (acronym, story, rhyme, visual)
- [ ] User rating; top-rated surfaced first
- [ ] Premium+: full library; Free: 1 per chapter

### Story 16.6: Smart Book Subject Compilation
- [ ] Assemble topics → chapters → full books (Preface → Syllabus Map → Chapters → Appendix)
- [ ] "Living" books: updated monthly via Research Agent
- [ ] Version control; PDF export (watermarked)

### Story 16.7: Self-Improvement Loop
- [ ] Feedback from user engagement (time, quiz scores) drives quality improvement
- [ ] Quarterly review: regenerate low-performing chapters
- [ ] Human admin spot-check: random monthly audit

### Story 16.8: Quiz & Test Auto-Generation per Chapter
- [ ] Topic: 5 MCQs; Chapter: 10 MCQs + 2 Mains questions
- [ ] Adaptive difficulty; wrong answers feed Weak Area Auto-Injection
- [ ] Premium+: instant AI-generated feedback video for wrong answers

---

## Requirements Coverage Map

| Requirement | Epic Coverage |
|-------------|--------------|
| Reading Mode (plans, notes, quizzes, mindmaps, mnemonics) | Epics 1–5 |
| Watch Mode (34 video/3D features) | Epics 6–15 |
| Smart Books (content writing pipeline) | Epic 16 |
| Admin & Orchestration | Epics 2, 4 |
| Research & Dynamic Updates | Epics 3, 6.5, 16 |
| Monetization (3 tiers, watermark, referral) | Epics 1, 5, 7 |
| Security & NFRs | All Epics |

---

**Epics and Stories Document Complete. 16 Epics. 65 Stories. Ready for Sprint Planning.**
