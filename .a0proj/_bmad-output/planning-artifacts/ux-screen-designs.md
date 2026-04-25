# PrepX Screen Designs

## Design Foundation

### Layout Grid
- Mobile: 4-column grid, 16px gutters, 16px margins
- Tablet: 8-column grid, 24px gutters, 24px margins
- Desktop: 12-column grid, 24px gutters, max-width 1280px centered

### Glassmorphism Spec
- Background: `rgba(255,255,255,0.05)` dark / `rgba(0,0,0,0.03)` light
- Border: `1px solid rgba(255,255,255,0.10)` dark / `1px solid rgba(0,0,0,0.06)` light
- Backdrop-filter: `blur(20px) saturate(180%)`
- Shadow: `0 8px 32px rgba(0,0,0,0.12)`
- Inner glow (accent): `inset 0 1px 0 rgba(255,255,255,0.08)`

---

## 1. Landing / Root Page (`/`)

**Purpose**: Convert visitors to signups.

**Layout**:
```
┌──────────────────────────────────────────────────────────┐
│  NAV    Logo    Product  Features  Pricing     Login CTA │
├──────────────────────────────────────────────────────────┤
│                                                          │
│   ┌─────────────────────────────────────────────────┐   │
│   │         HERO SECTION                            │   │
│   │  "Clear UPSC with your AI Mentor"               │   │
│   │  Sub: Personalized AI study plans, mock tests,   │   │
│   │       and real-time analytics for serious       │   │
│   │       aspirants.                                │   │
│   │  [ CTA: Start Free — No Credit Card ]           │   │
│   │         Glow button, neon gradient border        │   │
│   └─────────────────────────────────────────────────┘   │
│                                                          │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│   │  Feature │ │  Feature │ │  Feature │ │  Feature │  │
│   │   Card   │ │   Card   │ │   Card   │ │   Card   │  │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                          │
│   ┌─────────────────────────────────────────────────┐   │
│   │   SOCIAL PROOF: 12,000+ aspirants, NPS 75+    │   │
│   │   Avatars row + metrics strip                 │   │
│   └─────────────────────────────────────────────────┘   │
│                                                          │
│   ┌─────────────────────────────────────────────────┐   │
│   │   PRICING TEASER: "Free forever. Premium for    │   │
│   │   serious aspirants." → Links to /pricing     │   │
│   └─────────────────────────────────────────────────┘   │
│                                                          │
│  FOOTER: Resources | Legal | Social                    │
└──────────────────────────────────────────────────────────┘
```

**Components**:
- Hero: H1 (48px desktop, 32px mobile), gradient text (blue→purple→cyan), centered
- CTA Button: Primary gradient, glow shadow on hover
- Feature cards: Glassmorphism cards with icon + title + description
- Social proof: Avatar row (5 random aspirant images), metrics (Active users, Tests taken, Rank predictions)
- Pricing teaser: 3-tier preview (Free / Lieutenant / Captain)

**Micro-interactions**:
- Hero text: Staggered fade-in on load (y: 30 → 0, opacity 0 → 1, 0.6s)
- Feature cards: Hover scale 1.02, border glow intensify
- CTA: Continuous subtle pulse glow (CSS animation, 3s loop)

---

## 2. Onboarding Flow (`/onboarding`)

**Purpose**: Capture user context, generate personalized roadmap.

**Flow**:
1. **Goal Selection** (Screen 1)
   - Cards: IAS, IPS, IFS, IRAS
   - Glassmorphism cards, single-select, selected state = neon border glow
   - Swipe left/right on mobile

2. **Background** (Screen 2)
   - Radio: Student / Working Professional / Repeater
   - "Year of graduation" if Student
   - "Years of work experience" if Professional
   - "Previous attempts" if Repeater

3. **Level Detection** (Screen 3)
   - Self-assessment sliders (1-10) for:
     - Polity, History, Economy, Geography, Science & Tech, Current Affairs
   - Slider UI: Track = gradient, thumb = neon glow
   - "Don't know? Skip → Hermes will assess you later."

4. **Schedule** (Screen 4)
   - Input: Hours per day (0.5, 1, 2, 3, 4, 5+)
   - Toggle days: M T W T F S S (multi-select)
   - Preferred study slots: Morning / Afternoon / Evening / Night

5. **Roadmap Generation** (Screen 5)
   - Full-screen loading animation
   - Hermes avatar typing
   - Progress: Analyzing syllabus... → Building your plan... → Personalizing content...
   - Success: Roadmap card slides up with 3-month summary
   - "Welcome, [Name]. Your 12-month plan is ready."
   - CTA: "Let's begin"

**Layout**:
```
┌─────────────────────────┐
│   Top: Progress dots    │
│                         │
│   ┌─────────────────┐   │
│   │                 │   │
│   │   CONTENT       │   │
│   │   AREA          │   │
│   │                 │   │
│   └─────────────────┘   │
│                         │
│   [← Back]  [Next →]   │
└─────────────────────────┘
```

**Data Captured**: Goal, background, self-ratings, hours/day, days/week, time slots

**Light/Dark**: Same component structure, background shifts from slate-900 to white, cards from glass to subtle borders.

**Hindi Mode**: All labels use Noto Sans Devanagari, wider line-height, buttons allow Devanagari text to breathe.

---

## 3. Login / Signup (`/login`, `/signup`)

**Purpose**: Secure, frictionless authentication.

**Layout**:
```
┌──────────────────────────────────────────┐
│                                          │
│         ┌───────────────────┐          │
│         │    PREPX LOGO     │          │
│         │   "Welcome back"   │          │
│         │                    │          │
│         │ [Sign in with Google]        │
│         │        ─ or ─      │          │
│         │ Email: [________]  │          │
│         │ Password: [______] │          │
│         │ [  Log In  ]       │          │
│         │                    │          │
│         │ New? Create account →        │
│         └───────────────────┘          │
│                                          │
└──────────────────────────────────────────┘
```

