---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - /a0/usr/projects/prepx/.a0proj/_bmad-output/planning-artifacts/prd.md
  - /a0/usr/projects/prepx/.a0proj/_bmad-output/planning-artifacts/product-brief-prepx-2026-04-22.md
workflowType: architecture
project_name: prepx
user_name: User
date: 2026-04-22
videoFeatures: true
---

# Architecture Decision Document — prepx

**Project:** prepx — The UPSC Corpus OS
**Phase:** MVP v1 (Polity-only) → v2 (Video Classroom + 3D + Shorts)
**Author:** BMad Winston (Architect)
**Date:** 2026-04-22

---

## 1. Philosophy

> Architecture should constrain only what's necessary to protect the core learning loop. Everything else is negotiable.

The MVP architecture must be **boring, fast, and replaceable**. We optimize for shipping the daily execution loop (Plan → Study → Quiz → Feedback → Adapt) in <8 weeks. v2 adds video pipeline, 3D, shorts, and bulk upload AI.

---

## 2. Tech Stack

| Layer | Technology | Justification | v2 Transition |
|-------|-----------|---------------|---------------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript | Server rendering, App Router, strong DX | Add RSC streaming |
| **Styling** | Tailwind CSS + shadcn/ui | Pre-built accessible components | Same |
| **Animation** | Framer Motion | Smooth transitions, quiz feedback | Add Three.js v3 |
| **Backend/API** | Next.js Route Handlers + Supabase Edge Functions | Unified TS stack, server actions | LangGraph Python on Railway |
| **Database** | PostgreSQL (Supabase) | ACID, JSONB, Row Level Security | Same |
| **Vector Search** | pgvector | Built into Supabase | Same |
| **Auth** | Supabase Auth | Email/pass + Google OAuth | Add phone OTP |
| **Storage** | Supabase Storage for PDFs | Bucket per user, RLS | Add CDN for notes + videos |
| **AI/LLM** | OpenAI GPT-4o-mini (default) + Groq (speed fallback) | Cost-effective, speed-critical | Add Anthropic Claude |
| **State** | Zustand (client) + Supabase JSONB (server) | Lightweight, server-persisted | LangGraph state machine |
| **Analytics** | Mixpanel or PostHog | No custom analytics UI | PostHog self-hosted |
| **Deployment** | Vercel (frontend) + Supabase + Railway (agents) | Instant deploys, managed infra | Add GPU Server |
| **Video Generation** | LTX 2.0 on Dedicated GPU Server | Programmatic video lectures | N/A (v2 pipeline) |
| **3D Rendering** | React Three Fiber + Three.js | Browser-based 3D spatial viz | Premium module |
| **Cron / Queue** | Celery + Redis (or BullMQ on Railway) | Nightly video generation pipeline | v2 |
| **OCR** | Tesseract.js (client) / Google Vision API (server) | Scanned PDF/image text extraction | v2 |
| **Video Storage** | GDrive API (TBD) or S3-compatible | Cloud storage for lectures | CDN for India streaming |

---

