# PrepX Information Architecture

## Site / App Map

### Public (Unauthenticated)
```
/
├── /                    — Landing Page (Hero, social proof, pricing teaser)
├── /pricing             — Plans (Free / Lieutenant / Captain / Major)
├── /login               — Authentication (Email + Google)
├── /signup              — Registration
├── /auth/callback       — OAuth redirect handler
├── /logout              — Sign-out redirect
```

### Authenticated Aspirant (Core)
```
/home                  — Dashboard (daily plan, progress ring, quick actions)
├── /blueprint         — Syllabus Tree (visual hierarchy, topic nodes)
├── /method            — Study Schedule (daily/weekly plan, session timer)
├── /action            — Task Execution (tasks, quizzes, answer writing)
│   ├── /quiz/[id]     — Quiz Screen
│   ├── /topic/[id]    — Topic Viewer (EN/HI toggle, mind map, key concepts)
│   └── /daily-plan    — Today's schedule
├── /dashboard         — Analytics (accuracy, consistency, weak areas)
├── /interview         — AI Mock Interview
├── /squads            — Study Squads (group study, leaderboards, chat)
├── /race              — UPSC Race (gamified speed quiz)
├── /reveal            — Day 14 Reveal (predicted rank, performance)
├── /predictions       — AI Topic Predictions
├── /sources           — Government Sources Feed (PIB, ARC, Lok Sabha)
├── /profile           — Profile, Settings, Subscription, Streak History
│   └── /settings      — Theme, Language, Notifications, Account
└── /onboarding        — First-time wizard (goals, level detection)
```

### Admin & Operations
```
/admin                 — Admin Dashboard (overview, analytics)
├── /content           — Content Management (topics, quizzes)
├── /scraper           — Scraper Panel (source selection, pipeline trigger)
├── /nudges            — Nudges Panel (create, schedule, status)
├── /hermes            — Hermes Panel (agent management, conversations)
├── /ai-providers      — AI Provider Management
├── /guides            — Subject Guide Agents Management
├── /subjects          — Subject & Syllabus Management
├── /quizzes           — Quiz Bank Management
└── /pricing           — Plan & Subscription Management
```

### API Endpoints (Internal)
```
/api/payments/razorpay
/api/webhooks/razorpay
/api/webhooks/stripe
/api/scrape/run
```

---

## Navigation Structure

### Primary Navigation (Bottom Tab Bar — Mobile)
| Icon | Label | Route | BMAD Fit |
|------|-------|-------|----------|
| 🏠 | Home | `/home` | BLUEPRINT overview |
| 📋 | Plan | `/method` | METHOD schedule |
| ⚡ | Action | `/action` | ACTION tasks |
| 📊 | Stats | `/dashboard` | DASHBOARD analytics |
| 👤 | Profile | `/profile` | Settings |

### Secondary Navigation (Top Bar — Desktop)
- Left: Logo + breadcrumb + AI Coach toggle
- Center: Search (global, command-k)
- Right: Streak badge + Language toggle (EN|HI) + Theme toggle + Notification bell + Avatar dropdown

### Admin Navigation (Sidebar — Desktop)
```
Dashboard
├── Content (Topics, Quizzes, Syllabus)
├── AI (Hermes, Guides, Providers)
├── Operations (Scraper, Nudges)
├── Users & Subscriptions
└── Analytics
```

### Footer (Landing/Public only)
- Product, Resources, Legal, Social links

---

## Content Taxonomy

```
UPSC CSE Syllabus
├── GS Paper 1 (Indian Heritage & Culture, History, Geography)
│   └── L1..L20 (Topics)
│       └── Subtopics
├── GS Paper 2 (Polity, Governance, International Relations)
├── GS Paper 3 (Economy, Environment, Science & Tech, Security)
├── GS Paper 4 (Ethics, Integrity, Aptitude)
├── Essay
├── Optional Subject (User-selected)
│   └── Topics / Subtopics
├── Current Affairs
│   └── PIB, ARC, Lok Sabha, Economic Survey
└── Previous Year Questions (PYQs)
    └── Year → Paper → Question

Each Topic contains:
- Title (EN + HI)
- Definitions
- Key Concepts
- Common Traps
- PYQs
- Summary
- Mind Map data
- Related Quizzes
- Source URLs
```