**Components**:
- Google Button: White card with Google icon, subtle shadow
- Email input: Glassmorphism border, neon focus ring
- Password input: Toggle visibility icon
- "Forgot password?" link

**Micro-interactions**:
- Input focus: Border glows blue, placeholder slides up as label
- Error state: Input border red, shake animation (translateX -4px → 4px → 0, 300ms)
- Success: Fades to /home with page-transition slide

---

## 4. Home Dashboard (`/home`)

**Purpose**: Central hub. "What should I do today?"

**Layout (Desktop)**:
```
┌────────────────────────────────────────────────────────────┐
│  PREPX  Search...      EN|HI ☀️🔔 👤                     │
├────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────────┐  ┌──────────────────┐     │
│  │Progress │  │   AI COACH   │  │   TODAY'S PLAN   │     │
│  │  Ring   │  │  "Polity is  │  │   3 tasks        │     │
│  │   68%   │  │  your edge.  │  │   [Start]        │     │
│  │         │  │  Keep going!"│  │                    │     │
│  │Streak: 7│  │   [Say hi]   │  │ 📋 Polity Quiz    │     │
│  │days 🔥   │  │              │  │ 📝 Answer Writing │     │
│  └─────────┘  └─────────────┘  │ 📖 Current Affairs│     │
│                                └──────────────────┘     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │Quick Action: │ │Quick Action:  │ │Quick Action:  │   │
│  │  Start Quiz  │ │Review Weak   │ │Join Squad    │   │
│  └──────────────┘ └──────────────┘ └──────────────┘   │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  WEEKLY CONSISTENCY HEATMAP                        │ │
│  │  M T W T F S S  (green/orange/red blocks)          │ │
│  └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

**Layout (Mobile)**:
```
┌──────────────────────┐
│  PREPX    EN|HI  👤  │
├──────────────────────┤
│  ┌────────────────┐  │
│  │ Progress Ring  │  │
│  │     68%        │  │
│  │ Streak: 7 🔥   │  │
│  └────────────────┘  │
│  "Polity is your    │
│   edge." [Say hi]   │
│  ──────────────────  │
│  TODAY'S PLAN        │
│  □ Polity Quiz      │
│  □ Answer Writing   │
│  □ Current Affairs  │
│  ──────────────────  │
│  QUICK ACTIONS       │
│  [Quiz] [Weak] [Sqd]│
│  ──────────────────  │
│  HEATMAP             │
│  M T W T F S S       │
│  🟢🟢🟢🟡🟢🟢🟢       │
│                      │
│  🏠 📋 ⚡ 📊 👤      │
└──────────────────────┘
```

**Mobile Bottom Nav** (5 tabs):
1. Home
2. Method (/method)
3. Action (/action)
4. Dashboard (/dashboard)
5. Profile (/profile)

**Data Displayed**:
- Progress ring: SVG, stroke-dasharray animated (1.2s ease-out)
- Streak counter: Number with fire emoji, milestone confetti at 7, 14, 30, 50, 100
- AI Coach: Avatar + latest suggestion text
- Today's plan: Task cards with checkboxes
- Heatmap: 7-day grid, green = completed, yellow = partial, red = missed

**Interactions**:
- Tap task card → Navigates to respective screen
- Pull down → Refresh data (spinner + subtle haptic)
- AI Coach tap → Opens AI Coach panel (slide-up sheet on mobile, sidebar on desktop)

---

## 5. Blueprint Module (`/blueprint`)

**Purpose**: Visual syllabus exploration.

**Layout**:
```
┌───────────────────────────────────────────────────────┐
│  PREPX  Search...    EN|HI ☀️🔔 👤                    │
├───────────────────────────────────────────────────────┤
│  GS Paper 1 | GS Paper 2 | GS Paper 3 | GS Paper 4  │
│  ┌─────────────────────────────────────────────────┐  │
│  │                                                 │  │
│  │   SYLLABUS TREE VISUALIZATION                   │  │
│  │                                                 │  │
│  │      ○ Indian Heritage & Culture                │  │
│  │      │                                          │  │
│  │      ├─ ○ Art & Culture                         │  │
│  │      │   ├─ ○ Architecture (60%) [progress bar] │  │
│  │      │   └─ ○ Literature (30%)                 │  │
│  │      │                                          │  │
│  │      ├─ ○ History                              │  │
│  │      │   ├─ ○ Ancient History (80%)            │  │
│  │      │   ├─ ○ Medieval History (45%)           │  │
│  │      │   └─ ○ Modern History (70%)              │  │
│  │      │                                          │  │
│  │      └─ ○ Geography                            │  │
│  │                                                 │  │
│  │   Click node → opens /topic/[id]               │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │  YOUR PROGRESS                                  │ │
│  │  Topics completed: 47 / 380                     │ │
│  │  Quizzes taken: 124                             │ │
│  │  Accuracy: 71%                                  │ │
│  └─────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┘
```

**Components**:
- Tab bar: 4 GS Papers
- Tree visualization: Radial/collapsible tree on desktop, vertical accordion on mobile
- Topic nodes: Circle + label + mini progress bar
- Completed nodes: Filled circle with checkmark
- Locked nodes: Dimmed, lock icon

**Interactions**:
- Tap/click node → Expands children OR navigates to topic if leaf
- Long press/hover → Tooltip with completion % and quick "Start Quiz" button
- Horizontal scroll on mobile for tree navigation
- Search bar filters nodes in real-time

**Dark Mode**: Tree on dark canvas, neon node connections (blue/purple), nodes glow on hover.

---

## 6. Method Module (`/method`)

**Purpose**: Step-by-step study plan view.

**Layout**:
```
┌──────────────────────────────────────────────────────┐
│  THIS WEEK: Apr 21 - Apr 27                          │
│  ┌────────────────────────────────────────────────┐  │
│  │ MON  Apr 21                                      │  │
│  │ □ Polity Fundamental Rights (1.5h)             │  │
│  │ □ Current Affairs — PIB 24 Apr (30m)           │  │
│  │ □ Revision: Ancient History (45m)              │  │
│  │ ──────                                           │  │
│  │ TUE  Apr 22                                      │  │
│  │ □ Geography — Physical Geography (2h)          │  │
│  │ □ Quiz: Polity PYQs (30m)                      │  │
│  │ ──────                                           │  │
│  │ View full week →                                 │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  SESSION TIMER                                  │  │
│  │  [ 25:00 ]  [Start] [Short Break] [Long Break]  │  │
│  │  Pomodoro-style with custom durations            │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  UPCOMING MILESTONES                            │  │
│  │  ► Mock Test — Apr 28                           │  │
│  │  ► Day 14 Reveal — May 5                       │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

