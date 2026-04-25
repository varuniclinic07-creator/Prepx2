---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: ["/a0/usr/uploads/complete book for making upsc cse app.md"]
date: 2026-04-22
author: User
---

# Product Brief: prepx

## Executive Summary

**prepx** is an AI-native Learning Operating System for UPSC CSE aspirants in India. At its foundation lies a **living Corpus Library System** — a dynamically updating, comprehensive knowledge base maintained by a 24/7 AI Agent Research Team running in **Paperclip**. This team of subject-specific teacher agents scrapes, curates, and synthesizes content from official sources, government schemes, Yojana & Kurukshetra magazines, and the open web — transforming static textbooks into **intelligent, multimedia-rich, 10th-class-standard simplified notes** that evolve daily.

The system's brain, **Hermes**, orchestrates the entire experience — managing user queries, routing to specialist agents, and coordinating the real-time content pipeline. Aspirants no longer rely on outdated textbooks or fragmented coaching notes; instead, they interact with a **futuristic, data-rich interface** (inspired by benchmarks like prepairo.ai) where every feature displays live, current information, and every study need is fulfilled by an always-on AI mentor team.

---

## Core Vision

### Problem Statement

UPSC CSE preparation in India is trapped in a **static, expensive, and fragmented ecosystem**:
- ₹1.5–3L/year coaching costs with poor personalization
- Textbooks and notes become obsolete the moment they are printed
- Aspirants juggle 20+ sources (NCERTs, coaching notes, current affairs magazines, Yojana, Kurukshetra, government portals)
- No unified system dynamically links concepts to current schemes, diagrams, mindmaps, and real-world context
- 99.8% failure rate persists because the tools don't adapt to the learner or the ever-changing syllabus

### Problem Impact

- **Financial exclusion**: Quality prep is unaffordable for millions
- **Cognitive overload**: Students waste hours curating sources instead of learning
- **Knowledge decay**: Static notes miss current affairs, new schemes, and evolving PYQ trends
- **Dependency**: Learners are chained to coaching institutes because no self-updating alternative exists

### Why Existing Solutions Fall Short