---

## Data Flow Diagram (User Action → System Response)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  USER ACTION                                                            │
│  (Tap, Type, Scroll, Quiz Submit, Answer Writing)                     │
└──────────────────────┬──────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  CLIENT STATE (React + Zustand/Context)                                │
│  - UI state, form inputs, local progress                               │
│  - Language preference (EN|HI)                                         │
│  - Theme (light|dark)                                                  │
└──────────────────────┬──────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  API / ROUTE HANDLER (Next.js App Router)                            │
│  - Auth (Supabase) | Payments (Razorpay) | Webhooks                  │
└──────────────────────┬──────────────────────┬────────────────────────────┘
                       │                      │
                       ▼                      ▼
┌──────────────────────────────┐  ┌──────────────────────────────────────┐
│  SUPABASE                    │  │  AI ROUTER                           │
│  - PostgreSQL (data)         │  │  - Hermes Orchestrator               │
│  - Row Level Security       │  │  - 9 Subject Guide Agents            │
│  - Realtime subscriptions   │  │  - Multi-provider fallback            │
│  - Edge Functions           │  │  - Dynamic User Twin                  │
└──────────────┬───────────────┘  └──────────────┬───────────────────────┘
               │                                 │
               ▼                                 ▼
┌──────────────────────────────┐  ┌──────────────────────────────────────┐
│  KNOWLEDGE BASE              │  │  RESPONSE                            │
│  - Pinecone (vector)        │  │  - Content generation                │
│  - pgvector (hybrid search) │  │  - Quiz questions                    │
│  - Static syllabus          │  │  - Evaluations & scores              │
└──────────────────────────────┘  │  - Predictions & nudges              │
                                  └──────────────────┬───────────────────┘
                                                     │
                                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  CLIENT RENDERING                                                       │
│  - Animated transitions | Glassmorphism | Charts | Progress rings     │
│  - Toasts, modals, AI typing indicators                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Page Inventory

| # | Page | Entry Points | Exit Points | Primary User Goal |
|---|------|-------------|------------|-------------------|
| 1 | `/` (Landing) | Direct, Ads | `/pricing`, `/login` | Understand product & trust |
| 2 | `/login` | `/`, `/signup` | `/home`, `/onboarding` | Authenticate securely |
| 3 | `/onboarding` | First login only | `/home` | Set goals, get roadmap |
| 4 | `/home` | Login, nav, push | Any module | See today's plan & progress |
| 5 | `/blueprint` | Home card, nav | `/topic/[id]` | Explore syllabus & progress |
| 6 | `/method` | Home card, nav | `/action`, `/quiz` | View & manage schedule |
| 7 | `/action` | Home, nav, nudges | `/quiz/[id]`, `/topic/[id]` | Execute today's tasks |
| 8 | `/quiz/[id]` | `/action`, `/topic/[id]` | Score screen → `/dashboard` | Test knowledge |
| 9 | `/topic/[id]` | `/blueprint`, search | `/quiz/[id]` (related) | Learn content |
| 10 | `/dashboard` | Nav, post-quiz | `/method` (weak area) | Review performance |
| 11 | `/interview` | Home card, nav | — | Practice mock interview |
| 12 | `/squads` | Home card, nav | — | Group study |
| 13 | `/race` | Home card, nav | Score screen | Speed challenge |
| 14 | `/reveal` | Scheduled, nav | `/dashboard` | See rank prediction |
| 15 | `/predictions` | Home card, nav | `/topic/[id]` | Prep predicted topics |
| 16 | `/sources` | Home card, nav | `/topic/[id]` | Read government sources |
| 17 | `/pricing` | Landing, `/profile` | Checkout | Choose plan |
| 18 | `/profile` | Nav, settings | `/pricing`, `/settings` | Manage account |
| 19 | `/admin` | Direct (role-gated) | Admin sub-pages | Operations |

---

*Document: ux-information-architecture.md | Phase: Planning | BMAD Designer: Sally*