**Components**:
- Weekly calendar strip (horizontal scroll mobile, grid desktop)
- Task cards with checkbox, duration pill, topic tag
- Session timer: Pomodoro with customizable focus/break intervals; glassmorphism overlay when active
- Milestones: Date + event cards

**Interactions**:
- Checkbox tap → Strikethrough + confetti microburst + progress ring update
- Task card tap → Navigates to /topic or /quiz
- Timer start → Full-screen timer overlay with blurred background
- Swipe task left → "Reschedule" or "Remove"

**Data**: Schedule from Hermes, user completion status, timer state

---

## 7. Action Module (`/action`)

**Purpose**: Daily task execution hub.

**Layout**:
```
┌──────────────────────────────────────────────────────┐
│  TODAY'S ACTION                                       │
│  3 tasks remaining | Est. 2h 15m                     │
├──────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────┐  │
│  │  📋 QUIZ: Polity Fundamental Rights           │  │
│  │  15 questions | 20 min | Accuracy target: 75% │  │
│  │  [Start Quiz →]                                │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  📝 ANSWER WRITING: FR & DPSP                │  │
│  │  200 words | 12 min | Mock Mains              │  │
│  │  [Start Writing →]                            │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  📖 READ: Current Affairs — PIB 24 Apr        │  │
│  │  5 min read | 3 key takeaways                │  │
│  │  [Read Topic →]                               │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  COMPLETED TODAY                                      │
│  ✓ Polity Quiz — 80% (strikethrough, dimmed)        │
└──────────────────────────────────────────────────────┘
```

**Micro-interactions**:
- Task completion: Card slides up, checkbox fills with green, card collapses with fade
- Empty state: "All done! 🎉" celebration animation
- "Add Extra" button → Quick quiz / revision suggestion

---

## 8. Dashboard Module — Analytics (`/dashboard`)

**Purpose**: Performance tracking.

**Layout**:
```
┌──────────────────────────────────────────────────────┐
│  YOUR PERFORMANCE                                     │
├──────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │Accuracy │  │Time     │  │Streak   │  │Topics   │ │
│  │  71%    │  │  2.3h   │  │  7days  │  │  47/380 │ │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘ │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │  ACCURACY TREND (Line chart, 30 days)         │  │
│  │  80% ┤          ●                               │  │
│  │  70% ┤    ●   ●    ●                           │  │
│  │  60% ┤ ●              ●   ●                    │  │
│  │  40% ┤                                          │  │
│  │      └─┬──┬──┬──┬──┬──┬──┬─                   │  │
│  │        W1 W2 W3 W4 W5 W6 W7                    │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │  CONSISTENCY HEATMAP (7x12 grid, year view)   │  │
│  │  ■ ■ ■ □ ■ ■ ■                                │  │
│  │  ■ ■ □ ■ ■ □ ■                                │  │
│  │  ...                                            │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │  WEAK AREA RADAR CHART                        │  │
│  │  Polity ████████░░ 80%                        │  │
│  │  History ██████░░░░ 60%                       │  │
│  │  Geography ████░░░░░░ 40%                     │  │
│  │  Economy ███████░░░ 70%                       │  │
│  │  SciTech ██████░░░░ 55%                       │  │
│  │  CA ████████░░ 75%                            │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  COMPARE WITH TARGET                                  │
│  Your avg: 71%    Target: 85%   Gap: -14%            │
│  [ AI Suggestion: Focus on Geography ]                 │
└──────────────────────────────────────────────────────┘
```

**Components**:
- KPI cards: Glassmorphism, large number with trend arrow (up/down)
- Line chart: Canvas/SVG, animated draw-on-load (stroke-dasharray)
- Heatmap: CSS grid, color-coded by completion intensity
- Radar chart: SVG polygon overlay on circular grid
- Target comparison: Progress bar with gap indicator

**Mobile**: Stacked cards, horizontal scroll for charts, tabbed sections (Overview | Trends | Weak Areas)

**Dark Mode**: Charts use neon palette (blue/cyan/magenta), grid lines in subtle white.

---

## 9. Interview Module (`/interview`)

**Purpose**: AI mock interview practice.