## 3. MVP System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER                                      │
│  Next.js 15 App (Vercel)                                        │
│  ├─ Dashboard (Today's Plan)                                    │
│  ├─ Topic Viewer (Structured Notes)                             │
│  ├─ Quiz Component (with Instant Feedback)                       │
│  ├─ Doubt Agent (Topic-bound, constrained)                      │
│  ├─ Lecture Video Player (with In-Video Notes + Q&A)            │
│  ├─ 3D Visualizer (React Three Fiber)                           │
│  ├─ Concept Shorts Generator (Premium)                         │
│  └─ Admin Content Panel + Video Pipeline Admin                    │
└────────────────────┬────────────────────────────────────────────┘
                     │ API Routes (Server Actions)
                     │
┌────────────────────▼────────────────────────────────────────────┐
│                 SUPABASE (PostgreSQL + pgvector)                │
│  ├─ users (RLS-protected)                                      │
│  ├─ daily_plans (generated per user, per day)                 │
│  ├─ topics (structured notes: definitions, concepts, PYQs)      │
│  ├─ quizzes (questions + error-type labels)                    │
│  ├─ user_weak_areas (gap tracking, auto-injection)             │
│  ├─ user_sessions (state for learning loop)                   │
│  ├─ content_metadata (syllabus tags, source URLs)              │
│  ├─ activity_log (telemetry for metrics)                       │
│  ├─ video_scripts (v2: generated scripts)                     │
│  ├─ video_lectures (v2: rendered MP4s with signed URLs)        │
│  ├─ user_video_notes (v2: timestamped notes)                   │
│  ├─ user_video_qa (v2: in-video Q&A)                         │
│  ├─ concept_shorts (v2 Premium: generated shorts)            │
│  ├─ concept_short_generations (v2: 5/24h enforcement)         │
│  └─ pgvector: topic embeddings (1536-dim)                        │
└────────────────────┬────────────────────────────────────────────┘
                     │
           ┌─────────▼──────────┐    ┌────────────────────────────┐
           │  AI Agents (Light) │    │  Admin (Content Panel +     │
           │  (Vercel Edge)     │    │   Video Pipeline + Bulk    │
           ├─ Plan Generator    │    │   Upload AI Agent)         │
           │  (GPT-4o-mini)     │    │  ├─ Upload/Edit notes      │
           ├─ Quiz Generator    │    │  ├─ Tag to syllabus       │
           │  (GPT-4o-mini)     │    │  ├─ Push updates          │
           ├─ Doubt Agent       │    │  ├─ AI Provider config      │
           │  (Groq for speed)  │    │  ├─ Bulk Upload AI Agent   │
           ├─ Feedback Tagger   │    │     (auto-extract, OCR,   │
           │  (classification)  │    │      classify, integrate)  │
           ├─ Content Refiner   │    │  ├─ Video Pipeline Admin   │
           │  (pipeline)        │    │     (scripts, queue, QA)   │
           ├─ Research Agent    │    └────────────────────────────┘
           │  (dynamic updates) │
           ├─ AI Video Agent    │
           │  (script gen)      │
           └─ Bulk Upload Agent │
              (doc integration)│
           └────────────────────┘
```

---

## 4. Data Model

### users
```
id UUID PRIMARY KEY
email, name, created_at
subscription_status ENUM('free', 'pro', 'interview', 'classroom')
baseline_score INT -- diagnostic output
weak_areas JSONB -- array of topic_ids
streak_count INT
daily_sessions JSONB -- today's plan state
```

### topics
```
id UUID PRIMARY KEY
title VARCHAR
subject ENUM('polity') -- MVP: polity only
syllabus_tag VARCHAR -- e.g., "gs2_parliament"
content JSONB -- structured: definitions, concepts, pyqs, traps, source_url
readability_score FLOAT
embedding VECTOR(1536)
created_at, updated_at, version INT
```

### daily_plans
```
id UUID PRIMARY KEY
user_id UUID -> users
plan_date DATE
tasks JSONB -- ordered array: [{topic_id, type, duration, status}]
status ENUM('pending', 'in_progress', 'completed')
created_at, completed_at
```

### quizzes
```
id UUID PRIMARY KEY
topic_id UUID -> topics
questions JSONB -- [{question, options, correct_answer, explanation}]
error_type_labels JSONB -- [{pattern, topic_section, severity}]
generated_at
```

### quiz_attempts
```
id UUID PRIMARY KEY
user_id UUID -> users
quiz_id UUID -> quizzes
answers JSONB -- [{question_index, selected_option, is_correct}]
error_breakdown JSONB -- {silly: N, concept: N, time: N}
diagnosis TEXT -- AI-generated feedback
completed_at
```

### user_weak_areas
```
id UUID PRIMARY KEY
user_id UUID -> users
topic_id UUID -> topics
gap_type ENUM('silly', 'concept', 'time')
severity INT -- 1-5
detected_at
auto_injected_at -- NULL until injected into plan
```

### video_scripts (v2)
```
id UUID PRIMARY KEY
subject VARCHAR
topic_id UUID -> topics
paper ENUM('GS1', 'GS2', 'GS3', 'GS4')
script_text TEXT -- full lecture script, timestamped
script_markers JSONB -- visual cue markers for LTX 2.0
research_feed_refs JSONB -- links to Research Agent updates
status ENUM('draft', 'approved', 'rendering', 'published')
generated_at, reviewed_at
```

### video_lectures (v2)
```
id UUID PRIMARY KEY
script_id UUID -> video_scripts
subject VARCHAR, topic_id UUID -> topics
duration_seconds INT, file_size_mb INT
cloud_storage_url TEXT -- signed URL for streaming
cloud_path TEXT -- path in GDrive/S3
streaming_token TEXT -- expiring 24h signed token
status ENUM('queued', 'rendering', 'post_processing', 'published', 'failed')
rendered_at, published_at, cron_job_id VARCHAR
```

### user_video_notes (v2)
```
id UUID PRIMARY KEY
user_id UUID -> users
video_id UUID -> video_lectures
timestamp_seconds INT
note_text TEXT
created_at
```

### user_video_qa (v2)
```
id UUID PRIMARY KEY
user_id UUID -> users
video_id UUID -> video_lectures
timestamp_seconds INT
question TEXT, answer_text TEXT
answered_by_model VARCHAR
created_at
```

### concept_shorts (v2 Premium)
```
id UUID PRIMARY KEY
user_id UUID -> users
topic_id UUID -> topics
input_type ENUM('text', 'image', 'pdf_ocr')
input_original_url TEXT
script_text TEXT -- auto-generated 2-5 min script
animation_type ENUM('ltx_video', 'motion_canvas', 'threejs_scene')
duration_seconds INT -- 120-300 seconds
status ENUM('queued', 'rendering', 'published', 'failed')
published_at, created_at
```

### concept_short_generations (v2 Premium -- 5/24h enforcement)
```
id UUID PRIMARY KEY
user_id UUID -> users
generation_date DATE -- resets daily at midnight
count INT DEFAULT 0 -- increments per generation
```

---

## 5. Agentic Architecture

### MVP v1: Deterministic Flow

```
User opens app
  → DB reads today's plan (or generates new)
User clicks topic
  → DB fetches topic content
User takes quiz
  → Edge Function calls OpenAI to generate quiz (if not cached)
User submits
  → Edge Function calls OpenAI to classify errors
  → DB updates weak_areas
  → DB auto-generates tomorrow's plan
```

### v2: LangGraph Multi-Agent + Video Pipeline

```
LangGraph State Machine (Python on Railway)
  ├─ PlanAgent
  ├─ ContentAgent (retriever from pgvector)
  ├─ QuizAgent
  ├─ FeedbackAgent (fine-tuned classifier)
  ├─ DoubtResolverAgent (RAG over topics)
  ├─ ResearchAgent (monitors PIB, Yojana, Kurukshetra, Govt portals)
  ├─ AI VideoAgent (script generation + render orchestration)
  ├─ BulkUploadAgent (auto-extract, OCR, classify, integrate)
  └─ WebSearchAgent (DuckDuckGo for CA)

Video Pipeline (Nightly Cron 1 AM -- 6 AM):
  ResearchAgent detects updates → feeds AI VideoAgent
  AI VideoAgent generates full lecture script (30-45 min)
  Script queued to GPU Server (LTX 2.0)
  LTX 2.0 renders MP4 (H.264, 1080p)
  Post-process: auto-captions, chapter markers
  Upload to cloud storage (GDrive/S3)
  Publish: update video_lectures table, notify users
```

---

## 6. Video Lecture Architecture (v2)

### Nightly Pipeline (Celery + Redis)

```
01:00 AM -- Research Agent runs
  ├─ scrape PIB, Yojana, Kurukshetra, Govt portals
  ├─ detect new schemes, policy changes, CA trends
  └─ feed findings to AI VideoAgent

01:30 AM -- AI VideoAgent generates scripts
  ├─ paper → subject → topic → sub-topic hierarchy
  ├─ script: 30-45 min, timestamped, visual markers
  └─ status: draft → approved

02:00 AM -- Queue to GPU Server (LTX 2.0)
  ├─ up to 3 parallel renders (GPU memory permitting)
  ├─ fallback: if fails → queue next day + admin alert
  └─ output: MP4, H.264, 1080p

04:00 AM -- Post-process
  ├─ auto-generate captions/subtitles
  ├─ chapter markers from script timestamps
  └─ thumbnail generation

05:00 AM -- Upload to Cloud Storage
  ├─ signed URL generation (24h validity)
  ├─ no direct download (streaming only)
  └─ watermark overlay (user email, optional)

06:00 AM -- Publish & Notify
  ├─ video_lectures table updated
  ├─ user notification: "Today's lecture ready"
  └─ dashboard cache invalidated
```

### GPU Server Spec (LTX 2.0)

| Component | Recommendation |
|-----------|--------------|
| GPU | A100 40GB or L40S (single or dual) |
| RAM | 64GB |
| Storage | 500GB NVMe (fast scratch for render temp) |
| LTX 2.0 | Self-hosted container, REST API endpoint |
| Queue | Redis + Celery workers |
| Monitoring | GPU utilization, render queue depth, failure rate |

### Cloud Storage (TBD by Admin)

- **Primary:** GDrive API or S3-compatible
- **CDN:** Cloudflare or AWS CloudFront for Indian users
- **DRM:** Signed URLs only, no direct download, right-click disabled
- **Backup:** 7-day retention on server, then cloud-only

---

## 7. 3D Visualization Architecture (v2)

### React Three Fiber Stack

```
Frontend: React Three Fiber (r3f) + Drei
  ├─ AI generates scene description from topic text
  ├─ Three.js renders: Parliament, Earth layers, etc.
  ├─ Interactive: OrbitControls, zoom, explode-view
  └─ Export: PNG screenshot only (protected)

Backend: API endpoint → scene JSON
  ├─ Input: topic_id or text prompt
  ├─ AI generates: scene JSON (objects, positions, labels)
  └─ Frontend renders from JSON → no model download
```

### Concept Shorts Pipeline

```
User Input (text / image / scanned PDF)
  → OCR if image/pdf (Tesseract.js or Google Vision API)
  → AI generates: script → storyboard → visual plan
  → LTX 2.0 OR Motion Canvas render (2-5 min MP4)
  → Upload to cloud storage
  → Serve with signed URL

Enforcement:
  → Premium users only
  → Daily limit: 5 shorts/24h (concept_short_generations count)
  → Reset: midnight UTC via cron
```

---

## 8. Bulk Upload AI Agent Architecture

```
Admin uploads file(s) → any format, any length
  → Queue system: async processing
  → Bulk Upload Agent (Hermes sub-agent):
     Step 1: File type detection → select extractor
     Step 2: Text extraction (PDF text layer / DOCX parser / OCR for scanned images)
     Step 3: AI classification: identify subject, paper, topic, sub-topic
     Step 4: AI structuring: summarize, extract definitions, concepts, PYQs, traps
     Step 5: Syllabus tag suggestion: auto-map to hierarchy
     Step 6: Admin review queue: approve/edit tags before commit
     Step 7: Commit to topics table with version control
     Step 8: Notify admin of completion
```

---

## 9. Security & RLS

```sql
-- Users can only read their own data
ALTER TABLE daily_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own plans" ON daily_plans
FOR SELECT USING (auth.uid() = user_id);

-- Topics are readable by all (read-only corpus)
-- Quizzes readable by all, attempts user-only
-- Video lectures: user must have active Classroom subscription to stream
```

---

## 10. Deployment

| Service | Provider | Purpose |
|---------|----------|---------|
| Frontend | Vercel | Next.js 15, instant deploys |
| Database | Supabase PostgreSQL | Managed, scalable, RLS |
| Auth & Storage | Supabase | Bundled, RLS-protected |
| AI Agents (v1) | Vercel Edge Functions | Serverless, close to DB |
| AI Agents (v2) | Railway | Python LangGraph microservices |
| GPU Server | Dedicated (AWS/GCP/Azure) | LTX 2.0 video rendering |
| Monitoring | PostHog | Event tracking, funnels, retention |

---

## 11. Cost Model

| Service | Monthly Cost (1K DAU) |
|---------|----------------------|
| Vercel Pro | $20 |
| Supabase Pro | $25 |
| OpenAI API | $50–80 (cached aggressively) |
| Groq API (fallback) | $10–20 |
| PostHog Cloud | $20 |
| Railway (v2 agents) | $20 |
| **GPU Server (LTX 2.0)** | **$300–500** |
| **Cloud Storage (CDN)** | **$30–50** |
| **Total** | **~$475–735/mo** |

---

## 12. Decisions Deferred

| Decision | Current (v1) | v2 Target |
|----------|-------------|-----------|
| Agent orchestration | Deterministic edge functions | LangGraph Python + Video Agent |
| Content updates | Manual admin push | Research Agent + auto-crawl4ai |
| Subject agents | Polity only | 9 subjects |
| Real-time CA | Static bundles | DuckDuckGo + agentic search |
| Doc RAG | N/A | AutoDocThinker multi-agent |
| Video generation | N/A | LTX 2.0 nightly pipeline |
| 3D visualization | N/A | React Three Fiber |
| Concept shorts | N/A | LTX 2.0 / Motion Canvas |
| AI providers | 2–3 | 50+ managed |
| Bulk upload | Manual tagging | Bulk Upload AI Agent |

---

**Architecture Document Complete. Ready for Implementation Phase.**

## 13. Content Writing Agent — Data Model & Pipeline *(v2)*

### content_books (Subject-level Smart Books)
```
id UUID PRIMARY KEY
subject ENUM('polity', 'history', 'geography', 'economy', 'environment', 'science_tech', 'international_relations', 'ethics', 'csat')
title VARCHAR
syllabus_map JSONB -- full hierarchical map: paper → sections → chapters → topics
preface TEXT
status ENUM('draft', 'review', 'published', 'archived')
published_at
updated_at
version INT
```

### content_chapters
```
id UUID PRIMARY KEY
book_id UUID -> content_books
chapter_number INT
chapter_title VARCHAR
content_full TEXT -- comprehensive chapter text (10th-class readability)
introduction TEXT
summary TEXT -- 150-word recap
pyq_references JSONB -- [{question_id, year, topic}]
quiz_topic_ids JSONB -- linked topic IDs for chapter-level quiz
mnemonics JSONB -- [{type, content, rating}]
created_at
updated_at
version INT
readability_score FLOAT
```

### content_mindmaps *(Generated per chapter)*
```
id UUID PRIMARY KEY
chapter_id UUID -> content_chapters
mindmap_json JSONB -- node graph: central → branches → sub-topics
animation_type ENUM('manim_static', 'manim_animated', 'threejs_interactive')
render_status ENUM('queued', 'rendering', 'published', 'failed')
video_url TEXT -- MP4 of animated mindmap (if animated)
preview_url TEXT -- 30s sample for Free users
```

### content_concept_shorts *(Admin-generated per chapter)*
```
id UUID PRIMARY KEY
chapter_id UUID -> content_chapters
concept_name VARCHAR
importance_score FLOAT -- derived from syllabus weight + PYQ frequency
script_text TEXT
animation_type ENUM('manim', 'remotion', 'ltx_video')
duration_seconds INT -- 120-300 seconds
status ENUM('queued', 'rendering', 'published', 'failed')
video_url TEXT
created_at
```

### Content Writing Agent — Self-Improvement Feed
```
Feedback Loop (monthly):
  1. Aggregate: user time-spent per chapter, quiz scores, weak area frequency
  2. Identify: chapters with low engagement or high error rates
  3. Flag: chapters below readability threshold or missing current affairs
  4. Queue: Content Writing Agent regenerates flagged chapters
  5. Admin spot-check: random audit of 3 chapters per month
  6. Publish: updated chapter replaces old version (version control)
```

### Pipeline Integration
```
01:00 AM -- Research Agent runs
  → Feeds to Subject Teacher Agents (validation)

02:00 AM -- Content Writing Agent processes queue
  → Identifies: new topics, updated CA, weak-performing chapters
  → Generates: chapter content, mindmaps, mnemonics, quiz questions
  → Queues: concept shorts for video generation

03:00 AM -- Mindmap renders (Manim)
  → Animated mindmaps generated per new/updated chapter

04:00 AM -- Content commit to topics + content_books tables
  → Admin review queue for flagged updates
  → Version bump on regenerated chapters

05:00 AM -- Daily plan generator re-evaluates
  → New content available for tomorrow's plans
```