| Current Solution | Gap |
|----------------|-----|
| Coaching institutes (Vajiram, VisionIAS) | Expensive, one-size-fits-all, static content |
| Standard EdTech apps (Unacademy, Byju's) | Pre-recorded videos, limited personalization, no dynamic note generation |
| Static PDF notes | Immediately outdated, no linking to current events, no AI interaction |
| AI chatbots (generic GPT wrappers) | Hallucinate, not grounded in UPSC-specific verified knowledge, no multi-agent orchestration |
| prepairo.ai & similar benchmarks | Strong UX inspiration, but prepx goes further by owning the entire content supply chain (Corpus) + multi-agent teaching layer |

### Proposed Solution

**prepx — The UPSC Corpus OS**

A full-stack AI Learning Operating System built around three pillars:

#### 1. The Corpus Library System (Content Engine)
- **Dynamic Comprehensive Notes**: Every NCERT topic, standard textbook chapter, and syllabus subject is broken down into **10th-class-standard simplified language** notes — with diagrams, mindmaps, and linked references.
- **Live Content Pipeline**: Automated daily updates via web scraping (crawl4ai, Playwright browser harness, browser-use) pulling from government portals, PIB, Yojana, Kurukshetra, and verified sources.
- **Knowledge Graph**: Every note, scheme, current affair, and PYQ is linked semantically — so a student reading "Federalism" automatically sees linked "NITI Aayog", "GST Council", and recent constitutional amendments.

#### 2. The AI Agent Team (Research & Teaching Layer) — Running in Paperclip
- **Hermes**: Central orchestrator AI — routes queries, manages sessions, and coordinates all other agents.
- **Subject Teacher Agents**: Dedicated agents for each UPSC subject (Polity, History, Geography, Economy, Environment, Science & Tech, IR, Ethics, CSAT) that research, explain, quiz, and mentor.
- **24/7 VPS Operation**: The agent team runs continuously on an admin VPS server, ensuring the Corpus is always fresh and user queries are answered instantly.

#### 3. Agentic Intelligence Subsystems
A dedicated agentic layer under Hermes that handles content accuracy and enrichment:
- **Agentic Web Search (DuckDuckGo)**: Real-time web search for current affairs with UPSC-focused source prioritization, citation, and relevance filtering
- **AutoDocThinker (Document RAG)**: Multi-agent document processing for PDF/DOCX/TXT with intelligent summarization, cross-reference detection, and page/section references
- **Agentic File Search**: Dynamic document navigation with human-like file exploration, no pre-computed embeddings needed, real-time reasoning
- **Agentic Orchestrator**: Analyzes query intent and routes to web search (current affairs), doc thinker (uploaded docs), or file search (static materials), with graceful fallbacks and multi-system combination
- **Content Refiner**: Syllabus filter → 10th-std language simplifier → accuracy verifier → source citation generator

#### 4. Admin Control Center
- **Materials Library**: Upload/manage PDF/DOCX/TXT/EPUB, categorize by subject, tag by topic, version control
- **AI Provider Manager**: 50+ providers — OpenAI, Anthropic, Google, Mistral, Groq, Together, Fireworks, Cohere, AI21, DeepSeek, Moonshot, Qwen, GLM, Yi, OpenRouter, A4F, LiteLLM, Ollama, LMStudio, vLLM
- **Content Rules Engine**: Allowed/blocked source lists, keyword filters, syllabus topic mapping, language complexity rules, fact-checking gates
- **Feature Controls**: Toggle any feature on/off, set per-plan limits, maintenance mode
- **Analytics Dashboard**: Real-time system health, usage, subscription management

#### 5. The Experience Layer (Futuristic Realtime UI)
- **prepairo.ai-inspired dashboard**: Live feature cards, real-time activity feeds, current stats on content updates, trending topics, and user progress.
- **Multimodal Output**: Text, generated diagrams, interactive mindmaps, audio summaries, and AI-generated explainer videos.
- **Every Need Fulfilled**: From "Explain Article 370 simply" to "What are the latest government schemes for women empowerment?" to "Generate a daily plan for me" — Hermes handles it all.
- **Friendly Naming**: All technical terms mapped to user-friendly names (e.g., "RAG System" → "Smart Study Assistant"). No jargon.

### Key Differentiators

1. **Dynamic Corpus over Static PDFs**: Everyone else gives you a course; prepx gives you a living library that updates itself.
2. **Paperclip Multi-Agent Architecture**: Not a single GPT wrapper — a true agent team with specialized roles working in concert.
3. **Agentic Content Accuracy**: DuckDuckGo real-time verification + Doc RAG + multi-agent cross-checking before content reaches users.
4. **Simplified 10th-Class Standard**: Content is ruthlessly simplified without losing UPSC depth — making complex topics accessible to self-learners.
5. **Govt Scheme & Magazine Linking**: Automatic semantic linking of every topic to current Yojana issues, Kurukshetra articles, and latest government initiatives.
6. **24/7 Research Agents**: While users sleep, the agent team updates the core library — ensuring zero content rot.
7. **Benchmark-Driven UX**: Real-time, futuristic UI inspired by the best in class (prepairo.ai).
8. **Hermes Orchestrator**: A true brain that remembers, plans, adapts, and routes intelligently.

### Success Metrics

- 95% content relevance to UPSC syllabus
- 100% source citation on generated content
- <1% factual errors
- 10th grade readability score
- 90% user comprehension rate
- <3s response time for web search-augmented queries
- 24-hour content freshness SLA

---

## Target Users

### Primary Users

#### 1. 🔥 The Frustrated Repeater *(Primary Target #1 — ICP Priority)*

**Demographics:** Age 23–28 | 1–3 UPSC attempts | Failed Prelims or Mains  
**Emotional State:** Confused, tired, still determined  
**Core Pain:** *"I studied everything but still failed. I don't know what I'm doing wrong."*  
**Needs:** Diagnosis → Strategy → Answer Improvement  
**Why They Matter:** Already invested years = high seriousness. Know the syllabus = want efficiency, not lectures. Pain is sharp and specific. **80% of product decisions should optimize for this segment.**

**Their Day Without prepx:**
1. Wakes up motivated → gets stuck immediately
2. Spends 1–2 hours deciding: *"Polity or Economy? Laxmikanth or notes?"*
3. Opens The Hindu → overwhelmed → skips
4. Watches random YouTube → feels productive → actually not
5. No tracking → no clarity → no closure
6. **End feeling:** *"I studied… but I don't know what I actually achieved."*

**Their Day With prepx:**
1. Opens app → **"Today's Plan Ready"** (zero thinking required)
2. GS2 Parliament (L1 → L3) + 5 Current Affairs + 10 MCQs on weak areas
3. Clicks topic → explanation + PYQs + auto-notes + doubt resolution
4. Evening test → instant feedback: concept gap vs silly mistake vs time issue
5. Dashboard shows: % syllabus covered, strength/weakness map, tomorrow auto-generated
6. **End feeling:** *"I moved forward. I know exactly where I stand."*

---

#### 2. ⚙️ The Time-Starved Professional *(Primary Target #2)*

**Demographics:** Age 25–32 | Working full-time | Attempting alongside job  
**Emotional State:** Anxious, time-guilty, disciplined but overwhelmed  
**Core Pain:** *"I have 2–4 hours a day. Tell me EXACTLY what to do. Don't make me think."*  
**Needs:** Decision automation, compressed daily plans, mobile-first micro-sessions  
**Why They Matter:** Time-poor, money-okay. Cannot follow traditional coaching. Huge underserved market.

**Prepx Value Prop:** Pre-curated 2-hour daily missions. No "what to study" paralysis. Progress happens even on busy days.

---

#### 3. 🧭 The Coaching Dropout / Self-Study Aspirant *(Primary Target #3)*

**Demographics:** Age 21–26 | Never joined coaching / left due to cost | Scattered resources  
**Emotional State:** Overwhelmed, FOMO, looking for structure  
**Core Pain:** *"I have 20+ sources but no system. Give me a full coaching replacement."*  
**Needs:** Complete structured replacement for coaching — notes, tests, plans, mentorship in one  
**Why They Matter:** Biggest volume segment. High frustration = high willingness to switch. Natural viral growth engine.

**Prepx Value Prop:** One app replaces coaching institute + books + current affairs magazine + test series.

---

### Secondary Users

#### 👨‍👩‍👧 Parents *(Priority Secondary)*
- **Role:** Paying users who need proof of progress
- **Needs:** Weekly progress report, rank/improvement trend, ROI validation
- **Why:** Parents often fund UPSC prep; they need confidence the investment is working

#### 🧑‍🏫 Evaluators *(Essential for Mains + Interview)*
- **Role:** Human + AI hybrid evaluation for essays and mock interviews
- **Needs:** Structured rubrics, consistency, scalability
- **Why:** Critical for advanced-stage aspirants; builds trust in Mains answer quality

#### ⚠️ Deprioritized (Future Expansion)
| Segment | Why Deferred |
|---------|-------------|
| Fresh Beginners | Too confused → high churn risk. Add later with guided onboarding. |
| Rural Aspirants | Requires offline mode, language infra. Add after core product stabilizes. |
| Topper-Wannabes | Small segment. Comes naturally once product matures. |
| Coaching Institutes | Competitors initially. Consider partnerships after market dominance. |
| YouTubers / Creators | Noise unless curated. Creator economy layer is future phase. |
| Government Partners | Long-term data partnerships. Pursue after product-market fit. |

---

### User Journey: The Frustrated Repeater

| Stage | Action | prepx Touchpoint | Emotion |
|-------|--------|-----------------|---------|
| **Discovery** | Sees a topper's testimonial: *"This app diagnosed exactly why I failed."* | Social proof + rank improvement stories | Curious |
| **Onboarding** | Downloads app → takes 5-minute diagnostic test | AI analyzes weak areas, past attempt patterns, gap identification | Hopeful |
| **First Win** | Opens app next morning → sees *"Today's Plan Ready"* | Pre-curated daily mission with everything needed | Relieved |
| **Core Usage** | Studies Parliament topic → gets simple explanation + PYQs + linked current affairs | Integrated learning: no tab switching, no "where did I read that?" | Confident |
| **Aha Moment** | Asks doubt → gets instant, cited, syllabus-aligned answer | Agentic search + RAG verification | Amazed |
| **Feedback Loop** | Takes evening quiz → gets instant diagnosis: *"You missed this constitutional amendment concept"* | Weak area auto-detection + targeted revision | In control |
| **Habit Formation** | 30 days later: 40% syllabus mapped, streak active, daily plan automated | Dashboard + revision tracker + spaced repetition | Motivated |
| **Advocacy** | Clears Prelims → posts: *"I only used prepx for 6 months"* | Success story featured + referral program | Loyal |

---

## Success Metrics

### 🎯 North Star Metric

**"Daily Structured Study Sessions Completed"**

- **Definition:** User opens Today's Plan, completes ≥70% of tasks, AND closes ≥1 feedback loop (quiz/test/evaluation)
- **Why it wins:** Measures quality + depth, not just clicks. Directly correlates with score improvement. Cannot be gamed.
- **Target:** >50% of DAU by Month 3

---

### ⚡ Core Behavioral Metrics (Early Signals)

| Metric | Definition | Target |
|--------|-----------|--------|
| Plan Completion Rate | % of Today's Plan tasks completed | >70% |
| Feedback Loop Completion Rate | % sessions where study → quiz → feedback received | >80% |
| Plan Fidelity | User follows sequence vs jumps randomly | >80% sequential |
| Confusion Time Reduction | App open → first meaningful action | Day 1: <60s → Day 7: <10s |
| Concept Mastery Velocity | Time from first exposure → correct quiz answer | <48h for L1 concepts |
| Error Type Reduction | Silly mistakes ↓ and conceptual errors ↓ monthly | -20% silly errors/month |
| Weak Area Revisit Rate | % diagnosed gaps revisited within 72h | >80% |
| External Dependency Drop-off | Outbound clicks per session ↓ over time | ↓50% by Month 3 |
| Session Depth | % session time inside prepx vs external apps | >80% in-app |
| 🚨 Burnout Risk Indicator | High Plan Completion BUT declining Session Depth or streak break | <10% of users flagged |

---

### 📈 Outcome Metrics (Segmented by Baseline)

| Baseline | Segment | 3-Month Target | 6-Month Target |
|----------|---------|---------------|----------------|
| Low (<40% mock) | 1st-attempt / weak foundation | +30–50% | +50–70% |
| Mid (40–70%) | Repeaters with partial knowledge | +15–25% | +25–35% |
| High (70%+) | Strong performers | +5–10% | +10–15% |

| Metric | Target |
|--------|--------|
| Streak Sustainability | Median 21+ days |
| Doubt Resolution Rate | >90% cited, syllabus-aligned |
| Prelims Success Rate | 2x national average |

---

### 💰 Business Objectives

| Timeline | Objective |
|----------|-----------|
| 3 Months | 1,000 activated repeaters with structured session streak |
| 6 Months | 5,000 MAU; 60% monthly retention; OMTM >40% |
| 12 Months | ₹45 Lakh ARR (₹500 ARPU × 7,500 paid); 40% organic referrals |
| 24 Months | 50,000 active users; ₹2.5Cr ARR; NPS >75 |

**Revenue Model:** Hybrid Freemium
- **Free:** Limited daily plan, basic content, 1 subject agent
- **Pro (₹399–599/mo):** Full plan automation, all agents, weak area tracking, advanced tests + evaluation
- **Interview Add-on (₹199/mo):** Mock interview panel, personality development, essay grading

---

### Leading Indicators

| KPI | Target |
|-----|--------|
| Onboarding completion | >80% finish 5-min diagnostic |
| First "Aha" time | <60 seconds to Today's Plan |
| Content freshness SLA | <24h from source to Corpus |
| Agent response latency | <3s text, <8s agentic search |
| Paid conversion rate | >8% free → paid |

---

## MVP Scope

### Core Philosophy

> prepx MVP is NOT a "UPSC platform." It is a **Daily Execution Engine for Aspirants**.
> If it doesn't remove decision-making, enforce feedback loops, and build habit — it doesn't ship.

### ✅ Core Features (IN SCOPE)

| # | Feature | Scope | Justification |
|---|---------|-------|---------------|
| 1 | **Diagnostic Onboarding** | 5-min diagnostic → identifies weak areas + baseline score | Triggers personalized plan from Day 1 |
| 2 | **Daily Plan Generator** | Pre-curated mission: topic + linked CA bundle + quiz. Zero user decision. | Plan Completion + Structured Sessions |
| 3 | **Structured Topic Content** | Pre-processed, simplified notes for top 15–20 highest-yield Polity topics. NOT dynamic Corpus yet. | Content to consume, looped to quiz |
| 4 | **Quiz + Instant Feedback** | MCQs post-topic. Immediate diagnosis: silly mistake vs concept gap vs time issue. | Feedback Loop Completion |
| 5 | **Weak Area Auto-Injection** | No dashboard. System silently injects weak topics into tomorrow's plan. Invisible, automatic. | Plan Completion (tomorrow auto-adjusts) |
| 6 | **Hermes (MVP)** | Deterministic linear flow: Generate Plan → Serve Topic → Trigger Quiz → Return Feedback → Update Next Plan. Light AI, not complex agent routing. | Orchestrates the 3 core metrics |
| 7 | **1 Constrained Subject Agent** | Polity ONLY. Topic-bound queries, syllabus-constrained, linked to current plan. No open-ended chat. | Structured Sessions, prevents hallucination |
| 8 | **Content Control Panel (Lite)** | Upload/edit notes, tag to syllabus, push updates. Analytics via Mixpanel/PostHog. No custom analytics UI. | Enables content iteration |

### Content Strategy (Hybrid — Curated + Structured)

**Base Sources:**
- Indian Polity by M. Laxmikanth
- NCERT Political Science textbooks

**What We Actually Build:**
- Pre-process → structure → simplify manually (one-time effort)
- Output: structured topic notes with definitions, key concepts, PYQ links, common traps
- NOT raw RAG ingestion
- NOT fully original content creation

**Result:** Controlled, verified, syllabus-aligned content — fast to build, reliable to serve.

### Current Affairs (MVP)

**❌ CUT:** Real-time DuckDuckGo scraping
**✅ REPLACE:** Pre-curated static current affairs bundles, linked to Polity topics

**Rationale:** Repeaters don't fail because of missing CA feed. They fail because they can't revise + apply static knowledge. Real-time infra adds noise and complexity without improving core loop metrics.

---

### ❌ Out of Scope for MVP

| Feature | Why Cut | Target Phase |
|---------|---------|-------------|
| Full 9 Subject Agents | Only Polity in MVP. Scale after proven. | v2 |
| Dynamic/auto-updating Corpus | Static notes v1. Daily auto-scrape is heavy infra. | v2 |
| Manim/Remotion Videos | Expensive, slow. Text + diagrams only in MVP. | v3 |
| Interview Prep Module | Relevant for <5% of users. | v3 |
| AR/VR Experiences | Zero impact on core 3 metrics. | Future |
| Creator Economy Marketplace | Needs scale + community. Pre-PMF. | Future |
| Parent Dashboard | Secondary user, not core loop. | v2 |
| 50+ AI Provider Manager | Start with 2–3 providers. Scale later. | v2 |
| Mind Map / Knowledge Graph Viz | Nice UX, not essential for first 1,000. | v2 |
| Essay Evaluation / Mains Grading | Requires human-in-loop. Complex. | v3 |
| Mock Interview AI | Interview-stage users are <5%. | v3 |
| Heavy Admin Analytics UI | Use Mixpanel/PostHog. Don't build custom. | Never (use tools) |
| Open-ended Chat Agent | Risk of hallucination, distraction, "ChatGPT clone" trap. | Never (stay constrained) |

---

### MVP Success Criteria

The MVP is successful IF:

| Gate | Metric | Target |
|------|--------|--------|
| **Activation** | Complete diagnostic + generate first plan | >60% |
| **Engagement** | 7-day structured session streak | >30% of activated |
| **Loop Completion** | Feedback loop completion rate | >60% (MVP); 80% is v2 |
| **Loop Density** | % users completing 3 full loops (plan→study→quiz→feedback) in 1 week | >40% |
| **Outcome** | Mock score improvement at 6 weeks | +10% for mid-baseline repeaters |
| **Qualitative** | 10 user interviews → "I know what to study every day" | >70% agreement |

**Decision to scale to v2:** Must hit ≥4 of 6 gates.

---

### Future Vision

**v2 (Months 6–12):** Add Economy + History agents. Dynamic Corpus auto-pipeline. DuckDuckGo real-time CA. Full admin analytics. Knowledge graph visualization.

**v3 (Year 2):** All 9 subject agents. Manim video generation. Essay evaluation. Mock interviews. Parent dashboard. Creator economy marketplace.

**Future (Year 3+):** AR/VR experiences. Offline mode for rural. Government data partnerships. Full Learning OS — the original UPSC OS vision realized.

---

## Content Writing Specialist Agent *(v2)*

### Smart Books & Notes Pipeline

prepx will develop **smart books** for every UPSC subject (Polity, History, Geography, Economy, Environment, Science & Tech, IR, Ethics, CSAT) that are **comprehensive in length** yet **simplified in language** — written by a dedicated **Content Writing Specialist Agent**.

**Pipeline:**
```
Research Agent → Subject Teacher Agents (filter) → Content Writing Agent (write) →
Animated Mindmaps (Manim) → Concept Shorts (Manim/Remotion/LTX 2.0) →
Mnemonics Generator → Quiz Generator → Summary Generator → Smart Book
```

**Every chapter includes:**
1. Introduction/Overview (200–400 words)
2. Detailed Content (definitions, concepts, context, relevance)
3. Diagrams — static + animated mindmaps (Manim)
4. Mnemonics — 2–5 per chapter (acronym, story, rhyme, visual)
5. PYQ References — all relevant previous year questions
6. Mock Questions — 5 MCQs + 3 Mains-type at chapter end
7. Summary — 150-word executive recap
8. Current Affairs Link — auto-linked to latest CA

**Animated Mindmaps:** Every chapter has an animated mindmap (60-second visual summary) — Premium+ users get full access, Free users get 30-second sample preview.

**Concept Shorts per Chapter:** Admin Content Writing Agent identifies important concepts and generates 2–5 min animated shorts automatically. Admin-controlled pipeline only.

**Self-Improvement Loop:** Agent learns from user engagement (time spent, quiz scores, weak areas) and continuously improves content quality. Quarterly review — agent regenerates low-performing chapters.

**Living Books:** Books are "living" documents — updated monthly based on Research Agent feeds. Version control shows "Updated [Date]" on every chapter.

**Watermark Strategy:**
- Free: full-spread "aimasteryedu.in" watermark on all PDFs
- Premium: bottom-only watermark + copyright ⚠️