**Layout**:
```
┌──────────────────────────────────────────────────────┐
│  AI MOCK INTERVIEW                                    │
│  Subject: Polity  |  Difficulty: UPSC Standard        │
├──────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────┐  │
│  │  AI PANEL (3 avatars)                         │  │
│  │  ┌────┐  ┌────┐  ┌────┐                     │  │
│  │  │ 👤 │  │ 👤 │  │ 👤 │                     │  │
│  │  │ M1 │  │ M2 │  │ M3 │                     │  │
│  │  └────┘  └────┘  └────┘                     │  │
│  │  M2 is asking...                              │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │  QUESTION CARD                                │  │
│  │  "What are the implications of the 73rd     │  │
│  │   Constitutional Amendment?"                   │  │
│  │  [Start Timer]  [Skip]  [Hint]               │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │  YOUR RESPONSE                                │  │
│  │  Toggle: [Voice 🎤] [Text ⌨️]                 │  │
│  │  [Textarea / Voice waveform visualizer]        │  │
│  │  [ Submit Response ]                          │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │  REAL-TIME SCORE OVERLAY (after submit)       │  │
│  │  Score: 7.5/10                                │  │
│  │  Structure: 8/10  | Content: 7/10  | Clarity: 8/10│  │
│  │  "Good structure. Add more examples."          │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

**Interactions**:
- Voice toggle: Microphone permission, waveform visualizer while recording
- Textarea: Word count in footer, 200-word target
- Submit: AI panel "discusses" (3s animation), then score reveals with number counter
- Question: Swipe for next or tap "Next Question"

**Data**: Subject, question bank, AI evaluation scores, previous attempts

---

## 10. Topic Viewer (`/topic/[id]`)

**Purpose**: Learn topic content.

**Layout**:
```
┌──────────────────────────────────────────────────────┐
│  ← Back   Fundamental Rights           [EN|HI] 📖🔖  │
├──────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────┐  │
│  │  TITLE: Fundamental Rights (Part III)         │  │
│  │  GS Paper 2 > Polity > Constitutional Framework│  │
│  │  breadcrumb                                     │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │  MIND MAP VIEW (Toggle: 📊 Mind Map | 📋 List)│  │
│  │  Radial graph or collapsible tree              │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │  DEFINITIONS                                  │  │
│  │  ┌──────────────────────────────────────────┐ │  │
│  │  │ "Fundamental Rights are..." — key para    │ │  │
│  │  │ Source: Laxmikant Polity, 6th Ed         │ │  │
│  │  └──────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │  KEY CONCEPTS                                 │  │
│  │  ┌──────────────────────────────────────────┐ │  │
│  │  │ Right to Equality                            │  │
│  │  │ • Articles 14-18                          │  │
│  │  │ • Exceptions                               │  │
│  │  │ [Expand →]                                  │  │
│  │  └──────────────────────────────────────────┘ │  │
│  │  ┌──────────────────────────────────────────┐ │  │
│  │  │ Right to Freedom                           │  │
│  │  │ • Articles 19-22                           │  │
│  │  │ • Reasonable restrictions                  │  │
│  │  │ [Expand →]                                  │  │
│  │  └──────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │  COMMON TRAPS ⚠️                              │  │
│  │  • "Right to property is NOT a FR anymore"   │  │
│  │  • "DPSP is not enforceable"                   │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │  PREVIOUS YEAR QUESTIONS                      │  │
│  │  • 2023 Prelims: Q12 [View]                   │  │
│  │  • 2022 Mains: Q4 [View]                     │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │  SUMMARY                                      │  │
│  │  "Fundamental Rights are enforceable..."      │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  [ Take Quiz ]  [ Add to Revision List ]            │
└──────────────────────────────────────────────────────┘
```

**Components**:
- Language toggle: EN|HI pills, content switches with crossfade animation
- Breadcrumb: Tap any level to navigate up
- Mind map: Radial or tree layout (desktop only, collapsible)
- Key concepts: Expandable accordion cards
- Bookmark: Heart icon, filled when active

**Hindi Mode**:
- Font switches to Noto Sans Devanagari
- Line-height: 1.6em minimum
- Content layout shifts slightly right for Devanagari alignment
- Mind map labels adjust for longer Devanagari words

**Micro-interactions**:
- Language toggle: Content crossfade (opacity 0 → 1, 200ms)
- Expand concept: Height animation 0 → auto (300ms ease)
- Bookmark: Heart scale 1 → 1.3 → 1 with red glow
- Scroll: Parallax subtle on header image (if present)

---

## 11. Quiz Screen (`/quiz/[id]`)

**Purpose**: Test knowledge.

**Layout**:
```
┌──────────────────────────────────────────────────────┐
│  ← Exit   Polity Quiz       [EN|HI]     Timer: 0:45  │
├──────────────────────────────────────────────────────┤
│  Progress: ████████░░░░ 8/10                          │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │  Q8. Which Article guarantees the Right to    │  │
│  │      Constitutional Remedies?                  │  │
│  │      [Hint?]                                   │  │
│  │                                                │  │
│  │  A. Article 32                                │  │
│  │  B. Article 356                               │  │
│  │  C. Article 352                               │  │
│  │  D. Article 368                               │  │
│  │                                                │  │
│  │  [ Submit ]                                    │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │  EXPLANATION (appears after submit)            │  │
│  │  Correct: Article 32 is known as the...        │  │
│  │  Source: Laxmikant, 6th Ed, Ch 3              │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

**States**:
- Default: All options neutral
- Selected: Option highlighted with blue border
- Correct: Green pulse + checkmark, "Correct!" toast
- Incorrect: Red shake + X mark, correct answer revealed

**Timer**:
- Circular countdown ring around question number
- Last 10s: Ring turns red, pulses
- Time up: Auto-submit, "Time's up!" toast

