---
stepsCompleted: [2]
inputDocuments:
  - /a0/usr/projects/prepx/.a0proj/_bmad-output/planning-artifacts/epics.md
  - /a0/usr/projects/prepx/.a0proj/_bmad-output/planning-artifacts/prd.md
  - /a0/usr/projects/prepx/.a0proj/_bmad-output/planning-artifacts/architecture.md
project_name: prepx
sprints: 7
total_stories: 58
---

# prepx — Sprint Plan

**Date:** 2026-04-22
**Sprint Duration:** 2 weeks per sprint
**Total Duration:** 14 weeks (3.5 months to MVP)
**Goal:** Ship a functional Daily Execution Engine for Aspirants (Reading Mode MVP) by Sprint 4, then iterate into Watch Mode.

---

## Sprint Structure

| Sprint | Focus | Epics | Stories | Status |
|--------|-------|-------|---------|--------|
| **Sprint 0** | **Foundation — Project Scaffolding** | — | — | ✅ Spec'd |
| **Sprint 1** | **Core Learning Loop — Daily Plans + Quiz + Feedback** | 1, 2, 5 | 10 | ⏳ Ready |
| **Sprint 2** | **Admin + Agent Intelligence + Content Writing Pipeline** | 3, 4, 16 | 15 | ⏳ Ready |
| **Sprint 3** | **Smart Books + Mnemonics + Chapter-Level Features** | 16 (cont.) | 8 | ⏳ Ready |
| **Sprint 4** | **Video Lecture Pipeline (LTX 2.0) + DRM** | 6 | 5 | ⏳ Ready |
| **Sprint 5** | **3D Visualization + Concept Shorts + CA Video** | 7, 8, 9 | 6 | ⏳ Ready |
| **Sprint 6** | **Watch Mode Batch 1 — Assessment + On-Demand Videos** | 10, 12, 13 | 13 | ⏳ Ready |
| **Sprint 7** | **Watch Mode Batch 2 — Interview Studio + Gamification + Advanced Features** | 11, 14, 15 | 9 | ⏳ Ready |

---

## Sprint 0: Foundation (Week -2 → 0)

**Goal:** Set up project boilerplate, database schema, auth, deployment.

**Deliverables:**
- Next.js 15 + TypeScript project scaffolded
- Supabase project provisioned (database + auth + storage + edge functions)
- Tailwind CSS + shadcn/ui configured
- Zustand (client state) initialized
- Vercel deployment pipeline set up
- Environment variables (.env) configured
- Development team onboarded with PRD + Architecture

**Decision:** Do NOT build UI first. Build database schema + API routes first (backend-out).

---

## Sprint 1: Core Learning Loop (Weeks 1–2)

**Epics:** 1 (Daily Execution Loop) + 2 (Hermes Orchestrator) + 5 (User Experience)

**Stories in Order:**

| Priority | Story | Why First |
|----------|-------|-----------|
| 1 | **1.2: Daily Plan Generator** | The "Aha!" moment — user opens app and sees what to study |
| 2 | **1.1: Diagnostic Onboarding** | Generates personalized plan → depends on 1.2 for output display |
| 3 | **1.3: Structured Topic Content** | Must exist before quiz can be taken on any topic |
| 4 | **1.4: Quiz + Instant Feedback** | Core feedback loop — the metric that matters |
| 5 | **1.5: Weak Area Auto-Injection** | Depends on 1.4 (needs quiz error data) |
| 6 | **2.1: Deterministic Learning Flow** | Orchestrates all of above into a linear flow |
| 7 | **2.2: Constrained Subject Agent (Polity)** | Needs database + flows from 2.1 to route queries |
| 8 | **5.1: Friendly Feature Naming** | Rename jargon before UI is presented |
| 9 | **5.2: Real-Time Feature Previews** | Dashboard polish |
| 10 | **5.3: Current Affairs Bundles** | Admin manually curates first; auto later |

**MVP Success Gate:** A user signs up → takes diagnostic → gets daily plan → studies topic → takes quiz → gets feedback → next day plan auto-adjusts. All within one app without coaching notes.

**Dependencies on Sprint 0:**
- Database schema: users, daily_plans, topics, quizzes, quiz_attempts, user_weak_areas
- Supabase Auth (email + Google OAuth)
- Row Level Security on daily_plans, quiz_attempts
- OpenAI + Groq API keys configured

---

## Sprint 2: Admin + Agent Intelligence + Content Writing (Weeks 3–4)

**Epics:** 3 (Agentic Intelligence) + 4 (Admin Control Center) + 16 (Content Writing Specialist Agent)

**Stories in Order:**

| Priority | Story | Why |
|----------|-------|-----|
| 1 | **16.1: Research Content Feed Pipeline** | Without research feed, Content Writing Agent has no source material |
| 2 | **16.2: Smart Book Chapter Generation** | Generate first Polity chapter from Laxmikanth + NCERT (seed content) |
| 3 | **16.5: Mnemonic Generation Engine** | Low-hanging, high-memorability user value |
| 4 | **16.8: Quiz Auto-Generation per Chapter** | Replace handcrafted quizzes with AI-generated |
| 5 | **3.1: Agentic Web Search (Admin)** & **3.2: Content Refiner** | Enables admin to pull live CA and verify content |
| 6 | **4.1: Content Control Panel** | Admin needs tools to manage growing corpus |
| 7 | **4.2: AI Provider Configuration** | Critical for controlling cost as AI usage scales |
| 8 | **4.3: Feature Controls** | Enable A/B testing of features |
| 9 | **3.3: AutoDocThinker** & **3.4: Agentic File Search** | Foundation for Doc RAG (v2) |
| 10 | **16.3: Animated Mindmaps per Chapter** | Premium feature — depends on chapter content |
| 11 | **16.4: Concept Shorts per Chapter** | Requires chapter content + pipeline infrastructure |
| 12 | **16.6: Smart Book Subject Compilation** | Assemble chapters into full Polity book |
| 13 | **16.7: Self-Improvement Loop** | Analytics infrastructure for agent learning |

