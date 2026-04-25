# PrepX UX Strategy

## Product UX Mission
> **"To make every UPSC aspirant feel seen, guided, and unstoppable — by designing an intelligent learning companion that transforms overwhelm into clarity, and anxiety into confidence."**

PrepX is not a content app. It is a learning operating system. The UX must make aspirants feel like they have a personal IAS mentor in their pocket — one that remembers their weaknesses, celebrates their streaks, and never lets them drift.

---

## User Personas

### 1. Aarav — The First-Time Aspirant (Age 22, Final Year BA)
- **Mindset**: Overwhelmed by syllabus. Does not know where to start.
- **Goals**: Understand the exam, build a study habit, feel progress weekly.
- **Pain Points**: Too many resources, no structure, fear of failure.
- **Tech Comfort**: High (native mobile user), but impatient with bad UX.
- **Device**: Smartphone primary, laptop for long study sessions.

### 2. Priya — The Repeater (Age 26, 2nd Attempt)
- **Mindset**: Knows the syllabus. Needs targeted improvement in specific weak areas.
- **Goals**: Identify gaps, get precise feedback, optimize time.
- **Pain Points**: Generic coaching, repetitive content, no personalization.
- **Tech Comfort**: High, values efficiency over flash.
- **Device**: Laptop primary, mobile for revision.

### 3. Rahul — The Working Professional (Age 29, Banking Sector)
- **Mindset**: Time-constrained, highly motivated.
- **Goals**: Maximum ROI per study hour. Mobile-first study during commute.
- **Pain Points**: Cannot attend live classes, needs async, bite-sized content.
- **Tech Comfort**: Moderate, prefers deterministic flows.
- **Device**: Smartphone dominant, occasionally tablet.

### 4. Sunita — The Hindi Medium Aspirant (Age 24, Rural UP)
- **Mindset**: Prefers Hindi content but needs English for exam readiness.
- **Goals**: Study in Hindi, switch to English gradually, build confidence.
- **Pain Points**: Most apps are English-only or poor Hindi translations.
- **Tech Comfort**: Moderate, data-conscious.
- **Device**: Budget Android smartphone.

---

## Core UX Values

| Value | Definition |
|-------|------------|
| **Clarity** | No clutter. Every screen has one primary job. |
| **Progress** | Users must *feel* progress — streaks, rings, graphs. |
| **Trust** | AI must be transparent. No black-box scoring. |
| **Inclusion** | Hindi and English are first-class citizens. |
| **Calm** | Reduce aspirational anxiety. Soft palettes, gentle motion. |
| **Power** | Power-user features (AI coach, deep analytics) are discoverable but not intrusive. |

---

## Design Principles

### P1: Every Screen Serves the BMAD Loop
Every interface must map to one of the four BMAD pillars:
- **BLUEPRINT**: Roadmaps, syllabus trees, goal setting
- **METHOD**: Schedules, step-by-step flows, timed sessions
- **ACTION**: Quizzes, answer writing, revision, recall
- **DASHBOARD**: Analytics, feedback, predictions, rank reveals

### P2: The Interface is the Mentor
The UI voice speaks like a mentor — never robotic. Confirmations say *"Excellent work, Aarav. You have beaten your accuracy streak."* not *"Data saved successfully."*

### P3: Progressive Disclosure
Do not show all 19 subjects at once. Show today's task. Expand on demand.

### P4: Mobile-First, Desktop-Rich
Mobile: bite-sized, single-column, touch-optimized. Desktop: side-by-side, deep analytics, keyboard shortcuts.

### P5: Motion with Meaning
Every animation guides attention or celebrates progress. No decorative motion.

### P6: AI Transparency
When AI generates content or scores an answer, show confidence, source reasoning, and a "Why?" toggle.

---

## Competitive Differentiation

| Competitor | Weakness | PrepX UX Win |
|------------|----------|--------------|
| **VisionIAS** | Dense, coaching-centric UI; no AI personalization | Clean, aspirant-first AI dashboard; Dynamic User Twin |
| **Drishti IAS** | Hindi-only, poor mobile responsiveness | Seamless EN/HI bilingual toggle; responsive glassmorphism |
| **InsightsonIndia** | Static content, no progress tracking | Live progress rings, streaks, real-time AI feedback |
| **Unacademy** | Overwhelming catalog, instructor-dependent | Structured BMAD flow; AI orchestrator guides, not catalogs |

---

## Emotional Design Strategy

### The 2-Year Motivation Arc
UPSC preparation is a marathon. The UX must deliver emotional sustenance at key inflection points:

| Phase | Emotional Need | UX Mechanism |
|-------|----------------|--------------|
| **Week 1-2** | Curiosity & hope | Gorgeous onboarding, immediate personalized roadmap |
| **Month 1-3** | Building habit | Streaks, daily plan push notifications, "You're on track" reinforcements |
| **Month 6** | Doubt & fatigue | Nudges: "Priya, your Polity accuracy is up 12% — keep going" |
| **Month 12** | Pre-exam anxiety | Mock test simulations, Day 14 Reveal, Study Squads for peer support |
| **Post-result** | Validation / redirection | Alumni network, optional coaching marketplace |

### Delight Moments
- First personalized roadmap generation animation
- Streak milestone celebrations (confetti + mentor message)
- Day 14 Reveal rank prediction with cinematic animation
- Getting a quiz question right after revision — "Because you revised this yesterday"
- AI Coach proactively suggesting a weak topic before the user asks

---

## AI Trust & Transparency Patterns

1. **Confidence Badges**: Every AI-generated prediction or score shows a confidence % (e.g., "Hermes is 87% confident in this prediction").
2. **Source Attribution**: AI-generated content links to source PIB/ARC/Lok Sabha items.
3. **Explainability Toggles**: "Why this topic?" reveals the Dynamic User Twin logic.
4. **Human-in-the-Loop**: Admin-reviewed content gets a verified badge.
5. **No Hallucination Zones**: Static syllabus and PYQs are never AI-generated; clearly labeled.

---

## Accessibility Strategy (WCAG 2.1 AA)

- **Color Contrast**: All text meets 4.5:1 minimum (glassmorphism layers use opaque backing behind text).
- **Keyboard Navigation**: Full Tab navigation on desktop. Focus rings with 2px offset.
- **Screen Readers**: All icons paired with aria-labels. Charts have accessible data tables.
- **Motion Reduction**: `prefers-reduced-motion` disables parallax, stagger animations, and confetti.
- **Font Sizing**: Base 16px (rem) scaling. No fixed px for body text.
- **Touch Targets**: Minimum 44x44dp for all interactive elements.
- **Hindi Readability**: Noto Sans Devanagari optimized for 1.6em line-height.

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Day-1 Retention | > 60% |
| Day-7 Retention | > 35% |
| Task Completion Rate | > 75% |
| NPS | > 75 |
| Hindi Mode Adoption | > 30% |
| Accessibility Score (Lighthouse) | > 95 |
| avg. Session Duration | > 18 min |

---

*Document: ux-strategy.md | Phase: Planning | BMAD Designer: Sally*