**Score Screen**:
```
┌──────────────────────────────────────────────────────┐
│  QUIZ COMPLETE                                        │
│  ┌────────────────────────────────────────────────┐  │
│  │          🎉  8/10  🎉                           │  │
│  │         80% Accuracy                           │  │
│  │  Ring animation: fill to 80%                   │  │
│  │  Streak updated: 🔥 8 days                      │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │  BREAKDOWN                                      │  │
│  │  Correct: 8  |  Wrong: 2  |  Skipped: 0       │  │
│  │  Time: 4m 32s                                   │  │
│  │  Strongest: Polity (100%)                      │  │
│  │  Weakest: Geography (50%)                      │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  [ Review Answers ]  [ Next Quiz ]  [ Share Score ] │
└──────────────────────────────────────────────────────┘
```

**Micro-interactions**:
- Score reveal: Number counter animation (0 → 8/10, 1s)
- Confetti burst on >70%
- Ring animation: SVG stroke-dasharray draws from 0 to score%
- "New high score!" badge if personal best

---

## 12. Daily Plan Page (`/daily-plan` — detail view)

**Purpose**: Detailed day schedule.

**Layout**:
```
┌──────────────────────────────────────────────────────┐
│  April 25, Thursday                [Edit Plan ⚙️]  │
├──────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────┐  │
│  │  MORNING SESSION (7:00 - 9:00 AM)             │  │
│  │  □ Polity — Fundamental Rights (1.5h)       │  │
│  │    [Start →]                                  │  │
│  │  □ Quick Quiz: Polity (15 min)                │  │
│  │    [Start →]                                  │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  AFTERNOON SESSION (2:00 - 4:00 PM)          │  │
│  │  □ Geography — Physical Geography (1.5h)      │  │
│  │  □ Answer Writing: FR & DPSP (30 min)         │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  EVENING SESSION (8:00 - 9:00 PM)              │  │
│  │  □ Current Affairs — PIB 24 Apr (30 min)        │  │
│  │  □ Revision: History (30 min)                   │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  COMPLETED TODAY                                      │
│  ✓ Polity Quiz — 80%                                  │
│                                                       │
│  [ AI: You are 30 min ahead of schedule. Keep it up! ]│
└──────────────────────────────────────────────────────┘
```

**Interactions**:
- Checkbox tap → Task done, card collapses, progress updates
- Edit Plan → Drag-and-drop reorder, add/remove tasks
- Session header: Tap to collapse/expand
- AI Coach message at bottom: Contextual encouragement

---

## 13. Study Squads (`/squads`)

**Purpose**: Group study and peer motivation.