**Key Decision:** Content Writing Agent starts with Polity ONLY. Top 15–20 topics seeded manually; remaining topics auto-generated by agent in Sprint 3.

**Dependencies on Sprint 1:**
- topics table must exist
- Content Refiner pipeline must be operational
- Admin route protected by role-based access

---

## Sprint 3: Smart Books — Subject Coverage + Premium Features (Weeks 5–6)

**Goal:** Complete Polity smart book (all topics), add animated mindmaps/shorts, expand to next subject.

**Stories:**
- Complete remaining Polity topics via Content Writing Agent
- Animated mindmaps for all Polity chapters
- Concept shorts for top 20 important Polity concepts
- PDF export with watermarks (Free vs Premium)
- Mnemonics for all Polity chapters (auto-generated)
- Chapter-end quizzes for all Polity chapters
- Self-improvement loop: agent regenerates low-performing chapters
- Human admin spot-check: audit 3 random chapters

**Stretch:** Begin Economy smart book (if Polity is complete and stable)

---

## Sprint 4: Video Lecture Pipeline (Weeks 7–8)

**Epic:** 6 (Video Lecture Classroom)

**Stories:**
- **6.1:** AI Video Agent — script generation for Polity top topics
- **6.2:** Nightly cron pipeline (1–6 AM): Celery + Redis + LTX 2.0 GPU server
- **6.3:** Video player with in-video notes, Q&A, searchable transcript
- **6.4:** Cloud storage + DRM (signed URLs, no download)
- **6.5:** Research Agent integration into video pipeline

**Infrastructure:**
- Deploy GPU server (A100 or L40S)
- LTX 2.0 Docker container
- Celery workers on Railway
- GDrive/S3 bucket provisioning

---

## Sprint 5: 3D + Concept Shorts + CA Newspaper (Weeks 9–10)

**Epics:** 7 (3D Visualization) + 8 (3D Mapping) + 9 (CA Video)

**Stories:**
- React Three Fiber 3D syllabus navigator
- 3D GS Map Atlas
- Concept shorts generation (admin-only pipeline)
- Daily CA video newspaper (remotion + Manim)
- PDF download option (daily + monthly compilation)
- Premium+ access control (5 shorts/24h, ₹10 overage)

---

## Sprint 6: Watch Mode Batch 1 — Assessment + Tools (Weeks 11–12)

**Epics:** 10 (On-Demand Video) + 12 (Assessment) + 13 (AI Tools)

**Stories:**
- Doubt → video converter (60–180s)
- 60-second topic shorts
- Memory palace videos
- AI essay trainer + video feedback
- Daily answer writing + AI scoring
- PYQ → animated video explanation
- GS4 ethics simulator
- Manim problem solver
- Notes generator (100/250/500 words)
- Book-to-notes converter
- Topic-to-question generator

---

## Sprint 7: Watch Mode Batch 2 — Interview + Advanced Features (Weeks 13–14)

**Epics:** 11 (Long-Form Lectures) + 14 (Advanced Features) + 15 (Interview Studio)

**Stories:**
- AI voice teacher (custom TTS)
- Gamified metaverse (3D rooms, XP, badges)
- Smart revision booster
- "UPSC in 5 hours/day" planner
- AI mentor (conversational tutor)
- Mindmap builder
- Syllabus tracking dashboard
- Confidence meter
- Test auto-grader
- Weekly documentary
- Difficulty predictor
- Interview prep studio (real-time AI panel + instant debrief video)

---

## Dependencies & Critical Path

```
Sprint 0 (Foundation)
    │
    ├─→ Sprint 1 (Core Loop) ──→ Sprint 2 (Content Writing + Admin)
    │                                    │
    │                             ├─→ Sprint 3 (Smart Books Complete)
    │                             └─→ Sprint 4 (Video Pipeline)
    │                                    │
    │                             ├─→ Sprint 5 (3D + Concept Shorts + CA)
    │                             └─→ Sprint 6 (On-Demand + Assessment)
    │                                    │
    │                             └─→ Sprint 7 (Interview + Advanced)
```

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| LTX 2.0 GPU costs too high | Sprint 4 | Start with 2–3 test videos, scale gradually |
| Content quality below coaching notes | Sprint 2–3 | Human audit process, Content Refiner gates |
| AI hallucination in generated notes | Sprint 1–2 | Corpus restriction + source citation enforced |
| User retention low after 24h trial | Sprint 1 | Watermark strategy, compelling preview content |
| RLS performance at scale | Sprint 0 | pgvector + index strategy, Supabase monitoring |

---

## Ready to Start Sprint 1?

**Sprint 1 Stories (in order):**
1. Daily Plan Generator (DB → API → UI)
2. Diagnostic Onboarding (5-min quiz → plan)
3. Structured Topic Content (Polity seed topics)
4. Quiz + Instant Feedback (MCQ generation + error tagging)
5. Weak Area Auto-Injection (invisible queue)
6. Hermes deterministic flow (state machine)
7. Constrained Subject Agent (Polity-only)
8. Friendly feature naming
9. Real-time feature previews (dashboard)
10. Current affairs bundles (manual admin)

**Team:** 1 full-stack developer (Next.js + Supabase + OpenAI)
**Week 1 Focus:** Database + API + basic UI
**Week 2 Focus:** AI integration + quiz feedback + polish

**Ready to begin Sprint 1 development?** → Say **"Quick dev"** to start.