**Layout**:
```
┌──────────────────────────────────────────────────────┐
│  STUDY SQUADS            [Create Squad +]  [Join 🔗]│
├──────────────────────────────────────────────────────┤
│  MY SQUAD                                             │
│  ┌────────────────────────────────────────────────┐  │
│  │  Squad Name: "The Civilians"                    │  │
│  │  Members: 12/20  |  Avg Streak: 8 days        │  │
│  │  Weekly Target: 15h/20h                         │  │
│  │  [ Chat ]  [ Leaderboard ]  [ Challenges ]      │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  LEADERBOARD                                          │
│  ┌────────────────────────────────────────────────┐  │
│  │  🥇 Aarav — 12h this week  95% accuracy        │  │
│  │  🥈 Priya — 11h            91% accuracy        │  │
│  │  🥉 Rahul — 10.5h           88% accuracy        │  │
│  │  4. Sunita — 9h              85% accuracy        │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  SQUAD CHAT                                           │
│  ┌────────────────────────────────────────────────┐  │
│  │  Priya: Anyone up for a Polity quiz?           │  │
│  │  Aarav: Count me in! 5 min.                    │  │
│  │  [Message input] [Send]                         │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

**Interactions**:
- Send message → Message slides in from bottom, scroll auto
- Leaderboard: Tap row → view member profile
- Challenge: Tap "Challenge" → creates shared quiz lobby
- Squad stats: Live updates via Supabase Realtime

---

## 14. UPSC Race (`/race`)

**Purpose**: Gamified speed quiz.

**Layout**:
```
┌──────────────────────────────────────────────────────┐
│  UPSC RACE 🏁                                        │
│  Subject: Polity  |  Time Limit: 60s               │
├──────────────────────────────────────────────────────┤
│  LIVE LEADERBOARD                                     │
│  ┌────────────────────────────────────────────────┐  │
│  │  🥇 Aarav — 12 pts  (Speed: 4.2s/q)         │  │
│  │  🥈 Priya — 11 pts                           │  │
│  │  You — 9 pts (#3)                            │  │
│  │  ────                                          │  │
│  │  4. Rahul — 8 pts                            │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │  QUESTION                                      │  │
│  │  Which writ is issued against illegal          │  │
│  │  detention?                                    │  │
│  │                                                │  │
│  │  A. Mandamus     B. Habeas Corpus             │  │
│  │  C. Prohibition  D. Quo Warranto              │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  SPEED: 3.8s (avg) | Combo: 🔥 x3                   │
│  [ Submit ]                                           │
└──────────────────────────────────────────────────────┘
```

**Interactions**:
- Live leaderboard updates every 2s (WebSocket)
- Combo streak: Fire icon multiplies, visual pulse
- Time pressure: Timer bar shrinks, red flash at <10s
- Result screen: Rank animation (number scrolls up), "You ranked #3 out of 50!"

---

## 15. Day 14 Reveal (`/reveal`)

**Purpose**: Predicted rank reveal — emotional climax.

**Layout**:
```
┌──────────────────────────────────────────────────────┐
│  DAY 14 REVEAL ✨                                     │
├──────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────┐  │
│  │  Cinematic intro animation (3s)               │  │
│  │  Particles → Hermes avatar emerges           │  │
│  │  "Aarav, based on your 14-day performance..." │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │           YOUR PREDICTED RANK                  │  │
│  │                                                │  │
│  │              AIR 340                           │  │
│  │         [number counter: 0 → 340, 2s]         │  │
│  │                                                │  │
│  │  ┌─────────────────────────────────────────────┐ │
│  │  │  Accuracy: 74% | Consistency: 8/14 days    │ │
│  │  │  Strongest: Polity (92%)                     │ │
│  │  │  Improvement needed: Geography (+15%)        │ │
│  │  └─────────────────────────────────────────────┘ │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  "You are in the top 0.3% of all aspirants on PrepX." │
│  "Keep going. The real exam is your stage."           │
│                                                       │
│  [ Share Achievement ]  [ Next 14-Day Plan ]          │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │  COMPARE WITH TOP 100                          │  │
│  │  Your avg: 74%    Top 100 avg: 82%             │  │
│  │  Gap: -8%  [Focus: Geography, Science]        │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

**Animations**:
- Cinematic intro: Particles from center, Hermes avatar fade-in
- Rank reveal: Number counts up with spring physics, glow intensifies
- Success sound (optional, can be muted)
- Share card: Pre-formatted image for social media

**Hindi Mode**: "आपकी अनुमानित रैंक: AIR 340" — same layout, Devanagari font.

---

## 16. Predictions Page (`/predictions`)

**Purpose**: AI-generated exam topic predictions.

**Layout**:
```
┌──────────────────────────────────────────────────────┐
│  AI PREDICTIONS 🔮                    [How? ℹ️]      │
├──────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────┐  │
│  │  HIGH CONFIDENCE (≥80%)                        │  │
│  │  ┌──────────────────────────────────────────┐ │  │
│  │  │ 📌 Right to Constitutional Remedies      │ │  │
│  │  │    Confidence: 92%                       │ │  │
│  │  │    Source: Recent SC judgments, PYQ pattern│ │  │
│  │  │    [ Read Topic ]                         │ │  │
│  │  └──────────────────────────────────────────┘ │  │
│  │  ┌──────────────────────────────────────────┐ │  │
│  │  │ 📌 Panchayati Raj Institutions          │ │  │
│  │  │    Confidence: 88%                       │ │  │
│  │  │    [ Read Topic ]                         │ │  │
│  │  └──────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  MODERATE CONFIDENCE (50-80%)                 │  │
│  │  ┌──────────────────────────────────────────┐ │  │
│  │  │ 📎 Environment + Climate Change           │ │  │
│  │  │    Confidence: 72%                       │ │  │
│  │  │    [ Read Topic ]                         │ │  │
│  │  └──────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  LOW CONFIDENCE (<50%)                          │  │
│  │  ┌──────────────────────────────────────────┐ │  │
│  │  │ 📎 Science & Tech — Space Programs         │ │  │
│  │  │    Confidence: 45% — Trending             │ │  │
│  │  └──────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  Last updated: April 24, 2026 by Hermes              │
└──────────────────────────────────────────────────────┘
```

**Interactions**:
- Confidence badge color: Green (≥80), Yellow (50-80), Red (<50)
- Tap card → /topic/[id]
- "How?" info → Modal explaining Hermes prediction methodology
- Pull-to-refresh → Re-evaluate predictions (limited to once/day)

**AI Transparency**:
- Each prediction shows reasoning: source analysis + trend detection
- "Why this topic?" toggles explanation panel

---

## 17. Sources Page (`/sources`)

**Purpose**: Government source feed for current affairs.

**Layout**:
```
┌──────────────────────────────────────────────────────┐
│  GOVERNMENT SOURCES 📰          [Filter ▼] [Search] │
├──────────────────────────────────────────────────────┤
│  PIB | ARC Reports | Lok Sabha | Economic Survey    │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │  PIB: PM addresses National Panchayati Raj Day│  │
│  │  April 24, 2026  |  Source: pib.gov.in        │  │
│  │  Summary: The Prime Minister highlighted...   │  │
│  │  Key takeaways: 3  |  [Read More →]            │  │
│  │  [Add to Notes]  [Generate Quiz]  [Share]      │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  ARC Report: 2nd ARC — Crisis Management       │  │
│  │  April 22, 2026  |  Source: arc.gov.in        │  │
│  │  Summary: Recommendations on administrative..  │  │
│  │  [Read More →]  [Add to Notes]  [Generate Quiz]│  │
│  └────────────────────────────────────────────────┘  │
│  ──── Load more ────                                  │
└──────────────────────────────────────────────────────┘
```

**Components**:
- Source type tabs
- Feed cards with source icon, date, summary
- Action buttons: Read, Quiz, Notes, Share
- Filter: Date range, source type, relevance

**Interactions**:
- Infinite scroll for feed
- Tap card → Opens source URL in modal (or external)
- "Generate Quiz" → AI generates 5 Qs from this source
- "Add to Notes" → Saves to user's revision list

---

## 18. Pricing Page (`/pricing`)

**Purpose**: Plan comparison and checkout.

**Layout**:
```
┌──────────────────────────────────────────────────────┐
│  CHOOSE YOUR PLAN                                    │
│  Start free. Upgrade as you grow.                   │
├──────────────────────────────────────────────────────┤
│  Toggle: Monthly | Yearly (Save 20%)               │
│                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │    FREE      │  │  LIEUTENANT  │  │   CAPTAIN    │ │
│  │   ₹0/mo      │  │  ₹499/mo     │  │  ₹999/mo     │ │
│  │              │  │  (Popular)    │  │  (Best Value) │ │
│  │  □ AI Coach  │  │  ■ AI Coach  │  │  ■ AI Coach  │ │
│  │  □ Analytics │  │  ■ Analytics │  │  ■ Analytics │ │
│  │  □ Quizzes   │  │  ■ Quizzes   │  │  ■ Quizzes   │ │
│  │  □ Topics    │  │  ■ Topics    │  │  ■ Topics    │ │
│  │  □ Mock Tests│  │  ■ Mock Tests│  │  ■ Mock Tests│ │
│  │  □ Interview │  │  ■ Interview │  │  ■ Interview │ │
│  │  □ Predictions│  │  ■ Predictions│ │  ■ Predictions│ │
│  │  □ Bilingual │  │  ■ Bilingual │  │  ■ Bilingual │ │
│  │              │  │              │  │  ■ Major: Study Squad│
│  │              │  │              │  │  ■ Major: Priority Support│
│  │  [Current]   │  │  [Upgrade →] │  │  [Upgrade →] │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                       │
│  All plans include: SSL, Data privacy, 24/7 uptime    │
│  Payment processed securely via Razorpay              │
└──────────────────────────────────────────────────────┘
```

**Interactions**:
- Toggle monthly/yearly → Price updates with crossfade
- Hover card → Subtle elevation + glow (desktop)
- Tap "Upgrade" → Razorpay checkout modal opens
- Success → Confetti + "Welcome to [Plan]!" toast

**Major Plan Mention**: Show in comparison but grayed out if not selecting; "Major: Full access + Study Squads + Priority Support — coming soon"

---

## 19. Profile & Settings (`/profile`, `/settings`)

**Layout**:
```
┌──────────────────────────────────────────────────────┐
│  PROFILE & SETTINGS                                   │
├──────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────┐  │
│  │  👤 Aarav Kumar                                │  │
│  │  IAS Aspirant | Preparing since Jan 2026       │  │
│  │  Streak: 8 days 🔥  |  Total hours: 142        │  │
│  │  [Edit Profile]                                │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  PERFORMANCE SUMMARY                                  │
│  ┌────────────────────────────────────────────────┐  │
│  │  Total Quizzes: 124                            │  │
│  │  Avg Accuracy: 71%                             │  │
│  │  Top Subject: Polity (89%)                     │  │
│  │  Rank Prediction: AIR 340                      │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  SETTINGS                                             │
│  ┌────────────────────────────────────────────────┐  │
│  │  Language        [EN | HI] toggle               │  │
│  │  Theme           [☀️ Light | 🌙 Dark]           │  │
│  │  Notifications   [On | Off]                     │  │
│  │  Sound Effects   [On | Off]                     │  │
│  │  Data Usage      [Compact | Standard]           │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  SUBSCRIPTION                                         │
│  ┌────────────────────────────────────────────────┐  │
│  │  Current: Lieutenant (Monthly)                  │  │
│  │  Next billing: May 25, 2026                    │  │
│  │  [Manage Subscription]  [Cancel]                │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ACCOUNT                                              │
│  [Change Password]  [Export Data]  [Delete Account]  │
└──────────────────────────────────────────────────────┘
```

**Interactions**:
- Language toggle: Immediate crossfade, persists to localStorage + Supabase
- Theme toggle: Dark/light switch with 300ms transition on all elements
- Streak history: Tap → Modal with calendar heatmap of all streak days
- Export data: Generates JSON, triggers download

---

## 20. Admin Dashboard (`/admin`)

**Purpose**: Operations overview.

**Layout**:
```
┌──────────────────────────────────────────────────────┐
│  PREPX ADMIN         👤 Admin  |  Logout            │
├──────────────────────────────────────────────────────┤
│  Sidebar ──┬── Main Content                        │
│  Dashboard │                                       │
│  Content   │  ┌─────────┐ ┌─────────┐ ┌─────────┐│
│  AI        │  │Total Users│ │Active   │ │Revenue  ││
│  Operations│  │ 12,450   │ │ 1,240   │ │₹4.2L    ││
│  Users     │  └─────────┘ └─────────┘ └─────────┘│
│  Analytics │                                       │
│            │  ┌────────────────────────────────┐ │
│            │  │ User Retention Cohort Chart     │ │
│            │  └────────────────────────────────┘ │
│            │                                       │
│            │  ┌────────────────────────────────┐ │
│            │  │ AI Agent Health                 │ │
│            │  │ Hermes: 🟢  |  Guide 1: 🟢  |   │ │
│            │  │ Provider: Groq (99.2% uptime)   │ │
│            │  └────────────────────────────────┘ │
│            │                                       │
│            │  RECENT ALERTS                        │
│            │  ⚠️ Scraper: PIB failed 2 hours ago  │
│            │  ℹ️ New signup spike: +40% today      │
└──────────────────────────────────────────────────────┘
```

**Components**:
- Sidebar: Collapsible, icon-only on tablet
- KPI cards: Large numbers, sparkline charts
- Retention chart: Cohort grid or line chart
- Agent health: Status dots, uptime %, provider name
- Alerts: Dismissible toast row

**Dark Mode Only**: Admin operates in dark mode (operator comfort, less eye strain).

---

## 21. Admin Scraper Panel (`/admin/scraper`)

**Layout**:
```
┌──────────────────────────────────────────────────────┐
│  CONTENT SCRAPER                                      │
├──────────────────────────────────────────────────────┤
│  SOURCE SELECTION                                     │
│  □ PIB          □ ARC Reports                       │
│  □ Lok Sabha    □ Economic Survey                   │
│  [ Run Scraper Pipeline ]                             │
│                                                       │
│  PROGRESS LOGS                                        │
│  ┌────────────────────────────────────────────────┐  │
│  │  10:24 AM — Pipeline started                   │  │
│  │  10:25 AM — PIB: 12 articles fetched           │  │
│  │  10:26 AM — ARC: Access denied (403)           │  │
│  │  10:27 AM — Lok Sabha: 5 items fetched         │  │
│  │  10:28 AM — AI Processing: 12/17 items...      │  │
│  │  10:30 AM — Pipeline complete. 12 items added. │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  HISTORY                                              │
│  Date | Source | Items | Status                       │
│  Apr 24 | PIB | 15 | ✅ Success                      │
│  Apr 23 | ARC | 0 | ❌ Failed                        │
└──────────────────────────────────────────────────────┘
```

**Interactions**:
- Run scraper → Button spins, logs stream in real-time (SSE or polling)
- Log entry → Auto-scroll to bottom, color-coded (green success, red error, yellow warning)
- History row tap → Expand details (JSON response preview)

---

## 22. Admin Nudges Panel (`/admin/nudges`)

**Layout**:
```
┌──────────────────────────────────────────────────────┐
│  NUDGE MANAGEMENT                                     │
├──────────────────────────────────────────────────────┤
│  [ + Create Nudge ]                                   │
│                                                       │
│  CREATE NUDGE FORM                                    │
│  ┌────────────────────────────────────────────────┐  │
│  │  Title: [________________________]              │  │
│  │  Message: [________________________]              │  │
│  │  Target: [All Users | Segment ▼]                │  │
│  │  Segment: [Weak in Polity | Streak < 3 | ...]   │  │
│  │  Schedule: [Now | Date Picker]                    │  │
│  │  Channel: [Push | In-App | Email]                 │  │
│  │  [Preview]  [Save Draft]  [Send]                  │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ACTIVE NUDGES                                        │
│  ┌────────────────────────────────────────────────┐  │
│  │  "Polity boost" | Active | 1,240 sent | 68% open│  │
│  │  "Streak recovery" | Scheduled | Apr 30         │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

**Interactions**:
- Preview → Modal showing how nudge appears on mobile
- Segment dropdown → Dynamic fields based on selection
- Send → Confirmation dialog, then status updates to "Sending..." → "Sent"

---

## 23. Admin Hermes Panel (`/admin/hermes`)

**Layout**:
```
┌──────────────────────────────────────────────────────┐
│  HERMES AGENT MANAGEMENT                              │
├──────────────────────────────────────────────────────┤
│  AGENT STATUS                                         │
│  ┌────────────────────────────────────────────────┐  │
│  │  Hermes (Orchestrator) — 🟢 Active             │  │
│  │  Provider: Groq | Model: Llama 3  | Temp: 0.7  │  │
│  │  [Restart]  [Logs]  [Config]                    │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  SUBJECT GUIDES                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │  Polity Guide      🟢 Active   [Logs] [Config]   │  │
│  │  History Guide     🟢 Active   [Logs] [Config]   │  │
│  │  Economy Guide     🟡 Degraded [Logs] [Config]  │  │
│  │  Geography Guide   🔴 Offline  [Logs] [Config]   │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  CONVERSATION VIEWER                                  │
│  ┌────────────────────────────────────────────────┐  │
│  │  User: aarav_kumar_2026                         │  │
│  │  ┌──────────────────────────────────────────────┐│  │
│  │  │ Hermes: What topic would you like to focus? ││  │
│  │  │ User: Polity Fundamental Rights             ││  │
│  │  │ Hermes: Great! Here is a quiz on...        ││  │
│  │  └──────────────────────────────────────────────┘│  │
│  │  [Filter by Date] [Export]                      │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

**Interactions**:
- Restart agent → Spinner → Status dot updates
- Conversation viewer: Scrollable chat, filter by user/date
- Export → JSON/CSV of conversation logs

---

## 24. AI Coach Panel (Persistent / Floating)

**Purpose**: Always-available AI mentor.

**Layout (Desktop — Slide-out Sidebar)**:
```
┌─────────────────────────────┬──────────────────────────┐
│                             │ 🤖 PREPX AI COACH        │
│                             ├──────────────────────────┤
│      MAIN CONTENT           │ "What can I help you     │
│      AREA                   │  with today, Aarav?"   │
│                             │                          │
│                             │ ┌─────────────────────┐  │
│                             │ │ Suggestions:        │  │
│                             │ │ • Quiz me on Polity│  │
│                             │ │ • Explain FR      │  │
│                             │ │ • Predictions     │  │
│                             │ └─────────────────────┘  │
│                             │                          │
│                             │ [____________________] │
│                             │ [Send]                  │
└─────────────────────────────┴──────────────────────────┘
```

**Layout (Mobile — Bottom Sheet)**:
```
┌──────────────────────────────────────────────────────┐
│                                                      │
│                 MAIN CONTENT                         │
│                                                      │
├──────────────────────────────────────────────────────┤
│  ▲ AI COACH                                          │
│  "What can I help with?"                            │
│  [____________________]  [Send]                     │
└──────────────────────────────────────────────────────┘
```

**Components**:
- AI avatar: Animated glowing orb (CSS animation)
- Suggestion chips: Tap to auto-send
- Chat bubbles: User = blue glass right, AI = purple glass left
- Typing indicator: Three dots pulsing
- "Why this suggestion?" info tooltip

**Interactions**:
- Floating button (mobile): Bottom-right, pulsing glow, drag to reposition
- Tap button → Bottom sheet slides up (300ms spring)
- Send message → Message slides in, AI responds with typing delay (800ms)
- Long-press message → Copy, Report

**States**:
- Idle: Floating button only
- Active: Sidebar/sheet open
- Thinking: Typing indicator + avatar glow intensifies
- Error: Red border on input, "Hermes is temporarily unavailable. Please retry."

---

*Document: ux-screen-designs.md | Phase: Planning | BMAD Designer: Sally*
